import { ClaimFormat, type DifPexCredentialsForRequest } from '@credo-ts/core'

import { type CredentialMetadata, type DisplayImage, filterAndMapSdJwtKeys, getCredentialForDisplay } from './display'

export interface FormattedSubmission {
  name: string
  purpose?: string
  areAllSatisfied: boolean
  entries: FormattedSubmissionEntry[]
}

export type FormattedSelectedCredentialEntry = {
  id: string
  credentialName: string
  issuerName?: string
  requestedAttributes?: string[]
  disclosedPayload?: Record<string, unknown>
  metadata?: CredentialMetadata
  backgroundColor?: string
  backgroundImage?: DisplayImage
  textColor?: string
  claimFormat: ClaimFormat | 'AnonCreds'
}

export interface FormattedSubmissionEntry {
  /** can be either AnonCreds groupName or PEX inputDescriptorId */
  inputDescriptorId: string
  isSatisfied: boolean

  name: string
  purpose?: string
  description?: string

  credentials: Array<FormattedSelectedCredentialEntry>
}

export function formatDifPexCredentialsForRequest(
  credentialsForRequest: DifPexCredentialsForRequest
): FormattedSubmission {
  const entries = credentialsForRequest.requirements.flatMap((requirement) => {
    return requirement.submissionEntry.map((submission): FormattedSubmissionEntry => {
      const credentials = submission.verifiableCredentials.map((verifiableCredential) => {
        const { display, attributes, metadata, claimFormat } = getCredentialForDisplay(
          verifiableCredential.credentialRecord
        )

        let disclosedPayload = attributes
        if (verifiableCredential.type === ClaimFormat.SdJwtVc) {
          disclosedPayload = filterAndMapSdJwtKeys(verifiableCredential.disclosedPayload).visibleProperties
        } else if (verifiableCredential.type === ClaimFormat.MsoMdoc) {
          disclosedPayload = Object.fromEntries(
            Object.values(verifiableCredential.disclosedPayload).flatMap((entry) => Object.entries(entry))
          )
        }

        return {
          id: verifiableCredential.credentialRecord.id,
          credentialName: display.name,
          issuerName: display.issuer.name,
          requestedAttributes: [...Object.keys(disclosedPayload)],
          disclosedPayload,
          metadata,
          backgroundColor: display.backgroundColor,
          textColor: display.textColor,
          backgroundImage: display.backgroundImage,
          claimFormat,
        }
      })

      // Fall back to the first matched credential's display name when the
      // verifier didn't label the descriptor — common with VC Playground
      // (descriptors carry only `purpose`, no `name`). Showing "Unknown" as
      // the card header in that case is confusing.
      const fallbackName = credentials[0]?.credentialName
      return {
        inputDescriptorId: submission.inputDescriptorId,
        name: submission.name ?? fallbackName ?? 'Unknown',
        purpose: submission.purpose,
        description: submission.purpose,
        isSatisfied: submission.verifiableCredentials.length >= 1,
        credentials,
      }
    })
  })

  const topLevelFallback = entries[0]?.credentials[0]?.credentialName
  return {
    areAllSatisfied: entries.every((entry) => entry.isSatisfied),
    name: credentialsForRequest.name ?? topLevelFallback ?? 'Unknown',
    purpose: credentialsForRequest.purpose,
    entries,
  }
}
