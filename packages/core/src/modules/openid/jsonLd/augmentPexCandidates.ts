/*
 * Augment Credo's `DifPexCredentialsForRequest` with our JSON-LD records.
 *
 * Credo 0.5's PEX engine only matches against W3cCredentialRecord /
 * SdJwtVcRecord / MdocRecord. Anything we persist via
 * JsonLdCredentialRecord (generic W3C JSON-LD) or OpenBadgeCredentialRecord
 * (OBv3) is invisible to it. This helper walks the presentation
 * definition, runs each input_descriptor against our records, and injects
 * the matches into the `submissionEntry.verifiableCredentials` lists.
 *
 * After augmentation, the existing selection UI works unchanged — every
 * verifiableCredentials entry has `{ type, credentialRecord }` and
 * `getCredentialForDisplay` already branches on JsonLd / OpenBadge record
 * types. Down at share-time, the resolverProof bridge detects whether the
 * selected credentialRecord is one of ours and routes to the JSON-LD VP
 * path (`shareJsonLdPresentation`).
 */

import {
  Agent,
  ClaimFormat,
  type DifPexCredentialsForRequest,
} from '@credo-ts/core'
import {
  OpenBadgeCredentialRecord,
  OpenBadgeCredentialRepository,
} from '@ajna-inc/openbadges'

import { JsonLdCredentialRecord } from './JsonLdCredentialRecord'
import { JsonLdCredentialRepository } from './JsonLdCredentialRepository'
import { credentialMatchesDescriptor, acceptsLdpVp, type InputDescriptor } from './matchInputDescriptor'

interface AugmentArgs {
  agent: Agent
  credentialsForRequest: DifPexCredentialsForRequest
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  presentationDefinition: any
}

/**
 * Pull every JsonLdCredentialRecord + OpenBadgeCredentialRecord we have stored.
 *
 * Errors from either repo are tolerated — if e.g. the openbadges module isn't
 * registered (older agent), we still augment from the JsonLd side, and vice
 * versa.
 */
async function loadAllJsonLdRecords(
  agent: Agent
): Promise<Array<JsonLdCredentialRecord | OpenBadgeCredentialRecord>> {
  const out: Array<JsonLdCredentialRecord | OpenBadgeCredentialRecord> = []
  try {
    const jsonLdRepo = agent.dependencyManager.resolve(JsonLdCredentialRepository)
    const records = await jsonLdRepo.getAll(agent.context)
    out.push(...records)
  } catch {
    // ignored
  }
  try {
    const openbadges = (agent.modules as Record<string, unknown>).openbadges as
      | { getAllCredentials?: () => Promise<OpenBadgeCredentialRecord[]> }
      | undefined
    if (openbadges?.getAllCredentials) {
      const records = await openbadges.getAllCredentials()
      out.push(...records)
    } else {
      const openbadgesRepo = agent.dependencyManager.resolve(OpenBadgeCredentialRepository)
      const records = await openbadgesRepo.getAll(agent.context)
      out.push(...records)
    }
  } catch {
    // ignored
  }
  return out
}

/**
 * Build a synthetic `SubmissionEntryCredential` for a JsonLd/OpenBadge record.
 *
 * Credo's `SubmissionEntryCredential` union doesn't include these record
 * classes, so we cast through `unknown`. The downstream display code reads
 * `credentialRecord.type` to branch into our handlers, and the share-time
 * bridge does the same to route into `shareJsonLdPresentation`.
 */
function asSyntheticSubmissionEntry(
  record: JsonLdCredentialRecord | OpenBadgeCredentialRecord
): unknown {
  return {
    type: ClaimFormat.LdpVc,
    credentialRecord: record,
  }
}

export async function augmentCandidatesWithJsonLd({
  agent,
  credentialsForRequest,
  presentationDefinition,
}: AugmentArgs): Promise<DifPexCredentialsForRequest> {
  const inputDescriptors = (presentationDefinition?.input_descriptors as InputDescriptor[] | undefined) ?? []
  if (inputDescriptors.length === 0) return credentialsForRequest

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalFormat = presentationDefinition?.format as Record<string, unknown> | undefined

  const allRecords = await loadAllJsonLdRecords(agent)
  agent.config.logger.info(
    `[OID4VP-pex] augmenter loaded ${allRecords.length} JSON-LD / OpenBadge record(s); ${inputDescriptors.length} input_descriptor(s) in request`
  )
  if (allRecords.length === 0) return credentialsForRequest

  // descriptorId → matching records
  const matchedByDescriptor = new Map<string, Array<JsonLdCredentialRecord | OpenBadgeCredentialRecord>>()
  for (const descriptor of inputDescriptors) {
    if (!acceptsLdpVp(descriptor, globalFormat)) {
      agent.config.logger.info(
        `[OID4VP-pex] descriptor "${descriptor.id}" does not accept ldp_vp/ldp_vc — skipping augment`
      )
      continue
    }
    const matches: Array<JsonLdCredentialRecord | OpenBadgeCredentialRecord> = []
    for (const record of allRecords) {
      const credential = (record as { credential?: unknown }).credential
      if (!credential || typeof credential !== 'object') continue
      if (credentialMatchesDescriptor(credential as Record<string, unknown>, descriptor)) {
        matches.push(record)
      }
    }
    agent.config.logger.info(
      `[OID4VP-pex] descriptor "${descriptor.id}": ${matches.length} match(es) of ${allRecords.length} candidates`
    )
    if (matches.length > 0) {
      matchedByDescriptor.set(descriptor.id, matches)
    }
  }

  if (matchedByDescriptor.size === 0) return credentialsForRequest

  agent.config.logger.info(
    `[OID4VP-pex] Credo's initial PEX result: areRequirementsSatisfied=${credentialsForRequest.areRequirementsSatisfied}, ` +
      `requirements.length=${credentialsForRequest.requirements?.length ?? 'undefined'}, ` +
      `first requirement submissionEntry.length=${
        credentialsForRequest.requirements?.[0]?.submissionEntry?.length ?? 'n/a'
      }, ` +
      `first entry inputDescriptorId=${credentialsForRequest.requirements?.[0]?.submissionEntry?.[0]?.inputDescriptorId ?? 'n/a'}`
  )

  // Walk Credo's existing structure and inject matches into the right entries.
  // If a descriptor's `submissionEntry` doesn't already exist (because Credo
  // didn't generate any candidates), we still augment via the existing
  // requirements that reference its id.
  const augmentedRequirements = credentialsForRequest.requirements.map((requirement) => {
    let newlySatisfied = false
    const newEntries = requirement.submissionEntry.map((entry) => {
      const newRecords = matchedByDescriptor.get(entry.inputDescriptorId)
      if (!newRecords) return entry
      const existingIds = new Set(entry.verifiableCredentials.map((c) => c.credentialRecord.id))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newVcs: any[] = [...entry.verifiableCredentials]
      for (const record of newRecords) {
        if (existingIds.has(record.id)) continue
        newVcs.push(asSyntheticSubmissionEntry(record))
      }
      const becameSatisfied = entry.verifiableCredentials.length === 0 && newVcs.length > 0
      if (becameSatisfied) newlySatisfied = true
      return {
        ...entry,
        verifiableCredentials: newVcs,
      }
    })
    const allSatisfiedNow = newEntries.every((e) => e.verifiableCredentials.length > 0)
    return {
      ...requirement,
      submissionEntry: newEntries,
      isRequirementSatisfied: requirement.isRequirementSatisfied || allSatisfiedNow || newlySatisfied,
    }
  })

  const allRequirementsSatisfied = augmentedRequirements.every((r) => r.isRequirementSatisfied)

  // Credo's PEX may return `requirements: []` when no native records match.
  // In that case our augmenter's `requirements.map` produces an empty array
  // too — even though we have matches — and the UI sees no candidates. Build
  // a synthetic requirements entry from the matches so the screen renders.
  let finalRequirements = augmentedRequirements
  if (finalRequirements.length === 0 && matchedByDescriptor.size > 0) {
    const syntheticEntries: unknown[] = []
    for (const [descriptorId, records] of matchedByDescriptor.entries()) {
      syntheticEntries.push({
        inputDescriptorId: descriptorId,
        name: inputDescriptors.find((d) => d.id === descriptorId)?.name,
        purpose: inputDescriptors.find((d) => d.id === descriptorId)?.purpose,
        verifiableCredentials: records.map((record) => asSyntheticSubmissionEntry(record)),
      })
    }
    finalRequirements = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {
        isRequirementSatisfied: true,
        submissionEntry: syntheticEntries,
        needsCount: syntheticEntries.length,
        rule: 'all',
      } as never,
    ]
    agent.config.logger.info(
      `[OID4VP-pex] Credo returned empty requirements — synthesised 1 requirement with ${syntheticEntries.length} entry/entries`
    )
  }

  const finalAreSatisfied =
    credentialsForRequest.areRequirementsSatisfied ||
    allRequirementsSatisfied ||
    (finalRequirements !== augmentedRequirements && finalRequirements.length > 0)

  agent.config.logger.info(
    `[OID4VP-pex] augmenter done: finalRequirements.length=${finalRequirements.length}, ` +
      `finalAreRequirementsSatisfied=${finalAreSatisfied}, ` +
      `entries-with-creds=${finalRequirements
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r.submissionEntry.map((e: any) => e.verifiableCredentials.length).join(','))
        .join('|')}`
  )

  return {
    ...credentialsForRequest,
    requirements: finalRequirements,
    areRequirementsSatisfied: finalAreSatisfied,
  }
}
