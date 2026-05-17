/*
 * Build and sign a JSON-LD Verifiable Presentation (ldp_vp) for an OID4VP
 * authorization request.
 *
 * Credo 0.5's W3cJsonLdCredentialService can't build VPs over VC v2 documents
 * or DataIntegrityProof-signed credentials. This module mirrors the issuance
 * bridge: take the raw credential JSON we stored as JsonLdCredentialRecord /
 * OpenBadgeCredentialRecord, wrap it in a `VerifiablePresentation` envelope,
 * and sign with the openbadges EddsaRdfc2022Cryptosuite via `signWithSigner`
 * (the suite hands us the canonicalised+hashed bytes; we sign them with
 * Credo's wallet using a freshly minted Ed25519 holder key).
 *
 * Ephemeral holder key per VP: privacy-preserving (no cross-presentation
 * correlation) and avoids surfacing a long-lived "presentation key" the user
 * has to manage.
 */

import {
  Agent,
  Buffer,
  DidKey,
  KeyBackend,
  KeyType,
  TypedArrayEncoder,
} from '@credo-ts/core'
import { EddsaRdfc2022Cryptosuite } from '@ajna-inc/openbadges'

import { installJsonLdRnLoader } from './jsonldRnPolyfill'

export interface JsonLdVpBuildOptions {
  agent: Agent
  /** Raw credential JSON objects to include in the presentation. */
  credentials: Array<Record<string, unknown>>
  /** OID4VP `nonce` from the authorization request — bound into the proof. */
  challenge: string
  /** OID4VP `client_id` (or `aud`) — bound into the proof. */
  domain: string
}

export interface JsonLdVpResult {
  /** The signed VP — caller serialises into `vp_token`. */
  presentation: Record<string, unknown>
  /** did:key URL of the holder key the VP was signed with. */
  holderDidUrl: string
}

const VC_V1_CONTEXT = 'https://www.w3.org/2018/credentials/v1'
const VC_V2_CONTEXT = 'https://www.w3.org/ns/credentials/v2'
const DATA_INTEGRITY_V2_CONTEXT = 'https://w3id.org/security/data-integrity/v2'

/**
 * Decide which contexts the VP envelope should declare.
 *
 * - Always pick the VC base context (v2 if any embedded credential is v2,
 *   else v1).
 * - Add the Data Integrity v2 context. VC v2 already covers the DI terms,
 *   but VC v1 doesn't — and some verifiers (Veres) strictly check the
 *   context graph rather than relying on the v2 inclusion. Adding it is
 *   harmless either way.
 */
function pickVpContexts(credentials: Array<Record<string, unknown>>): string[] {
  let base: string = VC_V1_CONTEXT
  for (const cred of credentials) {
    const ctx = (cred as { '@context'?: unknown })['@context']
    const ctxArr = Array.isArray(ctx) ? ctx : ctx ? [ctx] : []
    if (ctxArr.some((c) => c === VC_V2_CONTEXT)) {
      base = VC_V2_CONTEXT
      break
    }
  }
  return [base, DATA_INTEGRITY_V2_CONTEXT]
}

/**
 * Build + sign a Verifiable Presentation containing `credentials`.
 *
 * The holder key is a freshly minted Ed25519 in `did:key` form. The signer
 * function is wired to `agent.wallet.sign({ data, key })` — the cryptosuite
 * pre-hashes the canonicalised data, so what we sign is already SHA-256 of
 * (proofConfigHash || documentHash) per the spec, and our wallet just signs
 * that buffer with Ed25519 (no extra hashing).
 */
export async function buildJsonLdPresentation({
  agent,
  credentials,
  challenge,
  domain,
}: JsonLdVpBuildOptions): Promise<JsonLdVpResult> {
  if (credentials.length === 0) {
    throw new Error('buildJsonLdPresentation: no credentials provided')
  }

  installJsonLdRnLoader()

  const key = await agent.wallet.createKey({
    keyType: KeyType.Ed25519,
    keyBackend: KeyBackend.Software,
  })
  const didCreateResult = await agent.dids.create({
    method: 'key',
    options: { key },
  })
  if (didCreateResult.didState.state !== 'finished' || !didCreateResult.didState.did) {
    throw new Error('Holder did:key creation failed for VP signing')
  }

  const didKey = DidKey.fromDid(didCreateResult.didState.did)
  const verificationMethodId = `${didKey.did}#${didKey.key.fingerprint}`

  // Always emit `verifiableCredential` as an array. Spec says the field is
  // a "set of credentials", and several verifier implementations (Veres
  // among them) error out when it's a bare object even though that's also
  // technically valid JSON-LD.
  const presentation: Record<string, unknown> = {
    '@context': pickVpContexts(credentials),
    type: ['VerifiablePresentation'],
    holder: didKey.did,
    verifiableCredential: credentials,
  }

  const suite = new EddsaRdfc2022Cryptosuite()

  // Diagnostic: capture the exact bytes handed to wallet.sign and the
  // signature it returns, so we can locally verify whether Credo's signer
  // produced a valid Ed25519 signature over those bytes. If local verify
  // passes but Veres still rejects, the divergence is in canonicalisation
  // (Veres's loader vs ours). If local verify fails, Credo's wallet.sign
  // is the culprit.
  let lastSignedHashData: Uint8Array | undefined
  let lastSignature: Uint8Array | undefined

  const signed = await suite.signWithSigner({
    document: presentation,
    verificationMethodId,
    purpose: 'authentication',
    challenge,
    domain,
    useNetworkContexts: true,
    signer: async (data: Uint8Array): Promise<Uint8Array> => {
      lastSignedHashData = data
      const signature = await agent.context.wallet.sign({
        data: Buffer.from(data),
        key,
      })
      const sigBytes = new Uint8Array(signature)
      lastSignature = sigBytes
      return sigBytes
    },
  })

  // Canonicalisation cross-check: re-canonicalise the signed document with
  // a STRICT JSON-LD loader (no @protected stripping, no preprocessing) and
  // log the diff vs what openbadges canonicalised. If the strict run produces
  // different bytes than the preprocessing run, we have a concrete reason
  // Veres can't verify our signature — Veres reconstructs hashData from
  // canonical N-Quads, and the bytes it sees aren't the ones we signed.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const jsonldNs = require('@digitalcredentials/jsonld') as Record<string, unknown>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jld: any = (jsonldNs as any).default ?? jsonldNs

    const docCopyForCanon = { ...(signed as Record<string, unknown>) }
    delete docCopyForCanon.proof

    const strictLoader = async (url: string) => {
      const r = await fetch(url, { headers: { Accept: 'application/ld+json' } })
      if (!r.ok) throw new Error(`strict-fetch ${url} → ${r.status}`)
      return { contextUrl: null, document: await r.json(), documentUrl: url }
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createPreprocessingDocumentLoader } = require(
      '@ajna-inc/openbadges/build/cryptosuites/contextPreprocessor'
    ) as { createPreprocessingDocumentLoader: () => (url: string) => Promise<unknown> }
    const preprocessingLoader = createPreprocessingDocumentLoader()

    const [strictNq, preNq] = await Promise.all([
      jld.canonize(docCopyForCanon, {
        algorithm: 'URDNA2015',
        format: 'application/n-quads',
        documentLoader: strictLoader,
      }),
      jld.canonize(docCopyForCanon, {
        algorithm: 'URDNA2015',
        format: 'application/n-quads',
        documentLoader: preprocessingLoader,
      }),
    ])

    if (strictNq === preNq) {
      agent.config.logger.info(
        `[OID4VP-canon-check] strict==preprocessor (${strictNq.length} chars). If Veres still rejects, the divergence is on Veres' side, not ours.`
      )
    } else {
      agent.config.logger.warn(
        `[OID4VP-canon-check] MISMATCH between strict and preprocessor canonicalisation. ` +
          `strict.len=${strictNq.length}, preprocessor.len=${preNq.length}. ` +
          `This is the most likely cause of Veres' "Invalid signature".`
      )
      // Find the first differing region to make the diff actionable
      let i = 0
      while (i < Math.min(strictNq.length, preNq.length) && strictNq[i] === preNq[i]) i++
      agent.config.logger.warn(
        `[OID4VP-canon-check] first diff at offset ${i}: ` +
          `strict="${strictNq.slice(Math.max(0, i - 40), i + 80)}" ` +
          `pre="${preNq.slice(Math.max(0, i - 40), i + 80)}"`
      )
    }
  } catch (e) {
    agent.config.logger.warn(`[OID4VP-canon-check] threw: ${(e as Error)?.message ?? e}`)
  }

  // Self-verify the signature LOCALLY against the public key derived from
  // the holder did:key. This is a closed-loop check that bypasses
  // canonicalisation: if it fails, Credo's wallet.sign didn't produce a
  // valid Ed25519 signature for the key we think we used.
  try {
    // `key.publicKey` is the raw 32-byte Ed25519 public key on Credo's Key.
    const pubKey = (key as unknown as { publicKey: Uint8Array }).publicKey
    if (lastSignedHashData && lastSignature && pubKey) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ed = require('@stablelib/ed25519') as typeof import('@stablelib/ed25519')
      const ok = ed.verify(pubKey, lastSignedHashData, lastSignature)
      agent.config.logger.info(
        `[OID4VP-sign-check] local Ed25519 verify=${ok}, hashData.len=${lastSignedHashData.length}, sig.len=${lastSignature.length}, pubKey.len=${pubKey.length}, holderDidUrl=${verificationMethodId}`
      )
      if (!ok) {
        agent.config.logger.error(
          `[OID4VP-sign-check] FAILED — Credo's wallet.sign produced a signature that DOESN'T verify against the key's own public bytes. This is a Credo bug, not a Veres bug.`
        )
      }
    } else {
      agent.config.logger.warn(
        `[OID4VP-sign-check] missing pieces: hashData=${!!lastSignedHashData}, sig=${!!lastSignature}, pubKey=${!!pubKey}`
      )
    }
  } catch (e) {
    agent.config.logger.warn(
      `[OID4VP-sign-check] threw during local verify: ${(e as Error)?.message ?? e}`
    )
  }

  // openbadges' `signWithSigner` returns `proof: [proof]` (an array) for
  // Credly compatibility. Veres — and most VC-DI verifiers — expect `proof`
  // as a single object when there's exactly one proof. When the verifier
  // extracts the single proof from our array, the residue (sometimes
  // `proof: []`, sometimes a different RDF shape than our signed "no proof"
  // baseline) canonicalises to bytes we didn't sign, producing an
  // "Invalid signature" rejection. Unwrap to single object — it's what we
  // canonicalised against (documentCopy with proof deleted) and what the
  // verifier expects to see when stripping the proof for verification.
  const proofs = (signed as { proof?: unknown }).proof
  if (Array.isArray(proofs) && proofs.length === 1) {
    ;(signed as Record<string, unknown>).proof = proofs[0]
  }

  return {
    presentation: signed,
    holderDidUrl: verificationMethodId,
  }
}

/**
 * Convenience for tests / callers that already have a holder key.
 *
 * `TypedArrayEncoder.fromString` is the canonical Credo helper for turning a
 * string into the Buffer shape `wallet.sign` expects; we re-export the
 * Uint8Array path to keep the signer interface tight.
 */
export function bufferFromUint8(data: Uint8Array): Buffer {
  return Buffer.from(data)
}

/** Re-exported so the resolverProof bridge can build VP+submission together. */
export const __forTests = {
  pickVpContexts,
  TypedArrayEncoder,
}
