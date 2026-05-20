/*
 * OID4VCI JSON-LD bridge for Credo 0.5.17.
 *
 * Credo 0.5's OpenId4VciHolderService.handleCredentialResponse parses LdpVc
 * responses through W3cJsonLdVerifiableCredential.fromJson and verifies via
 * SignatureSuiteRegistry. Both fail for VC v2 (context/issuanceDate
 * validators) and for DataIntegrityProof (no suite registered).
 *
 * This module replicates Credo's request flow up to the credential response,
 * then takes over: it verifies the raw JSON via @ajna-inc/openbadges'
 * EddsaRdfc2022Cryptosuite and persists the credential as either:
 *
 *   - `OpenBadgeCredentialRecord` — when the credential is genuinely OBv3
 *     (`type` includes `OpenBadgeCredential` or `AchievementCredential`).
 *
 *   - `JsonLdCredentialRecord`     — for every other JSON-LD W3C VC. This is
 *     our own validator-free record class; it's the proper home for the
 *     credentials Credo would have rejected.
 */

import {
  Agent,
  DidsApi,
  JsonEncoder,
  JwsService,
  getJwkFromJson,
  getKeyFromVerificationMethod,
  parseDid,
} from '@credo-ts/core'
import {
  OpenId4VcCredentialHolderBinding,
  OpenId4VciCredentialFormatProfile,
  OpenId4VciCredentialSupportedWithId,
  OpenId4VciRequestTokenResponse,
  OpenId4VciResolvedCredentialOffer,
} from '@credo-ts/openid4vc'
import { CredentialRequestClientBuilder, ProofOfPossessionBuilder } from '@sphereon/oid4vci-client'
import {
  EddsaRdfc2022Cryptosuite,
  OpenBadgeCredentialRecord,
  OpenBadgeCredentialRepository,
} from '@ajna-inc/openbadges'

import { extractOpenId4VcCredentialMetadata, setOpenId4VcCredentialMetadata } from '../metadata'
import { EcdsaRdfc2019Cryptosuite } from './ecdsaRdfc2019'
import { installJsonLdRnLoader } from './jsonldRnPolyfill'
import { JsonLdCredentialJson, JsonLdCredentialRecord } from './JsonLdCredentialRecord'
import { JsonLdCredentialRepository } from './JsonLdCredentialRepository'

const OBV3_TYPES = new Set(['OpenBadgeCredential', 'AchievementCredential'])

/**
 * Decide which storage class a freshly-issued JSON-LD credential belongs in.
 * OBv3 credentials carry their own dedicated semantics in the openbadges
 * package (achievement, criteria, etc.); generic W3C VCs go to the plain
 * JsonLdCredentialRecord we own.
 */
function isOpenBadgeV3(credentialJson: Record<string, unknown>): boolean {
  const types = (credentialJson as { type?: unknown }).type
  if (!Array.isArray(types)) return false
  for (const t of types) {
    if (typeof t === 'string' && OBV3_TYPES.has(t)) return true
  }
  return false
}

/**
 * Build a sphereon `signCallback` that signs the proof-of-possession JWT using
 * Credo's wallet (mirrors OpenId4VciHolderService#proofOfPossessionSignCallback).
 */
function buildSignCallback(agent: Agent) {
  const jwsService = agent.dependencyManager.resolve(JwsService)
  const didsApi = agent.dependencyManager.resolve(DidsApi)

  return async (
    jwt: { header: Record<string, unknown>; payload: Record<string, unknown> },
    kid?: string
  ) => {
    if (!jwt.header) throw new Error('No header present on JWT')
    if (!jwt.payload) throw new Error('No payload present on JWT')
    if (kid && jwt.header.jwk) {
      throw new Error('Both KID and JWK are present; only one is allowed')
    }

    let key
    if (kid) {
      if (!kid.startsWith('did:')) {
        throw new Error(`kid '${kid}' is not a DID. Only DID-based kids are supported.`)
      }
      if (!kid.includes('#')) {
        throw new Error(`kid '${kid}' must include a fragment pointing to a verification method.`)
      }
      const didDocument = await didsApi.resolveDidDocument(parseDid(kid).did)
      const verificationMethod = didDocument.dereferenceKey(kid, ['authentication'])
      key = getKeyFromVerificationMethod(verificationMethod)
    } else if (jwt.header.jwk) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      key = getJwkFromJson(jwt.header.jwk as any).key
    } else {
      throw new Error('Neither kid nor jwk supplied to signCallback')
    }

    // Strip x5c — we don't support cert chain headers here.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { x5c: _x5c, ...protectedHeaderOptions } = jwt.header as Record<string, unknown> & {
      x5c?: unknown
    }

    return jwsService.createJwsCompact(agent.context, {
      key,
      payload: JsonEncoder.toBuffer(jwt.payload),
      protectedHeaderOptions: {
        ...protectedHeaderOptions,
        // jwk is only forwarded when the offer asked for jwk-bound keys.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jwk: jwt.header.jwk ? (key as any).jwk : undefined,
      } as never,
    })
  }
}

/**
 * Pull credential type strings from an offered LdpVc / JwtVcJsonLd configuration.
 * Mirrors @credo-ts/openid4vc's getTypesFromCredentialSupported for the formats
 * we care about.
 */
function getTypesFromOfferedCredential(offered: OpenId4VciCredentialSupportedWithId): string[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = offered as any
  if (o?.credential_definition?.types && Array.isArray(o.credential_definition.types)) {
    return o.credential_definition.types
  }
  if (o?.credential_definition?.type && Array.isArray(o.credential_definition.type)) {
    return o.credential_definition.type
  }
  if (Array.isArray(o?.types)) {
    return o.types
  }
  return []
}

interface ReceiveJsonLdOptions {
  agent: Agent
  resolvedCredentialOffer: OpenId4VciResolvedCredentialOffer
  tokenResponse: OpenId4VciRequestTokenResponse
  offeredCredential: OpenId4VciCredentialSupportedWithId
  binding: OpenId4VcCredentialHolderBinding
  signatureAlgorithm: string
  clientId?: string
}

export async function receiveJsonLdCredentialFromOpenId4VciOffer({
  agent,
  resolvedCredentialOffer,
  tokenResponse,
  offeredCredential,
  binding,
  signatureAlgorithm,
  clientId,
}: ReceiveJsonLdOptions): Promise<OpenBadgeCredentialRecord | JsonLdCredentialRecord> {
  const { metadata, version } = resolvedCredentialOffer

  const normalizedTokenResponse = {
    access_token: tokenResponse.accessToken,
    c_nonce: tokenResponse.cNonce,
  }

  const popBuilder = ProofOfPossessionBuilder.fromAccessTokenResponse({
    accessTokenResponse: normalizedTokenResponse as never,
    callbacks: { signCallback: buildSignCallback(agent) as never },
    version,
  })
    .withEndpointMetadata(metadata as never)
    .withAlg(signatureAlgorithm as never)

  if (binding.method === 'did') {
    popBuilder.withClientId(parseDid(binding.didUrl).did).withKid(binding.didUrl)
  } else if (binding.method === 'jwk') {
    popBuilder.withJWK(binding.jwk.toJson() as never)
  }
  if (clientId) popBuilder.withClientId(clientId)

  const proofOfPossession = await popBuilder.build()

  const requestClient = CredentialRequestClientBuilder.fromCredentialOffer({
    credentialOffer: resolvedCredentialOffer.credentialOfferRequestWithBaseUrl as never,
    metadata: resolvedCredentialOffer.metadata as never,
  })
    .withVersion(version)
    .withCredentialEndpoint(metadata.credential_endpoint)
    .withToken(tokenResponse.accessToken)
    .build()

  const isJsonLd =
    offeredCredential.format === OpenId4VciCredentialFormatProfile.LdpVc ||
    offeredCredential.format === OpenId4VciCredentialFormatProfile.JwtVcJsonLd
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const off = offeredCredential as any
  // Try several locations the issuer might use to advertise the credential's
  // @context. Some issuers (Veres playground) only put it on the top-level
  // config, others nest it under credential_definition or `vc`.
  let context: string[] | Array<string | object> | undefined =
    off.credential_definition?.['@context'] ?? off['@context'] ?? off.vc?.['@context']

  if (isJsonLd && (!Array.isArray(context) || context.length === 0)) {
    // Fall back to the W3C VC v1 base contexts. Issuers that need custom
    // contexts should advertise them in their credential_configurations_supported;
    // this default just unblocks the request when they don't. (Sphereon's
    // CredentialRequestClient throws "No @context value present, but it is
    // required" for ldp_vc/jwt_vc_json-ld when this is missing.)
    context = ['https://www.w3.org/2018/credentials/v1', 'https://www.w3.org/2018/credentials/examples/v1']
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestSummary: Record<string, any> = {
    endpoint: metadata.credential_endpoint,
    format: offeredCredential.format,
    types: getTypesFromOfferedCredential(offeredCredential),
    contextResolved: context,
    contextSource: off.credential_definition?.['@context']
      ? 'credential_definition.@context'
      : off['@context']
        ? 'offered.@context'
        : off.vc?.['@context']
          ? 'offered.vc.@context'
          : 'fallback-default-w3c-v1',
  }
  // eslint-disable-next-line no-console
  console.log('[JSON-LD bridge] credential request →', JSON.stringify(requestSummary))

  // Wrap fetch so we can see the exact request body / response on the
  // credential endpoint. Sphereon imports `cross-fetch`, whose RN entry
  // captures `global.fetch` at module-load time — so wrapping `globalThis.fetch`
  // doesn't intercept its calls. We also patch the cross-fetch module's
  // `fetch` export directly, which is the reference Sphereon actually uses.
  const credentialEndpoint = metadata.credential_endpoint
  const originalGlobalFetch = globalThis.fetch
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const crossFetchModule: any = (() => {
    try {
      return require('cross-fetch')
    } catch {
      return undefined
    }
  })()
  const originalCrossFetch: typeof fetch | undefined = crossFetchModule?.fetch
  const wrappedFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input && typeof (input as { url?: unknown }).url === 'string'
          ? ((input as { url: string }).url)
          : (input as URL)?.toString?.() ?? String(input)
    const isCredentialEndpoint = typeof url === 'string' && url.startsWith(credentialEndpoint)
    if (isCredentialEndpoint) {
      // eslint-disable-next-line no-console
      console.log(
        '[JSON-LD bridge] HTTP →',
        JSON.stringify({
          url,
          method: init?.method,
          body: typeof init?.body === 'string' ? init.body : '[non-string body]',
        })
      )
    }
    const response = await originalGlobalFetch(input as never, init)
    if (isCredentialEndpoint) {
      const cloned = response.clone()
      const text = await cloned.text().catch(() => '')
      // eslint-disable-next-line no-console
      console.log(
        '[JSON-LD bridge] HTTP ←',
        JSON.stringify({
          url,
          status: response.status,
          statusText: response.statusText,
          body: text.slice(0, 2000),
        })
      )
    }
    return response
  }) as typeof fetch
  globalThis.fetch = wrappedFetch
  if (crossFetchModule) {
    crossFetchModule.fetch = wrappedFetch
    crossFetchModule.default = wrappedFetch
  }

  let credentialResponse: Awaited<ReturnType<typeof requestClient.acquireCredentialsUsingProof>>
  try {
    credentialResponse = await requestClient.acquireCredentialsUsingProof({
      proofInput: proofOfPossession,
      credentialTypes: getTypesFromOfferedCredential(offeredCredential),
      format: offeredCredential.format as never,
      context: context as string[] | undefined,
    })
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any
    // eslint-disable-next-line no-console
    console.log(
      '[JSON-LD bridge] credential request THREW →',
      JSON.stringify({
        message: e?.message,
        name: e?.name,
        status: e?.response?.status,
        statusText: e?.response?.statusText,
        responseBody: e?.response?.data ?? e?.response?.body,
        request: requestSummary,
      })
    )
    throw err
  } finally {
    globalThis.fetch = originalGlobalFetch
    if (crossFetchModule && originalCrossFetch) {
      crossFetchModule.fetch = originalCrossFetch
      crossFetchModule.default = originalCrossFetch
    }
  }

  if (!credentialResponse.successBody?.credential) {
    // eslint-disable-next-line no-console
    console.log(
      '[JSON-LD bridge] credential request FAILED →',
      JSON.stringify({
        errorBody: credentialResponse.errorBody,
        successBody: credentialResponse.successBody,
        request: requestSummary,
      })
    )
    // Surface the issuer's `error_description` to the user when present
    // (Veres returns `Invalid credential.`). Falls back to the `error` code
    // (sometimes a non-standard value like `h_t_t_p_error`).
    const description = credentialResponse.errorBody?.error_description
    const code = credentialResponse.errorBody?.error
    const detail = description ?? code ?? 'unknown'
    throw new Error(`Issuer rejected credential request: ${detail}`)
  }

  const credentialJson = credentialResponse.successBody.credential as Record<string, unknown>
  if (typeof credentialJson === 'string') {
    // eslint-disable-next-line no-console
    console.log(
      '[JSON-LD bridge] format mismatch →',
      JSON.stringify({
        receivedType: typeof credentialJson,
        receivedSnippet: String(credentialJson).slice(0, 200),
        successBodyKeys: Object.keys(credentialResponse.successBody ?? {}),
        request: requestSummary,
      })
    )
    throw new Error(
      `Expected JSON-LD credential body, but received a string. Format mismatch from issuer.`
    )
  }

  // eslint-disable-next-line no-console
  console.log(
    '[JSON-LD bridge] credential received →',
    JSON.stringify({
      types: (credentialJson as { type?: unknown }).type,
      issuer: (credentialJson as { issuer?: unknown }).issuer,
      hasProof: !!(credentialJson as { proof?: unknown }).proof,
      proofType: ((credentialJson as { proof?: { type?: string } }).proof as { type?: string } | undefined)
        ?.type,
      cryptosuite: ((credentialJson as { proof?: { cryptosuite?: string } }).proof as
        | { cryptosuite?: string }
        | undefined)?.cryptosuite,
    })
  )

  // Verify directly via the openbadges cryptosuite. We bypass
  // OpenBadgesApi.verify (which routes through DataIntegrityService) because
  // that path hardcodes `useNetworkContexts: false` — its document loader
  // only knows 4 cached contexts, so any external context (like
  // https://www.w3.org/2018/credentials/v1) returns an empty stub and jsonld
  // canonicalization fails with "No @context value present, but it is
  // required". `useNetworkContexts: true` uses the preprocessing loader that
  // fetches contexts from the network with @protected stripped — slower but
  // correct. (openbadges 0.1.14 also patched its preprocessor to use `fetch`
  // directly so it works in React Native.)
  await verifyJsonLdCredentialViaCryptosuite(agent, credentialJson)

  const openId4VcMetadata = extractOpenId4VcCredentialMetadata(offeredCredential as never, {
    id: resolvedCredentialOffer.metadata.issuer,
    display: resolvedCredentialOffer.metadata.credentialIssuerMetadata.display,
  })

  // Route to the right storage class. OBv3 → openbadges record (semantics are
  // about achievement/learner records). Everything else → the plain
  // JsonLdCredentialRecord we own.
  if (isOpenBadgeV3(credentialJson)) {
    const obRecord = new OpenBadgeCredentialRecord({ credential: credentialJson })
    setOpenId4VcCredentialMetadata(obRecord, openId4VcMetadata)
    await agent.dependencyManager
      .resolve(OpenBadgeCredentialRepository)
      .save(agent.context, obRecord)
    return obRecord
  }

  const jsonLdRecord = new JsonLdCredentialRecord({
    credential: credentialJson as JsonLdCredentialJson,
    verified: true,
  })
  setOpenId4VcCredentialMetadata(jsonLdRecord, openId4VcMetadata)
  await agent.dependencyManager
    .resolve(JsonLdCredentialRepository)
    .save(agent.context, jsonLdRecord)
  return jsonLdRecord
}

/**
 * Resolve `publicKeyMultibase` for a verification-method URL using Credo's
 * DID resolver. Handles `did:key`-style VMs that ship multibase directly, and
 * has a JWK fallback for did:jwk / did:web cases.
 *
 * Returns null if the VM uses a key shape we don't yet convert (rare; we'd add
 * support if a real issuer hits that path).
 */
async function resolvePublicKeyMultibase(agent: Agent, verificationMethodId: string): Promise<string | null> {
  try {
    const didsApi = agent.dependencyManager.resolve(DidsApi)
    const didDocument = await didsApi.resolveDidDocument(verificationMethodId.split('#')[0])
    const vm = didDocument.verificationMethod?.find((m) => m.id === verificationMethodId)
    if (!vm) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = vm as any
    if (v.publicKeyMultibase) return v.publicKeyMultibase

    const key = getKeyFromVerificationMethod(vm)
    // Credo's `Key` exposes `fingerprint` which is a `z`-prefixed base58btc
    // multibase encoding of (multicodec-prefix || raw-bytes) — exactly the
    // shape the cryptosuite expects. This also covers did:key Ed25519 VMs that
    // use `publicKeyBase58` / `Ed25519VerificationKey2018` instead of
    // `publicKeyMultibase`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (key as any).fingerprint as string
  } catch {
    return null
  }
}

async function verifyJsonLdCredentialViaCryptosuite(
  agent: Agent,
  credentialJson: Record<string, unknown>
): Promise<void> {
  // Make sure jsonld can fetch contexts on RN before the cryptosuite runs.
  installJsonLdRnLoader()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proof = (credentialJson as any).proof
  if (!proof) {
    // eslint-disable-next-line no-console
    console.log('[JSON-LD bridge] verify skipped — no proof on credential')
    return
  }
  const proofs: Array<Record<string, unknown>> = Array.isArray(proof) ? proof : [proof]

  // Suites we ship. Order matters only for diagnostics — `matchProof` ensures
  // we only run the suite whose cryptosuite name matches the proof.
  const suites: Array<{
    name: string
    matchProof: (p: unknown) => boolean
    verify: (opts: {
      document: Record<string, unknown>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      proof: any
      publicKeyMultibase: string
      useNetworkContexts?: boolean
    }) => Promise<{ verified: boolean; error?: string }>
  }> = [
    {
      name: 'eddsa-rdfc-2022',
      matchProof: (p) => new EddsaRdfc2022Cryptosuite().matchProof(p as never),
      verify: (opts) => new EddsaRdfc2022Cryptosuite().verify(opts as never),
    },
    {
      name: 'ecdsa-rdfc-2019',
      matchProof: (p) => new EcdsaRdfc2019Cryptosuite().matchProof(p as never),
      verify: (opts) => new EcdsaRdfc2019Cryptosuite().verify(opts),
    },
  ]

  for (const p of proofs) {
    const proofType = (p as { type?: string }).type
    const proofCryptosuite = (p as { cryptosuite?: string }).cryptosuite
    const suite = suites.find((s) => s.matchProof(p))
    if (!suite) {
      // eslint-disable-next-line no-console
      console.log('[JSON-LD bridge] verify: no suite matches proof', {
        type: proofType,
        cryptosuite: proofCryptosuite,
      })
      continue
    }

    const vmId = p.verificationMethod as string | undefined
    if (!vmId) {
      throw new Error('Credential proof has no verificationMethod — cannot verify.')
    }
    const publicKeyMultibase = await resolvePublicKeyMultibase(agent, vmId)
    if (!publicKeyMultibase) {
      throw new Error(`Could not resolve publicKeyMultibase for ${vmId} — cannot verify.`)
    }

    const result = await suite.verify({
      document: credentialJson,
      proof: p,
      publicKeyMultibase,
      useNetworkContexts: true,
    })
    if (!result.verified) {
      // eslint-disable-next-line no-console
      console.log(
        '[JSON-LD bridge] verify FAILED →',
        JSON.stringify({
          suite: suite.name,
          error: result.error,
          proofType,
          proofCryptosuite,
          vmId,
          documentTypes: (credentialJson as { type?: unknown }).type,
        })
      )
      throw new Error(`Credential proof verification failed (${suite.name}): ${result.error ?? 'unknown error'}`)
    }
    // eslint-disable-next-line no-console
    console.log('[JSON-LD bridge] verify OK', { suite: suite.name, proofType, proofCryptosuite })
    return
  }

  // No shipped cryptosuite matched any proof on the credential. Fail closed
  // — silently accepting an unverified credential would let a malicious or
  // misconfigured issuer plant arbitrary signed-looking JSON in the wallet.
  // If the user genuinely needs a new suite (eddsa-jcs-2022, bbs-2023, etc.)
  // it has to be implemented, not bypassed.
  const seen = proofs.map((pr) => ({
    type: (pr as { type?: string }).type,
    cryptosuite: (pr as { cryptosuite?: string }).cryptosuite,
  }))
  // eslint-disable-next-line no-console
  console.log('[JSON-LD bridge] verify FAILED — no shipped cryptosuite matched', JSON.stringify(seen))
  const list = seen
    .map((s) => `${s.type ?? '?'}/${s.cryptosuite ?? '?'}`)
    .join(', ')
  throw new Error(
    `Credential proof uses an unsupported cryptosuite (${list}). The wallet only verifies eddsa-rdfc-2022 and ecdsa-rdfc-2019.`
  )
}
