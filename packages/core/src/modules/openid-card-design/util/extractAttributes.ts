// Pull a flat set of attribute paths out of any wallet-stored credential.
// Used by the design registry's shape matcher (see ../registry/designRegistry.ts).
//
// Returns:
//   - attrs: Set of dotted attribute paths (e.g. 'license_number', 'achievement.name')
//   - format: which OID4VCI/OID4VP format the credential is in
//   - types: the credential's `type` array (used by JSON-LD/OpenBadge match specs)
//   - configId: credentialConfigurationId hint from OID4VCI metadata
//
// We intentionally do NOT use getCredentialForDisplay() — that resolves
// display-side things we don't care about and is more expensive. We just
// decode the raw credential payload and walk the keys.

import {
  Hasher,
  JsonTransformer,
  Mdoc,
  MdocRecord,
  SdJwtVcRecord,
  W3cCredentialRecord,
  ClaimFormat,
} from '@credo-ts/core'
import { decodeSdJwtSync, getClaimsSync } from '@sd-jwt/decode'
import { OpenBadgeCredentialRecord } from '@ajna-inc/openbadges'

import { JsonLdCredentialRecord } from '../../openid/jsonLd/JsonLdCredentialRecord'
import { getOpenId4VcCredentialMetadata } from '../../openid/metadata'
import { CredentialFormatKey } from '../types'

export type SupportedCredentialRecord =
  | W3cCredentialRecord
  | SdJwtVcRecord
  | MdocRecord
  | OpenBadgeCredentialRecord
  | JsonLdCredentialRecord

export interface NormalizedCredentialClaims {
  attrs: Set<string>
  format: CredentialFormatKey | null
  types: string[]
  configId?: string
}

// SD-JWT JOSE / status / disclosure keys — never user attributes.
const SDJWT_RESERVED = new Set([
  '_sd',
  '_sd_alg',
  'vct',
  'iss',
  'iat',
  'exp',
  'nbf',
  'cnf',
  'sub',
  'jti',
  'status',
])

// JSON-LD keys we don't want polluting the attribute set.
const JSONLD_RESERVED = new Set(['id', 'type', '@context'])

function recordType(record: SupportedCredentialRecord): string {
  return (record as { type?: string }).type ?? record.constructor.name
}

function walkObject(obj: unknown, prefix: string, out: Set<string>, reserved: Set<string>): void {
  if (obj === null || obj === undefined) return
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    if (prefix) out.add(prefix)
    return
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (reserved.has(key)) continue
    const path = prefix ? `${prefix}.${key}` : key
    out.add(path)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      walkObject(value, path, out, reserved)
    }
  }
}

function extractSdJwt(record: SdJwtVcRecord): { attrs: Set<string>; format: CredentialFormatKey } {
  const attrs = new Set<string>()
  try {
    const { disclosures, jwt } = decodeSdJwtSync(record.compactSdJwtVc, (data, alg) => Hasher.hash(data, alg))
    const payload = getClaimsSync(jwt.payload, disclosures, (data, alg) => Hasher.hash(data, alg))
    walkObject(payload, '', attrs, SDJWT_RESERVED)
  } catch {
    // payload undecodable — leave attrs empty so the matcher falls through.
  }
  return { attrs, format: 'vc+sd-jwt' }
}

function extractMdoc(record: MdocRecord): { attrs: Set<string>; format: CredentialFormatKey } {
  const attrs = new Set<string>()
  try {
    const mdoc = Mdoc.fromBase64Url(record.base64Url)
    for (const namespace of Object.values(mdoc.issuerSignedNamespaces)) {
      for (const key of Object.keys(namespace as Record<string, unknown>)) {
        attrs.add(key)
      }
    }
  } catch {
    // fallthrough
  }
  return { attrs, format: 'mso_mdoc' }
}

interface W3cExtraction {
  attrs: Set<string>
  types: string[]
  format: CredentialFormatKey
}

function extractFromJsonCredential(credentialJson: any, defaultFormat: CredentialFormatKey): W3cExtraction {
  const attrs = new Set<string>()
  const types: string[] = []

  if (Array.isArray(credentialJson?.type)) {
    for (const t of credentialJson.type) {
      if (typeof t === 'string') types.push(t)
    }
  } else if (typeof credentialJson?.type === 'string') {
    types.push(credentialJson.type)
  }

  const subject = Array.isArray(credentialJson?.credentialSubject)
    ? credentialJson.credentialSubject[0]
    : credentialJson?.credentialSubject
  if (subject && typeof subject === 'object') {
    walkObject(subject, '', attrs, JSONLD_RESERVED)
  }

  return { attrs, types, format: defaultFormat }
}

function extractW3c(record: W3cCredentialRecord): W3cExtraction {
  const credential = JsonTransformer.toJSON(
    record.credential.claimFormat === ClaimFormat.JwtVc ? record.credential.credential : record.credential
  )
  const fmt: CredentialFormatKey = record.credential.claimFormat === ClaimFormat.JwtVc ? 'jwt_vc_json' : 'ldp_vc'
  return extractFromJsonCredential(credential, fmt)
}

function extractOpenBadgeOrJsonLd(
  record: OpenBadgeCredentialRecord | JsonLdCredentialRecord,
  isOpenBadge: boolean
): W3cExtraction {
  const credential = (record as { credential?: unknown }).credential ?? {}
  return extractFromJsonCredential(credential, isOpenBadge ? 'openbadge_v3' : 'ldp_vc')
}

export function getNormalizedClaims(record: SupportedCredentialRecord): NormalizedCredentialClaims {
  const type = recordType(record)
  const configId = getOpenId4VcCredentialMetadata(record as any)?.credentialConfigurationId

  if (record instanceof SdJwtVcRecord || type === 'SdJwtVcRecord') {
    const { attrs, format } = extractSdJwt(record as SdJwtVcRecord)
    return { attrs, format, types: [], configId }
  }

  if (record instanceof MdocRecord || type === 'MdocRecord') {
    const { attrs, format } = extractMdoc(record as MdocRecord)
    return { attrs, format, types: [], configId }
  }

  if (type === 'OpenBadgeCredentialRecord') {
    const { attrs, types, format } = extractOpenBadgeOrJsonLd(record as OpenBadgeCredentialRecord, true)
    return { attrs, format, types, configId }
  }

  if (type === 'JsonLdCredentialRecord') {
    const { attrs, types, format } = extractOpenBadgeOrJsonLd(record as JsonLdCredentialRecord, false)
    return { attrs, format, types, configId }
  }

  // Default: W3cCredentialRecord (Credo's JSON-LD / JWT VC path).
  const { attrs, types, format } = extractW3c(record as W3cCredentialRecord)
  return { attrs, format, types, configId }
}
