import {
  OpenId4VcCredentialHolderBinding,
  OpenId4VciCredentialBindingOptions,
  OpenId4VciCredentialFormatProfile,
  OpenId4VciCredentialSupportedWithId,
  OpenId4VciRequestTokenResponse,
  OpenId4VciResolvedCredentialOffer,
} from '@credo-ts/openid4vc'
import {
  Agent,
  DidJwk,
  DidKey,
  getJwkFromKey,
  JwaSignatureAlgorithm,
  JwkDidCreateOptions,
  KeyBackend,
  KeyDidCreateOptions,
  KeyType,
  Mdoc,
  MdocRecord,
  SdJwtVcRecord,
  W3cCredentialRecord,
  W3cJsonLdVerifiableCredential,
  W3cJwtVerifiableCredential,
} from '@credo-ts/core'
import { OpenBadgeCredentialRecord } from '@ajna-inc/openbadges'
import { JsonLdCredentialRecord } from './jsonLd/JsonLdCredentialRecord'
import {
  extractOpenId4VcCredentialMetadata,
  setOpenId4VcCredentialMetadata,
  temporaryMetaVanillaObject,
} from './metadata'
import { receiveJsonLdCredentialFromOpenId4VciOffer } from './jsonLd/receiveJsonLdCredential'

export const resolveOpenId4VciOffer = async ({
  agent,
  data,
  uri,
  authorization,
}: {
  agent: Agent
  // Either data itself (the offer) or uri can be passed
  data?: string
  uri?: string
  fetchAuthorization?: boolean
  authorization?: { clientId: string; redirectUri: string }
}): Promise<OpenId4VciResolvedCredentialOffer> => {
  let offerUri = uri

  if (!offerUri && data) {
    // FIXME: Credo only support credential offer string, but we already parsed it before. So we construct an offer here
    // but in the future we need to support the parsed offer in Credo directly
    offerUri = `openid-credential-offer://credential_offer=${encodeURIComponent(JSON.stringify(data))}`
  } else if (!offerUri) {
    throw new Error('either data or uri must be provided')
  }

  agent.config.logger.info(`Receiving openid uri ${offerUri}`, {
    offerUri,
    data: data,
    uri: offerUri,
  })

  const resolvedCredentialOffer = await agent.modules.openId4VcHolder.resolveCredentialOffer(offerUri)

  if (authorization) {
    throw new Error('Authorization flow is not supported yet as of Credo 0.5.13')
  }

  return resolvedCredentialOffer
}

export async function acquirePreAuthorizedAccessToken({
  agent,
  resolvedCredentialOffer,
  txCode,
}: {
  agent: Agent
  resolvedCredentialOffer: OpenId4VciResolvedCredentialOffer
  txCode?: string
}): Promise<OpenId4VciRequestTokenResponse> {
  return await agent.modules.openId4VcHolder.requestToken({
    resolvedCredentialOffer,
    txCode,
  })
}

export const customCredentialBindingResolver = async ({
  agent,
  supportedDidMethods,
  keyType,
  supportsAllDidMethods,
  supportsJwk,
  credentialFormat,
  supportedCredentialId,
  resolvedCredentialOffer,
  pidSchemes,
}: Partial<OpenId4VciCredentialBindingOptions> & {
  agent: Agent
  resolvedCredentialOffer: OpenId4VciResolvedCredentialOffer
  pidSchemes?: { sdJwtVcVcts: Array<string>; msoMdocDoctypes: Array<string> }
}): Promise<OpenId4VcCredentialHolderBinding> => {
  // First, we try to pick a did method
  // Prefer did:jwk, otherwise use did:key, otherwise use undefined
  let didMethod: 'key' | 'jwk' | undefined =
    supportsAllDidMethods || supportedDidMethods?.includes('did:jwk')
      ? 'jwk'
      : supportedDidMethods?.includes('did:key')
      ? 'key'
      : undefined

  // If supportedDidMethods is undefined, and supportsJwk is false, we will default to did:key
  // this is important as part of MATTR launchpad support which MUST use did:key but doesn't
  // define which did methods they support
  if (!supportedDidMethods && !supportsJwk) {
    didMethod = 'key'
  }

  const offeredCredentialConfiguration = supportedCredentialId
    ? resolvedCredentialOffer.offeredCredentialConfigurations[supportedCredentialId]
    : undefined

  const shouldKeyBeHardwareBackedForMsoMdoc =
    offeredCredentialConfiguration?.format === OpenId4VciCredentialFormatProfile.MsoMdoc &&
    pidSchemes?.msoMdocDoctypes.includes(offeredCredentialConfiguration.doctype)

  const shouldKeyBeHardwareBackedForSdJwtVc =
    offeredCredentialConfiguration?.format === 'vc+sd-jwt' &&
    pidSchemes?.sdJwtVcVcts.includes(offeredCredentialConfiguration.vct)

  const shouldKeyBeHardwareBacked = shouldKeyBeHardwareBackedForSdJwtVc || shouldKeyBeHardwareBackedForMsoMdoc

  if (!keyType) {
    throw new Error('keyType is required!')
  }

  const key = await agent.wallet.createKey({
    keyType,
    keyBackend: shouldKeyBeHardwareBacked ? KeyBackend.SecureElement : KeyBackend.Software,
  })

  if (didMethod) {
    const didResult = await agent.dids.create<JwkDidCreateOptions | KeyDidCreateOptions>({
      method: didMethod,
      options: {
        key,
      },
    })

    if (didResult.didState.state !== 'finished') {
      throw new Error('DID creation failed.')
    }

    let verificationMethodId: string
    if (didMethod === 'jwk') {
      const didJwk = DidJwk.fromDid(didResult.didState.did)
      verificationMethodId = didJwk.verificationMethodId
    } else {
      const didKey = DidKey.fromDid(didResult.didState.did)
      verificationMethodId = `${didKey.did}#${didKey.key.fingerprint}`
    }

    return {
      didUrl: verificationMethodId,
      method: 'did',
    }
  }

  // Otherwise we also support plain jwk for sd-jwt only
  if (
    supportsJwk &&
    (credentialFormat === OpenId4VciCredentialFormatProfile.SdJwtVc ||
      credentialFormat === OpenId4VciCredentialFormatProfile.MsoMdoc)
  ) {
    return {
      method: 'jwk',
      jwk: getJwkFromKey(key),
    }
  }

  throw new Error(
    `No supported binding method could be found. Supported methods are did:key and did:jwk, or plain jwk for sd-jwt/mdoc. Issuer supports ${
      supportsJwk ? 'jwk, ' : ''
    }${supportedDidMethods?.join(', ') ?? 'Unknown'}`
  )
}

// Format preference order — Credo 0.5.17 cleanly handles SD-JWT, mDoc, and classic JWT-VC.
// JSON-LD (ldp_vc / jwt_vc_json-ld) is last because Credo's W3cJsonLdCredentialService
// can't validate VC v2 documents and has no signature suite for DataIntegrityProof.
const FORMAT_PREFERENCE: ReadonlyArray<string> = [
  'vc+sd-jwt',
  'mso_mdoc',
  'jwt_vc_json',
  'jwt_vc_json-ld',
  'ldp_vc',
]

function pickPreferredOfferedCredentials<T extends { format: string }>(offered: ReadonlyArray<T>): T[] {
  for (const fmt of FORMAT_PREFERENCE) {
    const match = offered.find((o) => o.format === fmt)
    if (match) return [match]
  }
  return offered.length > 0 ? [offered[0]] : []
}

/**
 * Mints a holder DID/key via the existing customCredentialBindingResolver and
 * dispatches the JSON-LD credential request through the openbadges-backed bridge.
 *
 * Default signature alg is EdDSA / Ed25519 — matches what VC Playground and most
 * issuers expect for `eddsa-rdfc-2022`. We don't read `proof_types_supported`
 * from the offered config since Credo 0.5's metadata model is incomplete for
 * those fields and EdDSA is the broadest-compatible default.
 */
async function receiveJsonLdViaCustomBridge({
  agent,
  resolvedCredentialOffer,
  tokenResponse,
  offeredCredential,
  pidSchemes,
  clientId,
}: {
  agent: Agent
  resolvedCredentialOffer: OpenId4VciResolvedCredentialOffer
  tokenResponse: OpenId4VciRequestTokenResponse
  offeredCredential: OpenId4VciCredentialSupportedWithId
  pidSchemes?: { sdJwtVcVcts: Array<string>; msoMdocDoctypes: Array<string> }
  clientId?: string
}): Promise<OpenBadgeCredentialRecord | JsonLdCredentialRecord> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const offered = offeredCredential as any
  const bindingMethods: string[] | undefined = offered?.cryptographic_binding_methods_supported
  const supportsAllDidMethods = bindingMethods?.includes('did') ?? false
  const supportedDidMethods = bindingMethods?.filter((m: string) => m.startsWith('did:'))
  const supportsJwk = bindingMethods?.includes('jwk') ?? false

  const binding = await customCredentialBindingResolver({
    agent,
    keyType: KeyType.Ed25519,
    supportsAllDidMethods,
    supportedDidMethods,
    supportsJwk,
    credentialFormat: offeredCredential.format as
      | OpenId4VciCredentialFormatProfile.LdpVc
      | OpenId4VciCredentialFormatProfile.JwtVcJsonLd,
    supportedCredentialId: offeredCredential.id,
    resolvedCredentialOffer,
    pidSchemes,
  })

  const record = await receiveJsonLdCredentialFromOpenId4VciOffer({
    agent,
    resolvedCredentialOffer,
    tokenResponse,
    offeredCredential,
    binding,
    signatureAlgorithm: JwaSignatureAlgorithm.EdDSA,
    clientId,
  })

  // Match the existing flow's behaviour for notification metadata so the
  // downstream notification + offer-screen code paths are uniform.
  temporaryMetaVanillaObject.notificationMetadata = undefined

  return record
}

export const receiveCredentialFromOpenId4VciOffer = async ({
  agent,
  resolvedCredentialOffer,
  tokenResponse,
  credentialConfigurationIdsToRequest,
  clientId,
  pidSchemes,
}: {
  agent: Agent
  resolvedCredentialOffer: OpenId4VciResolvedCredentialOffer
  tokenResponse: OpenId4VciRequestTokenResponse
  credentialConfigurationIdsToRequest?: string[]
  clientId?: string
  pidSchemes?: { sdJwtVcVcts: Array<string>; msoMdocDoctypes: Array<string> }
}) => {
  const offeredCredentialsToRequest = credentialConfigurationIdsToRequest
    ? resolvedCredentialOffer.offeredCredentials.filter((offered) =>
        credentialConfigurationIdsToRequest.includes(offered.id)
      )
    : pickPreferredOfferedCredentials(resolvedCredentialOffer.offeredCredentials)


  if (offeredCredentialsToRequest.length === 0) {
    throw new Error(
      `Parameter 'credentialConfigurationIdsToRequest' with values ${credentialConfigurationIdsToRequest} is not a credential_configuration_id in the credential offer.`
    )
  }

  const resolvedCredentialIdsToRequest =
    credentialConfigurationIdsToRequest ?? offeredCredentialsToRequest.map((c) => c.id)

  // JSON-LD bridge — only `ldp_vc` (embedded LD-Proof on a JSON-LD object).
  // `jwt_vc_json-ld` is still a compact JWT string on the wire (the `-ld`
  // suffix only signals that the JWT's `vc` payload contains a JSON-LD
  // `@context`). Credo's standard JWT-VC path handles that fine, so we
  // intentionally leave `JwtVcJsonLd` OUT of this routing condition — the
  // bridge's object-only response handler would reject the JWT string.
  const isJsonLdRequest = offeredCredentialsToRequest.every(
    (c) => c.format === OpenId4VciCredentialFormatProfile.LdpVc
  )
  if (isJsonLdRequest) {
    return receiveJsonLdViaCustomBridge({
      agent,
      resolvedCredentialOffer,
      tokenResponse,
      offeredCredential: offeredCredentialsToRequest[0] as OpenId4VciCredentialSupportedWithId,
      pidSchemes,
      clientId,
    })
  }

  const credentials = await agent.modules.openId4VcHolder.requestCredentials({
    resolvedCredentialOffer,
    ...tokenResponse,
    clientId,
    credentialsToRequest: resolvedCredentialIdsToRequest,
    verifyCredentialStatus: false,
    allowedProofOfPossessionSignatureAlgorithms: [
      // NOTE: MATTR launchpad for JFF MUST use EdDSA. So it is important that the default (first allowed one)
      // is EdDSA. The list is ordered by preference, so if no suites are defined by the issuer, the first one
      // will be used
      JwaSignatureAlgorithm.EdDSA,
      JwaSignatureAlgorithm.ES256,
    ],
    credentialBindingResolver: async ({
      supportedDidMethods,
      keyType,
      supportsAllDidMethods,
      supportsJwk,
      credentialFormat,
      supportedCredentialId,
    }: OpenId4VciCredentialBindingOptions) => {
      return customCredentialBindingResolver({
        agent,
        supportedDidMethods,
        keyType,
        supportsAllDidMethods,
        supportsJwk,
        credentialFormat,
        supportedCredentialId,
        resolvedCredentialOffer,
        pidSchemes,
      })
    },
  })

  // We only support one credential for now
  const [firstCredential] = credentials

  if (!firstCredential)
    throw new Error('Error retrieving credential using pre authorized flow: firstCredential undefined!.')

  let record: SdJwtVcRecord | W3cCredentialRecord | MdocRecord

  if (typeof firstCredential === 'string') {
    throw new Error('Error retrieving credential using pre authorized flow: firstCredential is string.')
  }

  if ('compact' in firstCredential.credential) {
    // TODO: add claimFormat to SdJwtVc
    record = new SdJwtVcRecord({
      compactSdJwtVc: firstCredential.credential.compact,
    })
  } else if (firstCredential.credential instanceof Mdoc) {
    record = new MdocRecord({
      mdoc: firstCredential.credential,
    })
  } else {
    record = new W3cCredentialRecord({
      credential: firstCredential.credential as W3cJwtVerifiableCredential | W3cJsonLdVerifiableCredential,
      // We don't support expanded types right now, but would become problem when we support JSON-LD
      tags: {},
    })
  }

  const notificationMetadata = { ...firstCredential.notificationMetadata }
  if (notificationMetadata) {
    temporaryMetaVanillaObject.notificationMetadata = notificationMetadata
  }

  const metadataSource =
    offeredCredentialsToRequest.find((c) => c.id === resolvedCredentialIdsToRequest[0]) ?? offeredCredentialsToRequest[0]

  const openId4VcMetadata = extractOpenId4VcCredentialMetadata(
    metadataSource as OpenId4VciCredentialSupportedWithId,
    {
      id: resolvedCredentialOffer.metadata.issuer,
      display: resolvedCredentialOffer.metadata.credentialIssuerMetadata.display,
    }
  )

  setOpenId4VcCredentialMetadata(record, openId4VcMetadata)

  return record
}
