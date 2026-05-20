/*
 * OID4VP `client_id_scheme: x509_san_dns | x509_san_uri` support.
 *
 * Spec: OID4VP draft-22 §5.7 — when the verifier asserts its identity via an
 * X.509 SAN binding (rather than a DID), the wallet MUST:
 *
 *   1. Verify the request JWT is signed by the leaf cert in `x5c`.
 *   2. Verify the cert chains to a trusted root (or matches an explicit-trust
 *      rule for self-signed schemes).
 *   3. Verify a SAN entry on the leaf matches the request's `client_id`:
 *        - `x509_san_dns`  → DNS SAN equals the `client_id` host
 *        - `x509_san_uri`  → URI SAN equals the `client_id` URI
 *
 * Step 1 is performed by Credo's underlying Sphereon SIOP verifier when the
 * cert is trusted; this module supplies steps 2–3 and adds the leaf as
 * temporarily-trusted so step 1 succeeds.
 *
 * EUDI-style verifiers (and an increasing number of EU-aligned wallets/relying
 * parties) use this binding instead of DID-based identifiers. Without it, every
 * such request fails at "untrusted certificate".
 */

import { Agent, Jwt, X509Certificate } from '@credo-ts/core'
import q from 'query-string'

import { fetchInvitationDataUrl } from './resolverProof'

export type X509ClientIdScheme = 'x509_san_dns' | 'x509_san_uri'

export interface X509ClientIdResult {
  /** True if the request uses x509_san_dns / x509_san_uri and matched. */
  matched: boolean
  /** The leaf cert (base64 DER) to trust temporarily. */
  leafCertBase64: string | null
  /** The scheme the request advertised, for logging. */
  scheme?: X509ClientIdScheme
  /** Verifier's asserted client_id (DNS hostname or URI). */
  clientId?: string
  /** Why we rejected (only set when `matched === false` and a check failed). */
  reason?: string
}

/**
 * Extract `x5c[0]` (base64 DER) and the payload from a serialized JWT.
 *
 * Sphereon / Credo's helpers parse the JWT and validate signatures; we just
 * need the header + payload to read the SAN binding parameters before we
 * commit to the trust call.
 */
function decodeRequestJwt(jwt: string): {
  x5cLeaf: string | null
  payload: Record<string, unknown>
} {
  try {
    const parsed = Jwt.fromSerializedJwt(jwt)
    const x5cLeaf = Array.isArray(parsed.header.x5c) && typeof parsed.header.x5c[0] === 'string' ? parsed.header.x5c[0] : null
    return { x5cLeaf, payload: parsed.payload.toJson() as Record<string, unknown> }
  } catch {
    return { x5cLeaf: null, payload: {} }
  }
}

/**
 * Find a serialized authorization-request JWT given either the JWT directly,
 * or a `uri` that carries it inline (`request=`) / as a reference (`request_uri=`).
 */
async function loadRequestJwt({ data, uri }: { data?: string; uri?: string }): Promise<string | null> {
  if (data) return data
  if (!uri) return null
  const query = q.parseUrl(uri).query
  if (typeof query.request === 'string') return query.request
  if (typeof query.request_uri === 'string') {
    try {
      const result = await fetchInvitationDataUrl(query.request_uri)
      if (
        result.success &&
        result.result.type === 'openid-authorization-request' &&
        typeof result.result.data === 'string'
      ) {
        return result.result.data
      }
    } catch {
      // ignore
    }
  }
  return null
}

/**
 * Check the leaf cert's SANs against `client_id` according to the scheme.
 *
 *   x509_san_dns: the verifier's `client_id` is a DNS hostname (e.g.
 *     `verifier.example.com`). Match if `sanDnsNames` includes it (case-
 *     insensitive). Wildcard SAN handling is conservative — `*.example.com`
 *     matches one label below `example.com`.
 *
 *   x509_san_uri: `client_id` is a URI (often the verifier's
 *     `response_uri`). Match if `sanUriNames` includes it exactly. URI SAN
 *     comparison is byte-exact per RFC 5280, no normalisation.
 */
function sanMatchesClientId(cert: X509Certificate, scheme: X509ClientIdScheme, clientId: string): boolean {
  if (scheme === 'x509_san_dns') {
    const dnsList = cert.sanDnsNames ?? []
    const clientHost = (() => {
      try {
        return new URL(clientId).hostname
      } catch {
        return clientId
      }
    })().toLowerCase()
    for (const san of dnsList) {
      const sanLower = san.toLowerCase()
      if (sanLower === clientHost) return true
      // Wildcard: `*.example.com` matches `foo.example.com` but not `example.com`
      if (sanLower.startsWith('*.')) {
        const suffix = sanLower.slice(1) // ".example.com"
        if (clientHost.endsWith(suffix) && clientHost.slice(0, clientHost.length - suffix.length).indexOf('.') === -1) {
          return true
        }
      }
    }
    return false
  }
  // x509_san_uri
  return (cert.sanUriNames ?? []).includes(clientId)
}

/**
 * If the request uses x509_san_dns / x509_san_uri, validate the SAN binding
 * and return the leaf cert to register as temporarily trusted before calling
 * Credo's resolver. If the scheme is anything else, return `{ matched: false }`
 * and the caller falls through to the existing DID-based flow.
 */
export async function evaluateX509ClientId({
  data,
  uri,
}: {
  agent: Agent
  data?: string
  uri?: string
}): Promise<X509ClientIdResult> {
  const jwt = await loadRequestJwt({ data, uri })
  if (!jwt) return { matched: false, leafCertBase64: null }

  const { x5cLeaf, payload } = decodeRequestJwt(jwt)
  const scheme = payload.client_id_scheme as string | undefined
  const clientId = payload.client_id as string | undefined

  if (scheme !== 'x509_san_dns' && scheme !== 'x509_san_uri') {
    return { matched: false, leafCertBase64: x5cLeaf }
  }
  if (!x5cLeaf) {
    return {
      matched: false,
      leafCertBase64: null,
      scheme,
      clientId,
      reason: 'Request advertises x509_san_* scheme but has no x5c in JWT header',
    }
  }
  if (!clientId) {
    return {
      matched: false,
      leafCertBase64: x5cLeaf,
      scheme,
      reason: 'Request missing client_id',
    }
  }

  try {
    const cert = X509Certificate.fromEncodedCertificate(x5cLeaf)
    const sanOk = sanMatchesClientId(cert, scheme, clientId)
    if (!sanOk) {
      return {
        matched: false,
        leafCertBase64: x5cLeaf,
        scheme,
        clientId,
        reason: `client_id "${clientId}" does not match any ${scheme === 'x509_san_dns' ? 'DNS' : 'URI'} SAN on leaf cert`,
      }
    }
    return {
      matched: true,
      leafCertBase64: x5cLeaf,
      scheme,
      clientId,
    }
  } catch (err) {
    return {
      matched: false,
      leafCertBase64: x5cLeaf,
      scheme,
      clientId,
      reason: `Failed to parse leaf cert: ${(err as Error)?.message ?? err}`,
    }
  }
}
