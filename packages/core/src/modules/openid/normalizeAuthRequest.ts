/*
 * Bridge OID4VP draft-24+ authorization requests into a shape Credo 0.5's
 * Sphereon SIOP can validate.
 *
 * Draft 24 dropped the separate `client_id_scheme` parameter and folded the
 * scheme into a colon-prefixed `client_id`:
 *
 *   client_id = "redirect_uri:https://verifier.example/response"
 *   client_id = "x509_san_dns:verifier.example.com"
 *   client_id = "entity_id:https://verifier.example"
 *
 * Modern verifiers (VC Playground / Veres Sandbox) emit prefixed client_ids
 * while *also* setting the legacy `client_id_scheme` field for back-compat.
 * Sphereon-in-Credo-0.5 takes the prefix literally — it then sees
 * `client_id (with prefix) != response_uri (without prefix)` and rejects
 * the request as "response_uri does not match the client_id".
 *
 * This module makes the wallet draft-24-aware for parsing: it locates the
 * request JWT, strips the prefix, and re-encodes the payload so Sphereon's
 * draft-22 comparator passes.
 *
 * ─── Safety rail ────────────────────────────────────────────────────────
 * We only rewrite JWTs whose header says `alg: none`. For `redirect_uri`
 * scheme the spec doesn't require a signature (the URL itself is the trust
 * anchor), so VC Playground emits `alg: none` here.
 *
 * For signed requests (x509_san_*, verifier_attestation, etc.) we leave the
 * JWT untouched. Re-encoding would silently discard a signature that's the
 * verifier's only proof of identity. Those cases need cert-chain validation
 * done by us before any rewrite — that's a Layer-2 task we'll tackle when a
 * real verifier hits us with it. For now the wallet will surface the same
 * Sphereon error so we know to look.
 */

import { Buffer, Jwt } from '@credo-ts/core'
import type { Logger } from '@credo-ts/core'
import q from 'query-string'

/**
 * Scheme tokens we recognise as a draft-24+ prefix. `did` is intentionally
 * absent — a `did:` client_id is a full DID, not a prefix. `https` is absent
 * too — URLs of the form `https://...` are the unprefixed shape under the
 * draft-24 `https` scheme.
 */
const PREFIXABLE_SCHEMES = new Set([
  'redirect_uri',
  'x509_san_dns',
  'x509_san_uri',
  'entity_id',
  'pre-registered',
  'verifier_attestation',
  'web-origin',
])

interface DetectedPrefix {
  scheme: string
  bare: string
}

/**
 * If `clientId` starts with `<known-scheme>:`, split it. Structural check
 * only — we don't validate the URL after the prefix; Sphereon does that
 * once it sees the rewritten payload.
 */
function detectSchemePrefix(clientId: string): DetectedPrefix | null {
  const idx = clientId.indexOf(':')
  if (idx <= 0) return null
  const head = clientId.slice(0, idx)
  if (!PREFIXABLE_SCHEMES.has(head)) return null
  return { scheme: head, bare: clientId.slice(idx + 1) }
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf-8')
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function reencodeUnsignedJwt(payload: Record<string, unknown>): string {
  const header = { alg: 'none', typ: 'oauth-authz-req+jwt' }
  return `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}.`
}

export interface NormalizeJwtResult {
  normalized: string
  wasModified: boolean
  /** True if we DETECTED a prefix but couldn't safely rewrite (signed JWT).
   * Surfaces the case to the caller so it can log/diagnose. */
  unsupportedSignedPrefix?: boolean
  scheme?: string
}

/**
 * Strip the scheme prefix from a JWT's `client_id` and re-encode unsigned.
 *
 * Also fixes the `presentation_definition` so Sphereon-in-Credo-0.5's strict
 * PEX-V2 schema accepts it (see `flattenPexFilters` below for the why).
 *
 * Returns `{ normalized, wasModified }`. Unsigned JWTs with a recognised
 * prefix are rewritten; everything else is passed through. When we detect a
 * prefix on a SIGNED JWT we flag `unsupportedSignedPrefix` so the caller can
 * log it — but we still return the original JWT unchanged.
 */
export function normalizeRequestJwt(jwt: string): NormalizeJwtResult {
  let parsed
  try {
    parsed = Jwt.fromSerializedJwt(jwt)
  } catch {
    return { normalized: jwt, wasModified: false }
  }

  const payload = parsed.payload.toJson() as Record<string, unknown>
  const clientId = payload.client_id
  if (typeof clientId !== 'string') return { normalized: jwt, wasModified: false }

  const detected = detectSchemePrefix(clientId)
  if (!detected) return { normalized: jwt, wasModified: false }

  // Signed JWT carrying a prefixed client_id — Layer-2 territory. The
  // signature IS the trust anchor; we can't rewrite without invalidating it,
  // and we haven't validated the cert chain ourselves yet, so we punt.
  if (parsed.header.alg !== 'none') {
    return {
      normalized: jwt,
      wasModified: false,
      unsupportedSignedPrefix: true,
      scheme: detected.scheme,
    }
  }

  payload.client_id = detected.bare
  if (!payload.client_id_scheme || typeof payload.client_id_scheme !== 'string') {
    payload.client_id_scheme = detected.scheme
  }

  // Make the presentation_definition shape Sphereon-friendly.
  flattenPexFilters(payload.presentation_definition)
  sanitizeFormatProofTypes(payload.presentation_definition)

  return {
    normalized: reencodeUnsignedJwt(payload),
    wasModified: true,
    scheme: detected.scheme,
  }
}

/**
 * Sphereon (pinned in Credo 0.5) validates `presentation_definition` against
 * a PEX V2 schema whose `FilterV2` declares `additionalProperties: false` and
 * doesn't know about JSON Schema combinators like `allOf`, `anyOf`, `oneOf`.
 *
 * Modern verifiers (VC Playground / Veres) wrap their filters in `allOf`:
 *
 *   "filter": {
 *     "type": "array",
 *     "allOf": [
 *       { "contains": { "type": "string", "const": "VerifiableCredential" } }
 *     ]
 *   }
 *
 * If Sphereon sees that, the schema fails outright and version detection
 * throws "SIOP spec version could not inferred from the authentication
 * request payload" — because the same schema is what `authorizationRequestVersionDiscovery`
 * uses to fingerprint the request.
 *
 * We flatten the trivial single-element `allOf` / `anyOf` / `oneOf` cases
 * (which is what verifiers actually emit) by hoisting the inner properties
 * into the parent filter. This is structurally equivalent for a single
 * element. For multi-element combinators we strip the combinator — the
 * filter becomes weaker, but Sphereon's strict-schema gate opens, and our
 * own matcher (`matchInputDescriptor.ts`) walks the same PD JSON anyway, so
 * candidate selection is unaffected.
 */
/**
 * Sphereon's PEX validator (`PEX.validateDefinition`) maintains a hardcoded
 * whitelist of "known LDP proof types" — `Ed25519Signature2020`,
 * `BbsBlsSignature2020`, `DataIntegrityProof`, etc. If any value in
 * `format.ldp_*.proof_type` isn't on the list, the whole PD is rejected as
 * "formats should only have known identifiers for alg or proof_type".
 *
 * Modern verifiers (VC Playground / Veres) list **cryptosuite names**
 * (`eddsa-rdfc-2022`, `ecdsa-rdfc-2019`, `bbs-2023`, `ecdsa-sd-2023`) in
 * `proof_type`. Under VC-DI those aren't proof types — they're cryptosuites,
 * which are sub-variants of the single `DataIntegrityProof` proof type. The
 * spec's clarification on this lagged behind the verifiers; older PEX
 * implementations didn't catch up.
 *
 * We rewrite `proof_type` to:
 *   - drop unrecognised cryptosuite-style entries
 *   - add `DataIntegrityProof` if any cryptosuite-style entry was present
 *     (covers eddsa-rdfc-2022 + ecdsa-rdfc-2019 etc. — the verifier wanted
 *     "any DI cryptosuite", and that's exactly what `DataIntegrityProof`
 *     signals)
 *   - if nothing remains, leave the array with `DataIntegrityProof` so the
 *     filter isn't empty (PEX rejects empty `proof_type` too).
 *
 * The verifier's actual matching at presentation time is unaffected — it
 * matches on the credential's `proof.cryptosuite` value separately, and the
 * VP we sign uses the cryptosuite the credential actually has.
 */
const KNOWN_LDP_PROOF_TYPES = new Set([
  'Ed25519VerificationKey2018',
  'Ed25519Signature2018',
  'Ed25519Signature2020',
  'RsaSignature2018',
  'EcdsaSecp256k1Signature2019',
  'EcdsaSecp256k1RecoverySignature2020',
  'JsonWebSignature2020',
  'GpgSignature2020',
  'JcsEd25519Signature2020',
  'BbsBlsSignature2020',
  'Bls12381G2Key2020',
  'DataIntegrityProof',
])

function sanitizeProofTypeList(list: unknown): string[] | undefined {
  if (!Array.isArray(list)) return undefined
  const kept: string[] = []
  let sawUnknown = false
  for (const v of list) {
    if (typeof v !== 'string') continue
    if (KNOWN_LDP_PROOF_TYPES.has(v)) {
      kept.push(v)
    } else {
      sawUnknown = true
    }
  }
  if (sawUnknown && !kept.includes('DataIntegrityProof')) {
    kept.push('DataIntegrityProof')
  }
  if (kept.length === 0) kept.push('DataIntegrityProof')
  return kept
}

function sanitizeFormatBlock(format: unknown): void {
  if (!format || typeof format !== 'object') return
  for (const [key, value] of Object.entries(format as Record<string, unknown>)) {
    // Only LDP-style format keys carry proof_type. JWT-style keys carry
    // `alg` and have a different whitelist that we don't currently touch.
    if (key.startsWith('jwt') || key.startsWith('vc+') || key === 'mso_mdoc') continue
    if (!value || typeof value !== 'object') continue
    const proofType = (value as Record<string, unknown>).proof_type
    const sanitized = sanitizeProofTypeList(proofType)
    if (sanitized) {
      (value as Record<string, unknown>).proof_type = sanitized
    }
  }
}

function sanitizeFormatProofTypes(pd: unknown): void {
  if (!pd || typeof pd !== 'object') return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sanitizeFormatBlock((pd as any).format)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const descriptors = (pd as any).input_descriptors
  if (!Array.isArray(descriptors)) return
  for (const descriptor of descriptors) {
    sanitizeFormatBlock(descriptor?.format)
  }
}

function flattenPexFilters(pd: unknown): void {
  if (!pd || typeof pd !== 'object') return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const descriptors = (pd as any).input_descriptors
  if (!Array.isArray(descriptors)) return
  for (const descriptor of descriptors) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fields = descriptor?.constraints?.fields
    if (!Array.isArray(fields)) continue
    for (const field of fields) {
      const filter = field?.filter
      if (!filter || typeof filter !== 'object') continue
      for (const combinator of ['allOf', 'anyOf', 'oneOf'] as const) {
        const list = filter[combinator]
        if (!Array.isArray(list) || list.length === 0) continue
        if (list.length === 1 && list[0] && typeof list[0] === 'object') {
          // Hoist single-element combinator into the parent filter.
          for (const [key, value] of Object.entries(list[0] as Record<string, unknown>)) {
            if (filter[key] === undefined) filter[key] = value
          }
        }
        // Drop the combinator either way — Sphereon's FilterV2 forbids it.
        delete filter[combinator]
      }
    }
  }
}

/**
 * 10s timeout matches the existing pattern elsewhere in this module —
 * verifier endpoints should be fast or fail fast.
 */
async function fetchRequestJwt(requestUri: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch(requestUri, {
      headers: {
        Accept: 'application/oauth-authz-req+jwt, application/jwt, text/plain, */*',
      },
      signal: controller.signal,
    })
    if (!response.ok) return null
    const text = (await response.text()).trim()
    return text.startsWith('ey') ? text : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Look at the inbound OID4VP request, normalise its draft-24 `client_id`
 * prefix if any, and return an inline JWT to substitute in.
 *
 * Returns `{ inlineRequest: null }` when no normalisation was needed — the
 * caller should fall through to its existing flow.
 */
export async function normalizeAuthorizationRequest({
  data,
  uri,
  logger,
}: {
  data?: string
  uri?: string
  logger?: Logger
}): Promise<{ inlineRequest: string | null }> {
  let jwt: string | null = null
  let source = 'none'

  if (data && data.startsWith('ey')) {
    jwt = data
    source = 'data'
  } else if (uri) {
    const query = q.parseUrl(uri).query
    if (typeof query.request === 'string' && query.request.startsWith('ey')) {
      jwt = query.request
      source = 'uri.request'
    } else if (typeof query.request_uri === 'string') {
      logger?.info(`[OID4VP-norm] fetching request_uri=${query.request_uri}`)
      jwt = await fetchRequestJwt(query.request_uri)
      source = jwt ? 'uri.request_uri.fetched' : 'uri.request_uri.fetch-failed'
    }
  }

  if (!jwt) {
    logger?.info(`[OID4VP-norm] no JWT found (source=${source}); falling through unchanged`)
    return { inlineRequest: null }
  }

  // Decode JWT preview for logs.
  let clientIdPreview = '?'
  let algPreview = '?'
  try {
    const parsed = Jwt.fromSerializedJwt(jwt)
    algPreview = String(parsed.header.alg)
    const cid = (parsed.payload.toJson() as Record<string, unknown>).client_id
    clientIdPreview = typeof cid === 'string' ? cid.slice(0, 80) : '<not a string>'
  } catch (e) {
    logger?.warn(`[OID4VP-norm] JWT parse threw: ${(e as Error)?.message ?? e}`)
  }
  logger?.info(`[OID4VP-norm] source=${source} alg=${algPreview} client_id="${clientIdPreview}"`)

  const result = normalizeRequestJwt(jwt)

  if (result.unsupportedSignedPrefix) {
    logger?.warn(
      `[OID4VP-norm] Signed prefixed client_id (scheme="${result.scheme}") — NOT rewriting. Sphereon will likely reject.`
    )
  } else if (result.wasModified) {
    logger?.info(
      `[OID4VP-norm] Normalised prefix (scheme="${result.scheme}"). New JWT length=${result.normalized.length}`
    )
  } else {
    logger?.info(`[OID4VP-norm] no prefix detected, leaving JWT alone`)
  }

  return { inlineRequest: result.wasModified ? result.normalized : null }
}
