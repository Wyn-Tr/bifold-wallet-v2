/*
 * Generic W3C JSON-LD credential record.
 *
 * We can't use Credo 0.5's `W3cCredentialRecord` for credentials that are
 * (a) VC v2 (`@context: https://www.w3.org/ns/credentials/v2`, `validFrom`)
 *     or
 * (b) signed with `DataIntegrityProof` (any cryptosuite).
 *
 * Credo 0.5 hardcodes the v1 context as the required first `@context` entry
 * and requires `issuanceDate` (RFC 3339), and its `SignatureSuiteRegistry`
 * doesn't know about `DataIntegrityProof`. Both checks fire inside
 * `W3cJsonLdVerifiableCredential.fromJson(...)` which is called by Credo's
 * OID4VCI holder when receiving a credential.
 *
 * This record bypasses all of that by storing the credential as **raw JSON**
 * with no class-validator decorators. It's the appropriate home for any W3C
 * JSON-LD credential that isn't an OBv3 badge — Veres playground's
 * AlumniCredential, RetailCredential, CertificateOfNaturalizationCredential,
 * PermanentResidentCardCredential, etc.
 *
 * OBv3 badges still go to `@ajna-inc/openbadges` `OpenBadgeCredentialRecord`
 * because that record carries OBv3-specific fields (`derived`, `jwt`,
 * `sourceUrl`, etc.) and matches the semantic intent.
 */

import { BaseRecord, type TagsBase, utils } from '@credo-ts/core'

export interface JsonLdCredentialJson {
  '@context': string | Array<string | Record<string, unknown>>
  type: string[]
  issuer: string | { id?: string; [key: string]: unknown }
  // v1 fields
  issuanceDate?: string
  expirationDate?: string
  // v2 fields
  validFrom?: string
  validUntil?: string
  credentialSubject: Record<string, unknown> | Array<Record<string, unknown>>
  proof?: Record<string, unknown> | Array<Record<string, unknown>>
  [key: string]: unknown
}

export interface JsonLdCredentialRecordProps {
  id?: string
  createdAt?: Date
  updatedAt?: Date
  credential: JsonLdCredentialJson
  /** Was the proof verified at receive time? `false` means we accepted
   * unverified (e.g. cryptosuite not yet supported). `true` means signature
   * passed. `undefined` for older records that didn't track. */
  verified?: boolean
  tags?: TagsBase
}

export class JsonLdCredentialRecord extends BaseRecord {
  public static readonly type = 'JsonLdCredentialRecord'
  public readonly type = JsonLdCredentialRecord.type

  // The credential JSON is stored as a plain property — no class-validator
  // decorators — so v1, v2, and any cryptosuite all round-trip cleanly.
  public credential!: JsonLdCredentialJson
  public verified?: boolean

  public constructor(props?: JsonLdCredentialRecordProps) {
    super()
    if (props) {
      this.id = props.id ?? utils.uuid()
      this.createdAt = props.createdAt ?? new Date()
      this.updatedAt = props.updatedAt ?? new Date()
      this.credential = props.credential
      this.verified = props.verified
      this._tags = props.tags ?? {}
    }
  }

  public getTags() {
    const cred = this.credential as JsonLdCredentialJson | undefined
    const issuerId = typeof cred?.issuer === 'string' ? cred.issuer : cred?.issuer?.id
    // Use the credential's `id` (if set) as a credentialId tag for query/find.
    const credentialId = (cred as { id?: string } | undefined)?.id
    const subject = Array.isArray(cred?.credentialSubject)
      ? cred?.credentialSubject[0]
      : cred?.credentialSubject
    const subjectId = (subject as { id?: string } | undefined)?.id
    return {
      ...this._tags,
      credentialId,
      issuerId,
      subjectId,
    }
  }
}
