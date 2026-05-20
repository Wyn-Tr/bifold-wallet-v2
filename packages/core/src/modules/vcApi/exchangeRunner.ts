/*
 * VC-API exchange runner — minimal client for the VC Playground exchange protocol.
 *
 * Spec: https://vcplayground.org/docs/chapi/wallets/exchanges/
 *
 * Loop:
 *   POST {} (or a signed VP) → exchange URL
 *   inspect response:
 *     - empty                            → done
 *     - { redirectUrl }                  → done, navigate user
 *     - { verifiablePresentation }       → an issued credential is being delivered
 *     - { verifiablePresentationRequest } → server requests a presentation; build & POST signed VP
 *
 * Issuance path (verifiablePresentation in response) is fully implemented: the
 * inner credential JSON is verified via @ajna-inc/openbadges and persisted as
 * OpenBadgeCredentialRecord.
 *
 * Presentation path (request → response) is acknowledged but reports
 * "unsupported" today — it requires QueryByExample matching across all wallet
 * record types and signed VP construction with a holder-bound key. Follow-up.
 */

import { Agent, DidsApi, getKeyFromVerificationMethod } from '@credo-ts/core'
import {
  EddsaRdfc2022Cryptosuite,
  OpenBadgeCredentialRecord,
  OpenBadgeCredentialRepository,
} from '@ajna-inc/openbadges'
import { installJsonLdRnLoader } from '../openid/jsonLd/jsonldRnPolyfill'

export type VcApiExchangeOutcome =
  | { kind: 'received-credential'; record: OpenBadgeCredentialRecord }
  | { kind: 'redirect'; url: string }
  | { kind: 'done' }
  | { kind: 'unsupported-presentation-request'; details: Record<string, unknown> }
  | { kind: 'error'; message: string }

interface ExchangeStep {
  exchangeUrl: string
  body?: Record<string, unknown>
}

async function postExchange(step: ExchangeStep): Promise<Record<string, unknown> | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  try {
    const response = await fetch(step.exchangeUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(step.body ?? {}),
      signal: controller.signal,
    })
    if (!response.ok) {
      // Be permissive: VC API specifies 4xx with JSON error bodies but some
      // servers return 204 No Content for empty / final states.
      if (response.status === 204) return null
      const text = await response.text().catch(() => '')
      throw new Error(`HTTP ${response.status}: ${text}`.trim())
    }
    const text = await response.text()
    if (!text) return null
    return JSON.parse(text) as Record<string, unknown>
  } finally {
    clearTimeout(timer)
  }
}

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
    // Credo returns `Key.fingerprint` as the multibase/multicodec form expected
    // by the cryptosuite verifier. This also covers did:key Ed25519 VMs that use
    // `publicKeyBase58` (Ed25519VerificationKey2018), not `publicKeyMultibase`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (key as any).fingerprint as string
  } catch {
    return null
  }
}

/**
 * Persist an inner credential JSON. Verifies via EddsaRdfc2022Cryptosuite
 * directly (bypassing OpenBadgesApi.verify, which limits the JSON-LD document
 * loader to 4 cached contexts and breaks on external `@context` references).
 */
async function ingestCredentialJson(
  agent: Agent,
  credentialJson: Record<string, unknown>
): Promise<OpenBadgeCredentialRecord> {
  installJsonLdRnLoader()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proof = (credentialJson as any).proof
  if (!proof) throw new Error('VC-API credential has no proof')

  const proofs: Array<Record<string, unknown>> = Array.isArray(proof) ? proof : [proof]
  const cryptosuite = new EddsaRdfc2022Cryptosuite()
  let verified = false
  for (const p of proofs) {
    if (!cryptosuite.matchProof(p)) continue
    const vmId = p.verificationMethod as string | undefined
    if (!vmId) throw new Error('VC-API proof missing verificationMethod')
    const publicKeyMultibase = await resolvePublicKeyMultibase(agent, vmId)
    if (!publicKeyMultibase) throw new Error(`Could not resolve publicKeyMultibase for ${vmId}`)
    const result = await cryptosuite.verify({
      document: credentialJson,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      proof: p as any,
      publicKeyMultibase,
      useNetworkContexts: true,
    })
    if (!result.verified) {
      throw new Error(`VC-API credential proof verification failed: ${result.error ?? 'unknown'}`)
    }
    verified = true
    break
  }
  if (!verified) {
    throw new Error('No supported DataIntegrityProof (eddsa-rdfc-2022) on VC-API credential')
  }

  const record = new OpenBadgeCredentialRecord({ credential: credentialJson })
  await agent.dependencyManager.resolve(OpenBadgeCredentialRepository).save(agent.context, record)
  return record
}

interface RunOptions {
  agent: Agent
  exchangeUrl: string
  initialResponse?: Record<string, unknown> | null
}

export async function runVcApiExchange({
  agent,
  exchangeUrl,
  initialResponse,
}: RunOptions): Promise<VcApiExchangeOutcome> {
  try {
    let current = initialResponse ?? (await postExchange({ exchangeUrl }))
    let safetyCounter = 0

    // Bound the loop — VC-API exchanges shouldn't need many round-trips.
    while (current && safetyCounter < 5) {
      safetyCounter++

      // Some servers wrap the actual exchange under a top-level `protocols`
      // hint; if so, skip ahead to whichever surface we recognise.
      if ('redirectUrl' in current && typeof current.redirectUrl === 'string') {
        return { kind: 'redirect', url: current.redirectUrl }
      }

      if ('verifiablePresentation' in current) {
        // Server delivered a presentation containing one or more credentials.
        const vp = current.verifiablePresentation as Record<string, unknown>
        const vc = (vp.verifiableCredential ?? vp) as
          | Record<string, unknown>
          | Record<string, unknown>[]
        const first = Array.isArray(vc) ? vc[0] : vc
        if (!first) throw new Error('Server returned a presentation with no credential')
        const record = await ingestCredentialJson(agent, first as Record<string, unknown>)
        return { kind: 'received-credential', record }
      }

      if ('verifiablePresentationRequest' in current) {
        // Verifier flow — out of scope for this initial cut.
        return {
          kind: 'unsupported-presentation-request',
          details: current.verifiablePresentationRequest as Record<string, unknown>,
        }
      }

      // No actionable directive — try one more empty POST in case the server
      // is staged (e.g. waits for an initial body before pushing the credential).
      current = await postExchange({ exchangeUrl })
    }

    return { kind: 'done' }
  } catch (error) {
    return { kind: 'error', message: (error as Error)?.message ?? String(error) }
  }
}
