import type {
  CredentialDisplay,
  CredentialIssuerDisplay,
  JffW3cCredentialJson,
  OpenId4VcCredentialMetadata,
  W3cCredentialDisplay,
  W3cCredentialJson,
} from './types'
import { JwkJson, Mdoc, MdocRecord, TypedArrayEncoder, W3cCredentialRecord } from '@credo-ts/core'

import { Hasher, SdJwtVcRecord, ClaimFormat, JsonTransformer } from '@credo-ts/core'
import { OpenBadgeCredentialRecord } from '@ajna-inc/openbadges'
import { JsonLdCredentialRecord } from './jsonLd/JsonLdCredentialRecord'
import { decodeSdJwtSync, getClaimsSync } from '@sd-jwt/decode'
import { CredentialForDisplayId } from './types'
import { detectImageMimeType, formatDate, getHostNameFromUrl, isDateString, sanitizeString } from './utils/utils'
import { getOpenId4VcCredentialMetadata } from './metadata'

/**
 * OpenBadges v3 credential detection — checks for `OpenBadgeCredential` or
 * `AchievementCredential` in the type array.
 */
export function isOpenBadgeCredential(credential: W3cCredentialJson): boolean {
  return (
    credential.type?.includes('OpenBadgeCredential') === true ||
    credential.type?.includes('AchievementCredential') === true
  )
}

export interface OpenBadgeDisplayData {
  achievementName: string
  achievementDescription?: string
  achievementImage?: string
  achievementType?: string
  criteria?: string
  issuerName?: string
  issuerImage?: string
}

/**
 * Extract OBv3 achievement / issuer display fields. Tolerates both v1
 * (`issuanceDate`) and v2 (`validFrom`) shapes; the dates are handled by the
 * caller so this only deals with achievement / subject / issuer.
 */
export function getOpenBadgeDisplayData(credential: W3cCredentialJson): OpenBadgeDisplayData {
  const subject = Array.isArray(credential.credentialSubject)
    ? credential.credentialSubject[0]
    : credential.credentialSubject

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const achievement = (subject as any)?.achievement
  const issuer = typeof credential.issuer === 'string' ? { id: credential.issuer } : credential.issuer

  return {
    achievementName: achievement?.name || 'Badge',
    achievementDescription: achievement?.description,
    achievementImage: achievement?.image?.id || achievement?.image,
    achievementType: achievement?.achievementType || 'Badge',
    criteria: achievement?.criteria?.narrative,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    issuerName: (issuer as any)?.name,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    issuerImage: (issuer as any)?.image?.id || (issuer as any)?.image,
  }
}

function findDisplay<Display extends { locale?: string }>(display?: Display[]): Display | undefined {
  if (!display) return undefined

  let item = display.find((d) => d.locale?.startsWith('en-'))
  if (!item) item = display.find((d) => !d.locale)
  if (!item) item = display[0]

  return item
}

function getOpenId4VcIssuerDisplay(openId4VcMetadata?: OpenId4VcCredentialMetadata | null): CredentialIssuerDisplay {
  const issuerDisplay: Partial<CredentialIssuerDisplay> = {}

  // Try to extract from openid metadata first
  if (openId4VcMetadata) {
    const openidIssuerDisplay = findDisplay(openId4VcMetadata.issuer.display)

    if (openidIssuerDisplay) {
      issuerDisplay.name = openidIssuerDisplay.name

      if (openidIssuerDisplay.logo) {
        issuerDisplay.logo = {
          url: openidIssuerDisplay.logo?.url,
          altText: openidIssuerDisplay.logo?.alt_text,
        }
      }
    }

    // If the credentialDisplay contains a logo, and the issuerDisplay does not, use the logo from the credentialDisplay
    const openidCredentialDisplay = findDisplay(openId4VcMetadata.credential.display)
    if (openidCredentialDisplay && !issuerDisplay.logo && openidCredentialDisplay.logo) {
      issuerDisplay.logo = {
        url: openidCredentialDisplay.logo?.url,
        altText: openidCredentialDisplay.logo?.alt_text,
      }
    }
  }

  // Last fallback: use issuer id from openid4vc
  if (!issuerDisplay.name && openId4VcMetadata?.issuer.id) {
    issuerDisplay.name = getHostNameFromUrl(openId4VcMetadata.issuer.id)
  }

  if (openId4VcMetadata?.issuer.id) {
    issuerDisplay.domain = getHostNameFromUrl(openId4VcMetadata.issuer.id)
  }

  return {
    ...issuerDisplay,
    name: issuerDisplay.name ?? 'Unknown',
  }
}

function getIssuerDisplay(metadata: OpenId4VcCredentialMetadata | null | undefined): Partial<CredentialIssuerDisplay> {
  const issuerDisplay: Partial<CredentialIssuerDisplay> = {}
  // Try to extract from openid metadata first
  const openidIssuerDisplay = findDisplay(metadata?.issuer.display)
  issuerDisplay.name = openidIssuerDisplay?.name
  issuerDisplay.logo = openidIssuerDisplay?.logo
    ? {
        url: openidIssuerDisplay.logo?.url,
        altText: openidIssuerDisplay.logo?.alt_text,
      }
    : undefined

  // If the credentialDisplay contains a logo, and the issuerDisplay does not, use the logo from the credentialDisplay
  const openidCredentialDisplay = findDisplay(metadata?.credential.display)
  if (openidCredentialDisplay && !issuerDisplay.logo && openidCredentialDisplay.logo) {
    issuerDisplay.logo = {
      url: openidCredentialDisplay.logo?.url,
      altText: openidCredentialDisplay.logo?.alt_text,
    }
  }

  return issuerDisplay
}

function processIssuerDisplay(
  metadata: OpenId4VcCredentialMetadata | null | undefined,
  issuerDisplay: Partial<CredentialIssuerDisplay>
): CredentialIssuerDisplay {
  // Last fallback: use issuer id from openid4vc
  if (!issuerDisplay.name && metadata?.issuer.id) {
    issuerDisplay.name = getHostNameFromUrl(metadata.issuer.id)
  }

  return {
    ...issuerDisplay,
    name: issuerDisplay.name ?? 'Unknown',
  }
}

function getW3cIssuerDisplay(
  credential: W3cCredentialJson,
  openId4VcMetadata?: OpenId4VcCredentialMetadata | null
): CredentialIssuerDisplay {
  const issuerDisplay: Partial<CredentialIssuerDisplay> = getIssuerDisplay(openId4VcMetadata)

  // If openid metadata is not available, try to extract display metadata from the credential based on JFF metadata
  const jffCredential = credential as JffW3cCredentialJson
  const issuerJson = typeof jffCredential.issuer === 'string' ? undefined : jffCredential.issuer

  // Issuer Display from JFF
  if (!issuerDisplay.logo || !issuerDisplay.logo.url) {
    issuerDisplay.logo = issuerJson?.logoUrl
      ? { url: issuerJson?.logoUrl }
      : issuerJson?.image
      ? { url: typeof issuerJson.image === 'string' ? issuerJson.image : issuerJson.image.id }
      : undefined
  }

  // Issuer name from JFF
  if (!issuerDisplay.name) {
    issuerDisplay.name = issuerJson?.name
  }

  return processIssuerDisplay(openId4VcMetadata, issuerDisplay)
}

function getCredentialDisplay(
  credentialPayload: Record<string, unknown>,
  openId4VcMetadata?: OpenId4VcCredentialMetadata | null
): Partial<CredentialDisplay> {
  const credentialDisplay: Partial<CredentialDisplay> = {}

  if (openId4VcMetadata) {
    const openidCredentialDisplay = findDisplay(openId4VcMetadata.credential.display)
    credentialDisplay.name = openidCredentialDisplay?.name
    credentialDisplay.description = openidCredentialDisplay?.description
    credentialDisplay.textColor = openidCredentialDisplay?.text_color
    credentialDisplay.backgroundColor = openidCredentialDisplay?.background_color
    credentialDisplay.backgroundImage = openidCredentialDisplay?.background_image
      ? {
          url: openidCredentialDisplay.background_image.url,
          altText: openidCredentialDisplay.background_image.alt_text,
        }
      : undefined
    credentialDisplay.logo = openidCredentialDisplay?.logo
    credentialDisplay.primary_overlay_attribute = openidCredentialDisplay?.primary_overlay_attribute as
      | string
      | undefined
  }

  return credentialDisplay
}

function getW3cCredentialDisplay(
  credential: W3cCredentialJson,
  openId4VcMetadata?: OpenId4VcCredentialMetadata | null
) {
  const credentialDisplay: Partial<CredentialDisplay> = getCredentialDisplay(credential, openId4VcMetadata)

  // If openid metadata is not available, try to extract display metadata from the credential based on JFF metadata
  const jffCredential = credential as JffW3cCredentialJson

  if (!credentialDisplay.name) {
    credentialDisplay.name = jffCredential.name
  }

  // If there's no name for the credential, we extract it from the last type
  // and sanitize it. This is not optimal. But provides at least something.
  if (!credentialDisplay.name && jffCredential.type.length > 1) {
    const lastType = jffCredential.type[jffCredential.type.length - 1]
    credentialDisplay.name = lastType && !lastType.startsWith('http') ? sanitizeString(lastType) : undefined
  }

  // Use background color from the JFF credential if not provided by the OID4VCI metadata
  if (!credentialDisplay.backgroundColor && jffCredential.credentialBranding?.backgroundColor) {
    credentialDisplay.backgroundColor = jffCredential.credentialBranding.backgroundColor
  }

  return {
    ...credentialDisplay,
    // Last fallback, if there's really no name for the credential, we use a generic name
    name: credentialDisplay.name ?? 'Credential',
  }
}

function getSdJwtCredentialDisplay(
  credentialPayload: Record<string, unknown>,
  openId4VcMetadata?: OpenId4VcCredentialMetadata | null
) {
  const credentialDisplay: Partial<CredentialDisplay> = getCredentialDisplay(credentialPayload, openId4VcMetadata)

  const issuer = typeof credentialPayload.iss === 'string' ? credentialPayload.iss : undefined
  const issuerHost = getHostNameSafe(issuer)

  if (!credentialDisplay.name && typeof credentialPayload.vct === 'string') {
    credentialDisplay.name = sanitizeString(credentialPayload.vct)
  }

  if (!credentialDisplay.description && issuerHost) {
    credentialDisplay.description = `Issued by ${issuerHost}`
  }

  return {
    ...credentialDisplay,
    name: credentialDisplay.name ?? 'Credential',
  }
}

function getMdocCredentialDisplay(
  credentialPayload: Record<string, unknown>,
  openId4VcMetadata?: OpenId4VcCredentialMetadata | null
) {
  const credentialDisplay: Partial<CredentialDisplay> = {}

  if (openId4VcMetadata) {
    const openidCredentialDisplay = findDisplay(openId4VcMetadata.credential.display)

    if (openidCredentialDisplay) {
      credentialDisplay.name = openidCredentialDisplay.name
      credentialDisplay.description = openidCredentialDisplay.description
      credentialDisplay.textColor = openidCredentialDisplay.text_color
      credentialDisplay.backgroundColor = openidCredentialDisplay.background_color

      if (openidCredentialDisplay.background_image) {
        credentialDisplay.backgroundImage = {
          url: openidCredentialDisplay.background_image.url,
          altText: openidCredentialDisplay.background_image.alt_text,
        }
      }

      // NOTE: logo is used in issuer display (not sure if that's right though)
    }
  }

  // TODO: mdoc
  // If there's no name for the credential, we extract it from the last type
  // and sanitize it. This is not optimal. But provides at least something.
  // if (!credentialDisplay.name && typeof credentialPayload.vct === 'string') {
  //   credentialDisplay.name = sanitizeString(credentialPayload.vct)
  // }

  return {
    ...credentialDisplay,
    // Last fallback, if there's really no name for the credential, we use a generic name
    // TODO: use on-device AI to determine a name for the credential based on the credential data
    name: credentialDisplay.name ?? 'Credential',
  }
}

export interface DisplayImage {
  url?: string
  altText?: string
}

export interface CredentialMetadata {
  type: string
  issuer: string
  holder?: string
  validUntil?: string
  validFrom?: string
  issuedAt?: string
}

function safeCalculateJwkThumbprint(jwk: JwkJson): string | undefined {
  try {
    const thumbprint = TypedArrayEncoder.toBase64URL(
      Hasher.hash(
        JSON.stringify({ k: jwk.k, e: jwk.e, crv: jwk.crv, kty: jwk.kty, n: jwk.n, x: jwk.x, y: jwk.y }),
        'sha-256'
      )
    )
    return `urn:ietf:params:oauth:jwk-thumbprint:sha-256:${thumbprint}`
  } catch (e) {
    return undefined
  }
}

function getHostNameSafe(url?: string): string | undefined {
  if (!url) return undefined
  try {
    return getHostNameFromUrl(url)
  } catch {
    return undefined
  }
}

function choosePrimaryOverlayAttribute(attributes: Record<string, unknown>): string | undefined {
  const preferredKeys = [
    'license_number',
    'student_id',
    'document_number',
    'id',
    'given_name',
    'family_name',
    'name',
  ]

  for (const key of preferredKeys) {
    const value = attributes[key]
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return key
    }
  }

  for (const [key, value] of Object.entries(attributes)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return key
    }
  }

  return undefined
}

export function filterAndMapSdJwtKeys(sdJwtVcPayload: Record<string, unknown>) {
  type SdJwtVcPayload = {
    iss: string
    cnf: Record<string, unknown>
    vct: string
    iat?: number
    nbf?: number
    exp?: number
    [key: string]: unknown
  }
  // TODO: We should map these claims to nice format and names
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _sd_alg, _sd_hash, iss, vct, cnf, iat, exp, nbf, ...visibleProperties } = sdJwtVcPayload as SdJwtVcPayload

  const cnfObj = cnf && typeof cnf === 'object' ? (cnf as Record<string, unknown>) : undefined
  const holder =
    typeof cnfObj?.kid === 'string'
      ? cnfObj.kid
      : cnfObj?.jwk
        ? safeCalculateJwkThumbprint(cnfObj.jwk as JwkJson)
        : undefined
  const credentialMetadata: CredentialMetadata = {
    type: vct,
    issuer: iss,
    holder,
  }

  if (iat) {
    credentialMetadata.issuedAt = formatDate(new Date(iat * 1000))
  }
  if (exp) {
    credentialMetadata.validUntil = formatDate(new Date(exp * 1000))
  }
  if (nbf) {
    credentialMetadata.validFrom = formatDate(new Date(nbf * 1000))
  }

  return {
    visibleProperties: Object.fromEntries(
      Object.entries(visibleProperties).map(([key, value]) => [key, recursivelyMapAttribues(value)])
    ),
    metadata: credentialMetadata,
    raw: {
      issuedAt: iat ? new Date(iat * 1000) : undefined,
      validUntil: exp ? new Date(exp * 1000) : undefined,
      validFrom: nbf ? new Date(nbf * 1000) : undefined,
    },
  }
}

export function getCredentialForDisplay(
  credentialRecord:
    | W3cCredentialRecord
    | SdJwtVcRecord
    | MdocRecord
    | OpenBadgeCredentialRecord
    | JsonLdCredentialRecord
): W3cCredentialDisplay {
  const recordType = (credentialRecord as { type?: string })?.type
  if (recordType === 'OpenBadgeCredentialRecord' || recordType === 'JsonLdCredentialRecord') {
    // Both record types store `credential` as raw JSON without class-validator.
    // OpenBadgeCredentialRecord is for OBv3 badges; JsonLdCredentialRecord is
    // our generic W3C JSON-LD container. Display logic is identical — we read
    // the credential JSON.
    // String-check (rather than `instanceof`) so this works even when Metro
    // bundles two copies of `OpenBadgeCredentialRecord` (one per workspace).
    const rawRecord = credentialRecord as OpenBadgeCredentialRecord | JsonLdCredentialRecord
    const credential = ((rawRecord as { credential?: unknown }).credential ?? {}) as W3cCredentialJson
    const openId4VcMetadata = getOpenId4VcCredentialMetadata(credentialRecord)
    const issuerDisplay = getW3cIssuerDisplay(credential, openId4VcMetadata)
    const credentialDisplay = getW3cCredentialDisplay(credential, openId4VcMetadata)

    const credentialAttributes = Array.isArray(credential.credentialSubject)
      ? credential.credentialSubject[0] ?? {}
      : credential.credentialSubject

    // Tolerant date extraction — v1 vs v2.
    const credentialJsonV2 = credential as W3cCredentialJson & {
      validFrom?: string
      validUntil?: string
    }
    const issuedAtRaw = credential.issuanceDate ?? credentialJsonV2.validFrom
    const validUntilRaw = credentialJsonV2.validUntil ?? credential.expiryDate
    const validFromRaw = credentialJsonV2.validFrom ?? credential.issuanceDate

    const types = credential.type ?? []
    const issuerId = typeof credential.issuer === 'string' ? credential.issuer : credential.issuer?.id

    const idPrefix = recordType === 'OpenBadgeCredentialRecord' ? 'open-badge' : 'json-ld'
    return {
      id: `${idPrefix}-${rawRecord.id}` as CredentialForDisplayId,
      createdAt: rawRecord.createdAt,
      display: {
        ...credentialDisplay,
        issuer: issuerDisplay,
      },
      credential,
      attributes: credentialAttributes,
      metadata: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        holder: (credentialAttributes as any)?.id,
        issuer: issuerId ?? 'Unknown',
        type: types[types.length - 1] ?? 'Credential',
        issuedAt: issuedAtRaw ? formatDate(new Date(issuedAtRaw)) : undefined,
        validUntil: validUntilRaw ? formatDate(new Date(validUntilRaw)) : undefined,
        validFrom: undefined,
      } satisfies CredentialMetadata,
      // Synthetic claimFormat for raw-JSON JSON-LD records.
      claimFormat: ClaimFormat.LdpVc,
      validUntil: validUntilRaw ? new Date(validUntilRaw) : undefined,
      validFrom: validFromRaw ? new Date(validFromRaw) : undefined,
      credentialSubject: openId4VcMetadata?.credential.credential_subject,
    }
  }

  const isSdJwtRecord =
    credentialRecord instanceof SdJwtVcRecord ||
    recordType === 'SdJwtVcRecord' ||
    typeof (credentialRecord as { compactSdJwtVc?: unknown })?.compactSdJwtVc === 'string'

  if (isSdJwtRecord) {
    const sdJwtRecord = credentialRecord as SdJwtVcRecord

    // FIXME: we should probably add a decode method on the SdJwtVcRecord
    // as you now need the agent context to decode the sd-jwt vc, while that's
    // not really needed
    const { disclosures, jwt } = decodeSdJwtSync(sdJwtRecord.compactSdJwtVc, (data, alg) => Hasher.hash(data, alg))
    const decodedPayload: Record<string, unknown> = getClaimsSync(jwt.payload, disclosures, (data, alg) =>
      Hasher.hash(data, alg)
    )

    const openId4VcMetadata = getOpenId4VcCredentialMetadata(credentialRecord)
    const issuerDisplay = getOpenId4VcIssuerDisplay(openId4VcMetadata)
    const credentialDisplay = getSdJwtCredentialDisplay(decodedPayload, openId4VcMetadata)

    const mapped = filterAndMapSdJwtKeys(decodedPayload)
    const payloadIssuer = typeof decodedPayload.iss === 'string' ? decodedPayload.iss : undefined
    const payloadIssuerHost = getHostNameSafe(payloadIssuer)

    const resolvedIssuerDisplay = {
      ...issuerDisplay,
      name: issuerDisplay.name !== 'Unknown' ? issuerDisplay.name : payloadIssuerHost || 'Unknown',
      domain: issuerDisplay.domain ?? payloadIssuerHost,
    }
    const resolvedCredentialDisplay = {
      ...credentialDisplay,
      primary_overlay_attribute:
        credentialDisplay.primary_overlay_attribute || choosePrimaryOverlayAttribute(mapped.visibleProperties),
      logo: credentialDisplay.logo || resolvedIssuerDisplay.logo,
      description: credentialDisplay.description || (payloadIssuerHost ? `Issued by ${payloadIssuerHost}` : undefined),
    }

    return {
      id: `sd-jwt-vc-${sdJwtRecord.id}` satisfies CredentialForDisplayId,
      createdAt: sdJwtRecord.createdAt,
      display: {
        ...resolvedCredentialDisplay,
        issuer: resolvedIssuerDisplay,
      },
      attributes: mapped.visibleProperties,
      metadata: mapped.metadata,
      claimFormat: ClaimFormat.SdJwtVc,
      validUntil: mapped.raw.validUntil,
      validFrom: mapped.raw.validFrom,
      credentialSubject: openId4VcMetadata?.credential.credential_subject,
    }
  }

  if (credentialRecord instanceof MdocRecord) {
    const openId4VcMetadata = getOpenId4VcCredentialMetadata(credentialRecord)
    const issuerDisplay = getOpenId4VcIssuerDisplay(openId4VcMetadata)
    const credentialDisplay = getMdocCredentialDisplay({}, openId4VcMetadata)

    const mdocInstance = Mdoc.fromBase64Url(credentialRecord.base64Url)
    const attributes = Object.fromEntries(
      Object.values(mdocInstance.issuerSignedNamespaces).flatMap((v) =>
        Object.entries(v).map(([key, value]) => [key, recursivelyMapAttribues(value)])
      )
    )

    return {
      id: `mdoc-${credentialRecord.id}` satisfies CredentialForDisplayId,
      createdAt: credentialRecord.createdAt,
      display: {
        ...credentialDisplay,
        issuer: issuerDisplay,
      },
      attributes,
      // TODO:
      metadata: {
        // holder: 'Unknown',
        issuer: 'Unknown',
        type: mdocInstance.docType,
      } satisfies CredentialMetadata,
      claimFormat: ClaimFormat.MsoMdoc,
      validUntil: mdocInstance.validityInfo.validUntil,
      validFrom: mdocInstance.validityInfo.validFrom,
      credentialSubject: openId4VcMetadata?.credential.credential_subject,
    }
  }

  const w3cRecord = credentialRecord as W3cCredentialRecord
  const credential = JsonTransformer.toJSON(
    w3cRecord.credential.claimFormat === ClaimFormat.JwtVc
      ? w3cRecord.credential.credential
      : w3cRecord.credential
  ) as W3cCredentialJson

  const openId4VcMetadata = getOpenId4VcCredentialMetadata(credentialRecord)
  const issuerDisplay = getW3cIssuerDisplay(credential, openId4VcMetadata)
  const credentialDisplay = getW3cCredentialDisplay(credential, openId4VcMetadata)

  // to be implimented later support credential with multiple subjects
  const credentialAttributes = Array.isArray(credential.credentialSubject)
    ? credential.credentialSubject[0] ?? {}
    : credential.credentialSubject

  return {
    id: `w3c-credential-${credentialRecord.id}` satisfies CredentialForDisplayId,
    createdAt: credentialRecord.createdAt,
    display: {
      ...credentialDisplay,
      issuer: issuerDisplay,
    },
    credential,
    attributes: credentialAttributes,
    metadata: {
      holder: w3cRecord.credential.credentialSubjectIds[0],
      issuer: w3cRecord.credential.issuerId,
      type: w3cRecord.credential.type[w3cRecord.credential.type.length - 1],
      issuedAt: formatDate(new Date(w3cRecord.credential.issuanceDate)),
      validUntil: w3cRecord.credential.expirationDate
        ? formatDate(new Date(w3cRecord.credential.expirationDate))
        : undefined,
      validFrom: undefined,
    } satisfies CredentialMetadata,
    claimFormat: w3cRecord.credential.claimFormat,
    validUntil: w3cRecord.credential.expirationDate
      ? new Date(w3cRecord.credential.expirationDate)
      : undefined,
    validFrom: w3cRecord.credential.issuanceDate
      ? new Date(w3cRecord.credential.issuanceDate)
      : undefined,
    credentialSubject: openId4VcMetadata?.credential.credential_subject,
  }
}

type MappedAttributesReturnType =
  | string
  | number
  | boolean
  | { [key: string]: MappedAttributesReturnType }
  | null
  | undefined
  | Array<MappedAttributesReturnType>
export function recursivelyMapAttribues(value: unknown): MappedAttributesReturnType {
  if (value instanceof Uint8Array) {
    const imageMimeType = detectImageMimeType(value)
    if (imageMimeType) {
      return `data:${imageMimeType};base64,${TypedArrayEncoder.toBase64(value)}`
    }

    // TODO: what to do with a buffer that is not an image?
    return TypedArrayEncoder.toUtf8String(value)
  }
  if (value === null || value === undefined || typeof value === 'number' || typeof value === 'boolean') return value

  if (value instanceof Date || (typeof value === 'string' && isDateString(value))) {
    // TODO: handle DateOnly (should be handled as time is 0 then)
    return formatDate(value)
  }
  if (typeof value === 'string') return value
  if (value instanceof Map) {
    return Object.fromEntries(Array.from(value.entries()).map(([key, value]) => [key, recursivelyMapAttribues(value)]))
  }
  if (Array.isArray(value)) return value.map(recursivelyMapAttribues)

  return Object.fromEntries(Object.entries(value).map(([key, value]) => [key, recursivelyMapAttribues(value)]))
}
