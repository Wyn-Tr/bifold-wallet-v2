import type { BaseLogger } from '@credo-ts/core'

/**
 * One source of X.509 trust anchors for mdoc / X.509-signed credential
 * verification. Either supply a PEM directly, or a URL the wallet will fetch
 * on agent startup.
 *
 * URL formats currently understood:
 *   - 'pem'        : the body is a raw PEM (one or more BEGIN CERTIFICATE
 *                    blocks).
 *   - 'json-pem'   : JSON body with `{ pem: '-----BEGIN CERTIFICATE----- …' }`
 *                    (this is what ESSI's `.well-known/iaca-certificate`
 *                    returns).
 *   - 'json-pems'  : JSON body with `{ certificates: [pem, pem, …] }` — used by
 *                    custom trust-list endpoints that return many IACAs at once.
 *
 * VICAL (ISO 18013-5 Annex B, COSE-signed CBOR) is not yet handled here; a
 * separate VICAL parser would feed its IACAs through the static-PEM path.
 */
export interface TrustedCertificateSource {
  name: string
  pem?: string
  url?: string
  format?: 'pem' | 'json-pem' | 'json-pems'
}

/**
 * Trust sources baked into the core package. Apps can extend this list via
 * `TOKENS.UTIL_X509_TRUSTED_CERTIFICATE_SOURCES`; they don't need to fork
 * core to add a regional VICAL or a new issuer's `.well-known`.
 */
export const DEFAULT_TRUSTED_CERTIFICATE_SOURCES: TrustedCertificateSource[] = [
  {
    name: 'ESSI Studio IACA',
    url: 'https://api.essi.studio/.well-known/iaca-certificate',
    format: 'json-pem',
  },
]

const PEM_BLOCK = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g

const extractPems = (raw: string): string[] => raw.match(PEM_BLOCK) ?? []

// Walk every string value in a parsed JSON tree and pull out PEM blocks.
// Issuer well-knowns often return more than the IACA root — ESSI's endpoint,
// for instance, returns the root in `pem` and the intermediate "issuer cert"
// in `issuerCertificatePem`. Trust both: if the mdoc's x5chain doesn't carry
// the intermediate, the chain walker still needs it locally to bridge from
// the signer up to the trust anchor.
const extractPemsFromJson = (obj: unknown): string[] => {
  const pems: string[] = []
  const visit = (v: unknown) => {
    if (typeof v === 'string') {
      pems.push(...extractPems(v))
    } else if (Array.isArray(v)) {
      v.forEach(visit)
    } else if (v && typeof v === 'object') {
      Object.values(v).forEach(visit)
    }
  }
  visit(obj)
  return pems
}

const fetchWithTimeout = async (url: string, ms: number): Promise<Response> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

const loadSingle = async (source: TrustedCertificateSource, logger?: BaseLogger): Promise<string[]> => {
  if (source.pem) return extractPems(source.pem)
  if (!source.url) return []

  const response = await fetchWithTimeout(source.url, 8000)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const format = source.format ?? 'json-pem'

  if (format === 'pem') {
    return extractPems(await response.text())
  }
  const body = await response.json()
  if (format === 'json-pem' || format === 'json-pems') {
    // Both formats now scan the whole JSON tree for PEM blocks. Trust-list
    // endpoints typically embed certs at the top level under varying keys
    // (`pem`, `certificates[]`, `issuerCertificatePem`); grabbing everything
    // means new endpoints don't need a new format entry to work.
    return extractPemsFromJson(body)
  }
  logger?.warn(`[X509] Unknown trust-source format "${format}" for "${source.name}"`)
  return []
}

/**
 * Load every trust source in parallel, dedupe the resulting PEMs, and return
 * the union. Failures in any one source are logged and skipped so a dead URL
 * doesn't block wallet boot. Returns an empty array when no source yields a
 * cert — callers should pass `undefined` to `X509Module` in that case, since
 * the module's `trustedCertificates` field requires `[string, ...string[]]`.
 */
export const loadTrustedCertificates = async (
  sources: TrustedCertificateSource[],
  logger?: BaseLogger
): Promise<string[]> => {
  const results = await Promise.allSettled(sources.map((s) => loadSingle(s, logger)))
  const pems: string[] = []
  results.forEach((result, idx) => {
    const name = sources[idx]?.name ?? 'unknown'
    if (result.status === 'fulfilled') {
      if (result.value.length === 0) {
        logger?.warn(`[X509] Trust source "${name}" returned no certificates`)
      } else {
        logger?.info(`[X509] Loaded ${result.value.length} cert(s) from "${name}"`)
        pems.push(...result.value)
      }
    } else {
      logger?.warn(`[X509] Trust source "${name}" failed: ${result.reason}`)
    }
  })
  return Array.from(new Set(pems))
}
