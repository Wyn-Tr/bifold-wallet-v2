import { Agent, DifPexCredentialsForRequest, Jwt, X509ModuleConfig } from '@credo-ts/core'
import { OpenBadgeCredentialRecord } from '@ajna-inc/openbadges'
import { ParseInvitationResult } from '../../utils/parsers'
import q from 'query-string'
import { OpenId4VPRequestRecord } from './types'
import { OpenIdVpError } from './errors'
import { preflightVpRequest } from './preflightVp'
import { validateSubmissionRequirements } from './submissionRequirements'
import { getHostNameFromUrl } from './utils/utils'
import { OpenId4VcSiopVerifiedAuthorizationRequest } from '@credo-ts/openid4vc'
import { Linking } from 'react-native'
import { augmentCandidatesWithJsonLd } from './jsonLd/augmentPexCandidates'
import { JsonLdCredentialRecord } from './jsonLd/JsonLdCredentialRecord'
import {
  shareJsonLdPresentation,
  type LdpVpCapableRecord,
} from './jsonLd/shareJsonLdPresentation'
import { evaluateX509ClientId } from './x509ClientId'
import { normalizeAuthorizationRequest } from './normalizeAuthRequest'

/**
 * Pull the `presentation_definition` out of Sphereon's resolved request.
 *
 * Three places it could live:
 *   1. `presentationDefinitions[0].definition` — Sphereon already extracted
 *      and located it. Most reliable.
 *   2. `payload.presentation_definition` — JWT payload field.
 *   3. `authorizationRequestPayload.presentation_definition` — URL query
 *      params. Won't have it for request_uri / request flows where the PD
 *      is inside the JWT.
 *
 * We try in that order so we work across all transports.
 */
function extractPresentationDefinition(
  request: OpenId4VcSiopVerifiedAuthorizationRequest
): Record<string, unknown> | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = request as any
  const fromPdList = r?.presentationDefinitions?.[0]?.definition
  if (fromPdList && typeof fromPdList === 'object') return fromPdList
  const fromPayload = r?.payload?.presentation_definition
  if (fromPayload && typeof fromPayload === 'object') return fromPayload
  const fromUrlParams = r?.authorizationRequestPayload?.presentation_definition
  if (fromUrlParams && typeof fromUrlParams === 'object') return fromUrlParams
  return undefined
}

/** True when the record is one we present via our JSON-LD VP path. */
function isLdpVpRecord(record: unknown): record is LdpVpCapableRecord {
  if (!record || typeof record !== 'object') return false
  return record instanceof JsonLdCredentialRecord || record instanceof OpenBadgeCredentialRecord
}

function handleTextResponse(text: string): ParseInvitationResult {
  // If the text starts with 'ey' we assume it's a JWT and thus an OpenID authorization request
  if (text.startsWith('ey')) {
    return {
      success: true,
      result: {
        format: 'parsed',
        type: 'openid-authorization-request',
        data: text,
      },
    }
  }

  // Otherwise we still try to parse it as JSON
  try {
    const json: unknown = JSON.parse(text)
    return handleJsonResponse(json)

    // handel like above
  } catch (error) {
    throw new Error(`[handleTextResponse] Error:${error}`)
  }
}

function handleJsonResponse(json: unknown): ParseInvitationResult {
  // We expect a JSON object
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error('[handleJsonResponse] Invitation not recognized.')
  }

  if ('@type' in json) {
    return {
      success: true,
      result: {
        format: 'parsed',
        type: 'didcomm',
        data: json,
      },
    }
  }

  if ('credential_issuer' in json) {
    return {
      success: true,
      result: {
        format: 'parsed',
        type: 'openid-credential-offer',
        data: json,
      },
    }
  }

  throw new Error('[handleJsonResponse] Invitation not recognized.')
}

export async function fetchInvitationDataUrl(dataUrl: string): Promise<ParseInvitationResult> {
  // If we haven't had a response after 10 seconds, we will handle as if the invitation is not valid.
  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), 10000)

  try {
    // If we still don't know what type of invitation it is, we assume it is a URL that we need to fetch to retrieve the invitation.
    const response = await fetch(dataUrl, {
      headers: {
        // for DIDComm out of band invitations we should include application/json
        // but we are flexible and also want to support other types of invitations
        // as e.g. the OpenID SIOP request is a signed encoded JWT string
        Accept: 'application/json, text/plain, */*',
      },
    })
    clearTimeout(timeout)
    if (!response.ok) {
      throw new Error('[retrieve_invitation_error] Unable to retrieve invitation.')
    }

    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const json: unknown = await response.json()
      return handleJsonResponse(json)
    }
    const text = await response.text()
    return handleTextResponse(text)
  } catch (error) {
    clearTimeout(timeout)
    throw new Error(`[retrieve_invitation_error] Unable to retrieve invitation: ${error}`)
  }
}

const extractCertificateFromJwt = (jwt: string) => {
  const jwtHeader = Jwt.fromSerializedJwt(jwt).header
  return Array.isArray(jwtHeader.x5c) && typeof jwtHeader.x5c[0] === 'string' ? jwtHeader.x5c[0] : null
}

/**
 * This is a temp method to allow for untrusted certificates to still work with the wallet.
 */
export const extractCertificateFromAuthorizationRequest = async ({
  data,
  uri,
}: {
  data?: string
  uri?: string
}): Promise<{ data: string | null; certificate: string | null }> => {
  try {
    if (data) {
      return {
        data,
        certificate: extractCertificateFromJwt(data),
      }
    }

    if (uri) {
      const query = q.parseUrl(uri).query
      if (query.request_uri && typeof query.request_uri === 'string') {
        const result = await fetchInvitationDataUrl(query.request_uri)
        if (
          result.success &&
          result.result.type === 'openid-authorization-request' &&
          typeof result.result.data === 'string'
        ) {
          return {
            data: result.result.data,
            certificate: extractCertificateFromJwt(result.result.data),
          }
        }
      } else if (query.request && typeof query.request === 'string') {
        const _res = {
          data: query.request,
          certificate: extractCertificateFromJwt(query.request),
        }
        return _res
      }
    }
    return { data: null, certificate: null }
  } catch (error) {
    return { data: null, certificate: null }
  }
}

export async function withTrustedCertificate<T>(
  agent: Agent,
  certificate: string | null,
  method: () => Promise<T> | T
): Promise<T> {
  const x509ModuleConfig = agent.dependencyManager.resolve(X509ModuleConfig)
  const currentTrustedCertificates = x509ModuleConfig.trustedCertificates
    ? [...x509ModuleConfig.trustedCertificates]
    : []

  try {
    if (certificate) agent.x509.addTrustedCertificate(certificate)
    return await method()
  } finally {
    if (certificate) x509ModuleConfig.setTrustedCertificates(currentTrustedCertificates as [string])
  }
}

//This settings should be moved to an injectable config
const allowUntrustedCertificates = false

export const getCredentialsForProofRequest = async ({
  agent,
  data,
  uri,
}: {
  agent: Agent
  // Either data itself (the offer) or uri can be passed
  data?: string
  uri?: string
  fetchAuthorization?: boolean
  authorization?: { clientId: string; redirectUri: string }
}): Promise<OpenId4VPRequestRecord | undefined> => {
  let requestUri = uri

  try {
    // x509_san_dns / x509_san_uri client_id_scheme: validate the SAN binding
    // ourselves, then trust the leaf cert for the duration of the resolve
    // call. Without this, EUDI-style verifiers (and any RP that authenticates
    // via cert+SAN instead of a DID) fail at "untrusted certificate".
    const x509Result = await evaluateX509ClientId({ agent, data, uri })
    if (x509Result.scheme && !x509Result.matched && x509Result.reason) {
      throw new Error(`x509 client_id_scheme rejected: ${x509Result.reason}`)
    }

    let certificate: string | null = null
    let newData: string | null = null
    if (x509Result.matched && x509Result.leafCertBase64) {
      // SAN binding passed — trust the leaf so Credo's resolver accepts the
      // request JWT signature. `withTrustedCertificate` removes it afterward.
      certificate = x509Result.leafCertBase64
    } else if (allowUntrustedCertificates) {
      const extracted = await extractCertificateFromAuthorizationRequest({ data, uri })
      certificate = extracted.certificate
      newData = extracted.data
    }

    if (newData) {
      // FIXME: Credo only support request string, but we already parsed it before. So we construct an request here
      // but in the future we need to support the parsed request in Credo directly
      requestUri = `openid://?request=${encodeURIComponent(newData)}`
    } else if (uri) {
      requestUri = uri
    } else {
      throw new Error('Either data or uri must be provided')
    }

    // Draft-24+ prefixed client_id translation. If the request JWT has a
    // colon-prefixed client_id (e.g. `redirect_uri:https://...`), rewrite it
    // into the bare URL + explicit client_id_scheme shape Sphereon-in-Credo
    // 0.5 understands. Only operates on unsigned (alg:none) JWTs; signed ones
    // pass through unchanged (see normalizeAuthRequest for the rationale).
    agent.config.logger.info(`[OID4VP-norm] entering normalize, data=${!!data}, uri starts=${uri?.slice(0, 60)}`)
    const normalized = await normalizeAuthorizationRequest({ data, uri, logger: agent.config.logger })
    if (normalized.inlineRequest) {
      requestUri = `openid://?request=${encodeURIComponent(normalized.inlineRequest)}`
      agent.config.logger.info(`[OID4VP-norm] substituted requestUri with normalized inline (len=${requestUri.length})`)
    } else {
      agent.config.logger.info(`[OID4VP-norm] passing through original (no normalization)`)
    }

    agent.config.logger.info(`$$Receiving openid uri ${requestUri.slice(0, 200)}`)

    // Temp solution to add and remove the trusted certificate
    const resolved = await withTrustedCertificate(agent, certificate, async () => {
      try {
        return await agent.modules.openId4VcHolder.resolveSiopAuthorizationRequest(requestUri)
      } catch (e) {
        agent.config.logger.error(
          `[OID4VP-resolve] Sphereon resolve threw: name=${(e as Error)?.name} msg=${(e as Error)?.message}`
        )
        throw e
      }
    })

    if (!resolved.presentationExchange) {
      throw new Error('No presentation exchange found in authorization request.')
    }

    // Augment Credo's PEX result with our JSON-LD / OpenBadge records — Credo
    // 0.5's PEX engine only sees W3cCredential / SdJwtVc / Mdoc records, so
    // any credential we received via the JSON-LD bridge is invisible without
    // this pass.
    //
    // Credo wraps the PEX result as `{ definition, credentialsForRequest }`;
    // the inner `credentialsForRequest` is the `DifPexCredentialsForRequest`
    // (with `.requirements`) that our augmenter operates on.
    const presentationDefinition = extractPresentationDefinition(resolved.authorizationRequest)
    agent.config.logger.info(
      `[OID4VP-pex] PD extracted? ${!!presentationDefinition}; descriptors=${
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Array.isArray((presentationDefinition as any)?.input_descriptors)
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (presentationDefinition as any).input_descriptors.length
          : 'n/a'
      }`
    )
    const augmentedCredentialsForRequest = presentationDefinition
      ? await augmentCandidatesWithJsonLd({
          agent,
          credentialsForRequest: resolved.presentationExchange.credentialsForRequest,
          presentationDefinition,
        })
      : resolved.presentationExchange.credentialsForRequest

    return {
      definition: resolved.presentationExchange.definition,
      credentialsForRequest: augmentedCredentialsForRequest,
      authorizationRequest: resolved.authorizationRequest,
      verifierHostName: resolved.authorizationRequest.responseURI
        ? getHostNameFromUrl(resolved.authorizationRequest.responseURI)
        : undefined,
      createdAt: new Date(),
      type: 'OpenId4VPRequestRecord',
    }
  } catch (err) {
    agent.config.logger.error(`Parsing presentation request:  ${(err as Error)?.message ?? err}`)
    throw err
  }
}

export const shareProof = async ({
  agent,
  authorizationRequest,
  credentialsForRequest,
  selectedCredentials,
  allowUntrustedCertificate = false,
}: {
  agent: Agent
  authorizationRequest: OpenId4VcSiopVerifiedAuthorizationRequest
  credentialsForRequest: DifPexCredentialsForRequest
  selectedCredentials: { [inputDescriptorId: string]: { id: string; claimFormat: string } }
  allowUntrustedCertificate?: boolean
}) => {
  if (!credentialsForRequest.areRequirementsSatisfied) {
    throw new Error('Requirements from proof request are not satisfied')
  }

  // Map all requirements and entries to a credential record. If a credential record for an
  // input descriptor has been provided in `selectedCredentials` we will use that. Otherwise
  // it will pick the first available credential.
  const credentials = Object.fromEntries(
    credentialsForRequest.requirements.flatMap((requirement) =>
      requirement.submissionEntry.map((entry) => {
        const selected = selectedCredentials[entry.inputDescriptorId]
        if (!selected) {
          throw new OpenIdVpError('descriptor_missing_selection', `No selected credential for descriptor ${entry.inputDescriptorId}`, {
            descriptorId: entry.inputDescriptorId,
          })
        }

        const credential = entry.verifiableCredentials.find((vc) => vc.credentialRecord.id === selected.id)
        if (!credential) {
          throw new OpenIdVpError(
            'descriptor_no_candidates',
            `Selected credential ${selected.id} not available for descriptor ${entry.inputDescriptorId}`,
            { descriptorId: entry.inputDescriptorId, credentialId: selected.id }
          )
        }

        return [entry.inputDescriptorId, [credential.credentialRecord]]
      })
    )
  )

  // Detect JSON-LD records — they can't go through Credo's
  // acceptSiopAuthorizationRequest (W3cJsonLdCredentialService has no
  // DataIntegrityProof suite). We route them through our openbadges-backed
  // VP builder and POST the response ourselves.
  const ldpVpDescriptors: Record<string, LdpVpCapableRecord[]> = {}
  for (const [descriptorId, records] of Object.entries(credentials)) {
    for (const record of records) {
      if (isLdpVpRecord(record)) {
        if (!ldpVpDescriptors[descriptorId]) ldpVpDescriptors[descriptorId] = []
        ldpVpDescriptors[descriptorId].push(record)
      }
    }
  }
  const hasLdpVp = Object.keys(ldpVpDescriptors).length > 0
  const hasNonLdpVp = Object.values(credentials).some((records) =>
    records.some((r) => !isLdpVpRecord(r))
  )
  if (hasLdpVp && hasNonLdpVp) {
    // Splitting one PEX submission across two presentations (one Credo-built,
    // one ours) is non-trivial and verifiers rarely mix formats. Fail clearly.
    throw new OpenIdVpError(
      'mixed_format_not_supported',
      'Cannot present JSON-LD and non-JSON-LD credentials in the same submission yet.'
    )
  }

  const inputDescriptors = credentialsForRequest.requirements.flatMap((requirement) =>
    requirement.submissionEntry.map((entry) => ({ id: entry.inputDescriptorId }))
  )

  const preflightIssues = preflightVpRequest({
    inputDescriptors,
    selectedCredentials,
    verifierVpFormats: ((authorizationRequest as unknown as Record<string, unknown>)?.presentation_definition as any)?.format,
    holderCapabilities: {
      supportsDidKey: true,
      supportsDidJwk: true,
      supportsJwkBinding: true,
      supportedSigningAlgs: ['EdDSA', 'ES256'],
    },
  })

  if (preflightIssues.length > 0) {
    throw new OpenIdVpError('preflight_failed', preflightIssues.map((issue) => issue.message).join('; '), {
      issues: preflightIssues.map((issue) => issue.code),
    })
  }

  const presentationDefinition =
    (authorizationRequest as unknown as { presentation_definition?: Record<string, unknown> }).presentation_definition ||
    undefined

  const rawSubmissionRequirements = (presentationDefinition?.submission_requirements as any[] | undefined) || undefined
  const descriptorGroupMap: Record<string, string[]> = {}
  const inputDescriptorsRaw = (presentationDefinition?.input_descriptors as any[] | undefined) || []
  for (const descriptor of inputDescriptorsRaw) {
    const groups = Array.isArray(descriptor?.group) ? descriptor.group : descriptor?.group ? [descriptor.group] : []
    for (const group of groups) {
      if (!descriptorGroupMap[group]) descriptorGroupMap[group] = []
      descriptorGroupMap[group].push(descriptor.id)
    }
  }

  const srErrors = validateSubmissionRequirements(rawSubmissionRequirements as any, selectedCredentials as any, descriptorGroupMap)
  if (srErrors.length > 0) {
    throw new OpenIdVpError('submission_requirements_unsatisfied', srErrors.map((err) => err.message).join('; '), {
      issues: srErrors.map((err) => err.code),
    })
  }

  try {
    // JSON-LD path — build + sign + POST a ldp_vp ourselves. Credo's
    // acceptSiopAuthorizationRequest can't reach our records and can't build
    // DataIntegrityProof VPs.
    if (hasLdpVp) {
      const result = await shareJsonLdPresentation({
        agent,
        authorizationRequest,
        selectedByDescriptor: ldpVpDescriptors,
      })
      if (result.redirectUri) {
        await Linking.openURL(result.redirectUri)
      }
      if (result.status < 200 || result.status > 299) {
        throw new Error(
          `Verifier rejected JSON-LD presentation (HTTP ${result.status}): ${
            typeof result.body === 'string' ? result.body : JSON.stringify(result.body).slice(0, 300)
          }`
        )
      }
      return {
        serverResponse: {
          status: result.status,
          body: result.body as never,
        },
      } as never
    }

    // Temp solution to add and remove the trusted certicaite
    const certificate =
      authorizationRequest.jwt && allowUntrustedCertificate ? extractCertificateFromJwt(authorizationRequest.jwt) : null

    const result = await withTrustedCertificate(agent, certificate, () =>
      agent.modules.openId4VcHolder.acceptSiopAuthorizationRequest({
        authorizationRequest,
        presentationExchange: {
          credentials,
        },
      })
    )

    // if redirect_uri is provided, open it in the browser
    // Even if the response returned an error, we must open this uri
    if (typeof result.serverResponse.body === 'object' && typeof result.serverResponse.body.redirect_uri === 'string') {
      await Linking.openURL(result.serverResponse.body.redirect_uri)
    }

    if (result.serverResponse.status < 200 || result.serverResponse.status > 299) {
      throw new Error(`Error while accepting authorization request. ${result.serverResponse.body as string}`)
    }

    return result
  } catch (error) {
    // Handle biometric authentication errors
    throw new Error(`Error accepting proof request. ${(error as Error)?.message ?? error}`)
  }
}
