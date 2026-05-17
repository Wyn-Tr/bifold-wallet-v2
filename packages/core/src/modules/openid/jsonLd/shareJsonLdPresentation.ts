/*
 * Send a signed JSON-LD Verifiable Presentation back to an OID4VP verifier.
 *
 * Credo 0.5's `acceptSiopAuthorizationRequest` can't build VPs over our
 * JsonLd/OpenBadge raw-JSON records. This module replicates the response
 * flow for those records: build the VP via the openbadges cryptosuite, mint
 * the `presentation_submission` ourselves, then POST to `response_uri` per
 * the OID4VP `direct_post` spec (and `direct_post.jwt` JARM variant when the
 * verifier asks for it).
 */

import { Agent, Buffer, DidKey, JwsService, KeyBackend, KeyType } from '@credo-ts/core'
import { OpenBadgeCredentialRecord } from '@ajna-inc/openbadges'

import { JsonLdCredentialRecord } from './JsonLdCredentialRecord'
import { buildJsonLdPresentation } from './buildJsonLdPresentation'

export type LdpVpCapableRecord = JsonLdCredentialRecord | OpenBadgeCredentialRecord

/** Pull the stored credential JSON off whichever record class we got. */
export function getCredentialJson(record: LdpVpCapableRecord): Record<string, unknown> {
  const c = (record as { credential?: unknown }).credential
  if (!c || typeof c !== 'object') {
    throw new Error('Record has no `credential` payload to present')
  }
  return c as Record<string, unknown>
}

interface ResolvedAuthorizationRequest {
  // Loose typings — Credo's OpenId4VcSiopVerifiedAuthorizationRequest has these
  // under `authorizationRequestPayload`, but the shape we read is consistent.
  payload?: Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authorizationRequestPayload?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jwt?: any
  responseURI?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

/**
 * Pull the fields we need out of Credo's resolved authorization request,
 * looking through the few places they might live.
 */
/**
 * Read each field from the first source that supplies it. The order matters:
 * `payload` (decoded JWT) is most reliable for request_uri / `?request=` flows
 * because the URL params themselves are just `{ request: <jwt> }` and don't
 * carry the actual authorization parameters. `authorizationRequestPayload`
 * holds the URL params and is only useful for flat openid:// URIs that
 * include everything inline. `responseURI` is set by Sphereon when it
 * resolves the URI vs JWT.
 */
/**
 * Schemes that, in OID4VP draft-24+, carry a `<scheme>:` prefix on the
 * `client_id`. Our `normalizeAuthRequest` strips that prefix so Sphereon (a
 * draft-22-era SIOP impl) can parse the request. But the spec-compliant
 * verifier (Veres / DigitalBazaar) expects the proof's `domain` to match the
 * ORIGINAL prefixed `client_id` — that's the audience identifier per OID4VP.
 * We re-attach the prefix here when computing the VP's `domain` field.
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

function extractRequestParams(req: ResolvedAuthorizationRequest): {
  responseUri: string
  clientId: string
  /** OID4VP-spec audience identifier for the VP proof. Equal to the
   *  unsecured request's client_id, INCLUDING any draft-24+ scheme prefix
   *  that our normalisation stripped before handing the request to Sphereon. */
  audClientId: string
  nonce: string
  state?: string
  responseMode: string
  presentationDefinition?: Record<string, unknown>
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jwtPayload = (req.payload ?? {}) as Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const urlPayload = (req.authorizationRequestPayload ?? {}) as Record<string, unknown>
  const pick = <T = string,>(key: string): T | undefined =>
    (jwtPayload[key] as T | undefined) ?? (urlPayload[key] as T | undefined)

  const responseUri =
    pick<string>('response_uri') ?? pick<string>('redirect_uri') ?? req.responseURI ?? ''
  const clientId = pick<string>('client_id') ?? ''
  const nonce = pick<string>('nonce') ?? ''
  const state = pick<string>('state')
  const responseMode = pick<string>('response_mode') ?? 'direct_post'
  const presentationDefinition = pick<Record<string, unknown>>('presentation_definition')
  const clientIdScheme = pick<string>('client_id_scheme')

  if (!responseUri) throw new Error('Authorization request missing response_uri / redirect_uri')
  if (!clientId) throw new Error('Authorization request missing client_id')
  if (!nonce) throw new Error('Authorization request missing nonce')

  // Reattach the scheme prefix to compute the audience the verifier compares
  // against. Only do this when `client_id_scheme` is present AND the client_id
  // doesn't already carry that prefix (so we don't double-prefix when this
  // code runs against draft-22 verifiers that don't strip).
  let audClientId = clientId
  if (
    clientIdScheme &&
    PREFIXABLE_SCHEMES.has(clientIdScheme) &&
    !clientId.startsWith(`${clientIdScheme}:`)
  ) {
    audClientId = `${clientIdScheme}:${clientId}`
  }

  return { responseUri, clientId, audClientId, nonce, state, responseMode, presentationDefinition }
}

/**
 * Build a `presentation_submission` descriptor map for a single-VP response.
 *
 * For multiple credentials in one VP, each input_descriptor maps to
 * `$.verifiableCredential[i]`. With one credential, it's just
 * `$.verifiableCredential` (no index — both shapes are valid in PEX).
 */
function buildPresentationSubmission({
  presentationDefinitionId,
  descriptorIdToCredentialIndex,
}: {
  presentationDefinitionId: string
  descriptorIdToCredentialIndex: Array<{ descriptorId: string; credIndex: number; multiple: boolean }>
}): Record<string, unknown> {
  return {
    id: cryptoRandomId(),
    definition_id: presentationDefinitionId,
    descriptor_map: descriptorIdToCredentialIndex.map(({ descriptorId, credIndex, multiple }) => ({
      id: descriptorId,
      format: 'ldp_vp',
      path: '$',
      path_nested: {
        id: descriptorId,
        format: 'ldp_vc',
        path: multiple ? `$.verifiableCredential[${credIndex}]` : '$.verifiableCredential',
      },
    })),
  }
}

/**
 * Crypto-grade random ID without pulling in node's `crypto.randomUUID`
 * (not present on every RN runtime). Uses Math.random as a fallback only
 * for non-security-critical IDs like presentation_submission.id.
 */
function cryptoRandomId(): string {
  const bytes = new Uint8Array(16)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any
  if (g.crypto?.getRandomValues) {
    g.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

interface ShareOptions {
  agent: Agent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authorizationRequest: any
  /** Input-descriptor-id → record(s) being presented for that descriptor. */
  selectedByDescriptor: Record<string, LdpVpCapableRecord[]>
}

export interface ShareJsonLdPresentationResult {
  status: number
  body: unknown
  redirectUri?: string
}

/**
 * Build, sign, and POST a JSON-LD VP to the verifier's `response_uri`.
 *
 * Single-VP mode: all selected credentials are bundled into one
 * VerifiablePresentation. The PEX 2.x spec allows multiple `descriptor_map`
 * entries pointing into the same VP via `path_nested`.
 */
export async function shareJsonLdPresentation({
  agent,
  authorizationRequest,
  selectedByDescriptor,
}: ShareOptions): Promise<ShareJsonLdPresentationResult> {
  const { responseUri, audClientId, nonce, state, responseMode, presentationDefinition } =
    extractRequestParams(authorizationRequest as ResolvedAuthorizationRequest)

  const presentationDefinitionId =
    (presentationDefinition?.id as string | undefined) ?? 'unknown-pd'

  const allCreds: Record<string, unknown>[] = []
  const descriptorIdToCredentialIndex: Array<{ descriptorId: string; credIndex: number; multiple: boolean }> = []

  for (const [descriptorId, records] of Object.entries(selectedByDescriptor)) {
    for (const record of records) {
      const cred = getCredentialJson(record)
      const idx = allCreds.length
      allCreds.push(cred)
      descriptorIdToCredentialIndex.push({ descriptorId, credIndex: idx, multiple: true })
    }
  }
  // If only one credential, drop the array index in descriptor_map.path_nested
  if (allCreds.length === 1) {
    for (const entry of descriptorIdToCredentialIndex) entry.multiple = false
  }

  const { presentation, holderDidUrl } = await buildJsonLdPresentation({
    agent,
    credentials: allCreds,
    challenge: nonce,
    // Use the prefixed client_id (e.g. `redirect_uri:https://...`) as the
    // proof's audience identifier per OID4VP draft-24+. Veres / DigitalBazaar
    // verifiers compare the proof's `domain` to the unsecured request's
    // client_id BYTE-EXACTLY — including the scheme prefix.
    domain: audClientId,
  })

  const presentationSubmission = buildPresentationSubmission({
    presentationDefinitionId,
    descriptorIdToCredentialIndex,
  })

  const responseBody: Record<string, unknown> = {
    vp_token: presentation,
    presentation_submission: presentationSubmission,
  }
  if (state) responseBody.state = state

  agent.config.logger.info(
    `[OID4VP-LDP] POST → ${responseUri} (holder=${holderDidUrl}, response_mode=${responseMode})`
  )

  let response: Response
  if (responseMode === 'direct_post.jwt') {
    // JARM: wrap the response object as a signed JWT with the holder key.
    // Credo's `JwsService.createJwsCompact` mirrors the flow used for OID4VCI
    // PoP JWTs in receiveJsonLdCredential.
    const compactJwt = await signResponseJwt(agent, responseBody)
    response = await fetch(responseUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ response: compactJwt }).toString(),
    })
  } else {
    response = await fetch(responseUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        vp_token: typeof responseBody.vp_token === 'string' ? responseBody.vp_token : JSON.stringify(responseBody.vp_token),
        presentation_submission: JSON.stringify(responseBody.presentation_submission),
        ...(state ? { state } : {}),
      }).toString(),
    })
  }

  const bodyText = await response.text().catch(() => '')
  let parsed: unknown = bodyText
  try {
    parsed = JSON.parse(bodyText)
  } catch {
    // not JSON; keep as text
  }

  const redirectUri =
    parsed && typeof parsed === 'object' && typeof (parsed as Record<string, unknown>).redirect_uri === 'string'
      ? ((parsed as Record<string, unknown>).redirect_uri as string)
      : undefined

  // Strip embedded base64 data URLs before logging — credentials often carry
  // a multi-KB image which truncates the actually-useful `presentationResult`
  // error past the slice cap. Compactness, not security.
  const sanitisedBody = bodyText.replace(/"data:image\/[^"]+"/g, '"data:image/...stripped..."')
  const sanitisedVp = JSON.stringify(presentation).replace(/"data:image\/[^"]+"/g, '"data:image/...stripped..."')
  agent.config.logger.info(
    `[OID4VP-LDP] ← ${response.status} ${response.statusText} (body=${sanitisedBody.slice(0, 8000)})`
  )
  agent.config.logger.info(`[OID4VP-LDP] sent VP: ${sanitisedVp.slice(0, 8000)}`)

  return {
    status: response.status,
    body: parsed,
    redirectUri,
  }
}

/**
 * Sign the response object as a JWT for `direct_post.jwt` (JARM). Uses a
 * fresh Ed25519 key to keep the JARM key independent of the VP holder key
 * (one is "I'm authenticating this presentation"; the other is "I'm wrapping
 * the response per JARM"). Both are minted from the same wallet so the
 * verifier doesn't need extra trust setup.
 */
async function signResponseJwt(agent: Agent, body: Record<string, unknown>): Promise<string> {
  const key = await agent.wallet.createKey({
    keyType: KeyType.Ed25519,
    keyBackend: KeyBackend.Software,
  })
  const didCreateResult = await agent.dids.create({
    method: 'key',
    options: { key },
  })
  if (didCreateResult.didState.state !== 'finished' || !didCreateResult.didState.did) {
    throw new Error('Holder did:key creation failed for JARM response signing')
  }
  const didKey = DidKey.fromDid(didCreateResult.didState.did)
  const kid = `${didKey.did}#${didKey.key.fingerprint}`

  const jwsService = agent.dependencyManager.resolve(JwsService)
  const payloadBuffer = Buffer.from(JSON.stringify(body), 'utf-8')
  return jwsService.createJwsCompact(agent.context, {
    key,
    payload: payloadBuffer,
    protectedHeaderOptions: {
      alg: 'EdDSA',
      kid,
      typ: 'JWT',
    } as never,
  })
}
