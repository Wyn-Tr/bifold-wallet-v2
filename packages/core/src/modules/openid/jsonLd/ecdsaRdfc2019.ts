/*
 * ecdsa-rdfc-2019 cryptosuite — verification only.
 *
 * Spec: https://www.w3.org/TR/vc-di-ecdsa/#ecdsa-rdfc-2019
 *
 * The Veres VC Playground (and many other modern issuers) sign credentials with
 * ECDSA over P-256/P-384, using RDFC-1.0 canonicalization and DataIntegrityProof.
 * The `@ajna-inc/openbadges` package only ships eddsa-rdfc-2022 (Ed25519), so we
 * implement P-256/P-384 verification here ourselves.
 *
 * This module exposes a verifier with the same shape as openbadges'
 * EddsaRdfc2022Cryptosuite.verify so the bridge can call them uniformly.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — package has no published TS types
import * as jsonldNs from '@digitalcredentials/jsonld'
import bs58 from 'bs58'
import { p256 } from '@noble/curves/p256'
import { p384 } from '@noble/curves/p384'
import { sha256, sha384 } from '@noble/hashes/sha2'
import { TypedArrayEncoder } from '@credo-ts/core'
// Reuse openbadges' context-preprocessing document loader. It fetches the
// JSON-LD contexts from the network and strips `@protected` flags so VC v2
// + DataIntegrity v2 + issuer-defined contexts can coexist (otherwise jsonld
// throws "tried to redefine X which is a protected term" when terms like
// `mediaType`, `description`, `proof` are defined in multiple contexts).
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — deep import; package re-exports it via cryptosuites/index but TS resolution prefers types from this exact path
import { createPreprocessingDocumentLoader } from '@ajna-inc/openbadges/build/cryptosuites/contextPreprocessor'

import { installSubtleDigestPolyfill } from './jsonldRnPolyfill'

const PROOF_TYPE_DATA_INTEGRITY = 'DataIntegrityProof'
const CRYPTOSUITE = 'ecdsa-rdfc-2019'
const DATA_INTEGRITY_V2_CONTEXT_URL = 'https://w3id.org/security/data-integrity/v2'

// Multicodec prefixes (varint-encoded).
//   p256-pub  = 0x1200 → bytes 0x80 0x24
//   p384-pub  = 0x1201 → bytes 0x81 0x24
const P256_MULTICODEC = new Uint8Array([0x80, 0x24])
const P384_MULTICODEC = new Uint8Array([0x81, 0x24])

interface EcdsaProof {
  type?: string
  cryptosuite?: string
  created?: string
  verificationMethod?: string
  proofPurpose?: string
  proofValue?: string
}

interface VerifyOptions {
  document: Record<string, unknown>
  proof: EcdsaProof
  publicKeyMultibase: string
  /** When true, jsonld will fetch contexts from the network (slower but
   * required for credentials whose issuer-side contexts aren't in our cache). */
  useNetworkContexts?: boolean
}

interface VerifyResult {
  verified: boolean
  error?: string
}

interface DecodedPublicKey {
  curve: 'P-256' | 'P-384'
  /** Compressed key bytes (33 for P-256, 49 for P-384) — what noble accepts. */
  bytes: Uint8Array
}

export class EcdsaRdfc2019Cryptosuite {
  matchProof(proof: EcdsaProof): boolean {
    return proof?.type === PROOF_TYPE_DATA_INTEGRITY && proof?.cryptosuite === CRYPTOSUITE
  }

  async verify(options: VerifyOptions): Promise<VerifyResult> {
    const { document, proof, publicKeyMultibase, useNetworkContexts = true } = options
    try {
      if (!this.matchProof(proof)) {
        return { verified: false, error: `Cryptosuite mismatch: expected ${CRYPTOSUITE}, got ${proof?.cryptosuite}` }
      }
      if (!proof.proofValue?.startsWith('z')) {
        return { verified: false, error: 'Invalid proofValue: must be multibase base58btc encoded' }
      }

      const publicKey = this.decodePublicKey(publicKeyMultibase)
      const signature = bs58.decode(proof.proofValue.slice(1))
      // ECDSA P-256 → 64-byte compact (r||s); P-384 → 96-byte. Anything else is
      // either DER-encoded or wrong, and noble's `compact` format would fail
      // silently on length mismatch.
      const expectedSigLen = publicKey.curve === 'P-256' ? 64 : 96
      if (signature.length !== expectedSigLen) {
        return {
          verified: false,
          error: `Unexpected signature length ${signature.length} for ${publicKey.curve} (expected ${expectedSigLen})`,
        }
      }

      // Strip proofValue from proof options before canonicalisation (per spec).
      const proofOptions: EcdsaProof = {
        type: proof.type,
        cryptosuite: proof.cryptosuite,
        created: proof.created,
        verificationMethod: proof.verificationMethod,
        proofPurpose: proof.proofPurpose,
      }
      const documentCopy: Record<string, unknown> = { ...document }
      delete documentCopy.proof

      const hashData = await this.createHashData(documentCopy, proofOptions, useNetworkContexts)

      // Pre-hash with @noble/hashes (pure JS, RN-safe). We can't use noble's
      // `prehash: true` because, on this curve build, that path reaches for
      // `globalThis.crypto.subtle` for the digest — which doesn't exist in
      // React Native. Hashing here and passing `prehash: false` keeps the
      // math identical (ECDSA-with-SHA-{256,384} signs/verifies the single
      // hash of the message). Credo's Hasher only ships sha-256, hence noble.
      const messageHash =
        publicKey.curve === 'P-256' ? sha256(hashData) : sha384(hashData)

      const curve = publicKey.curve === 'P-256' ? p256 : p384
      const verified = curve.verify(signature, messageHash, publicKey.bytes, {
        prehash: false,
        format: 'compact',
      })
      return { verified }
    } catch (err) {
      return { verified: false, error: (err as Error)?.message }
    }
  }

  private decodePublicKey(publicKeyMultibase: string): DecodedPublicKey {
    if (!publicKeyMultibase || !publicKeyMultibase.startsWith('z')) {
      throw new Error('Invalid multibase prefix: expected base58btc (z)')
    }
    const bytes = bs58.decode(publicKeyMultibase.slice(1))
    if (bytes[0] === P256_MULTICODEC[0] && bytes[1] === P256_MULTICODEC[1]) {
      return { curve: 'P-256', bytes: bytes.slice(2) }
    }
    if (bytes[0] === P384_MULTICODEC[0] && bytes[1] === P384_MULTICODEC[1]) {
      return { curve: 'P-384', bytes: bytes.slice(2) }
    }
    throw new Error(
      `Unsupported multicodec for ECDSA: 0x${bytes[0].toString(16)} 0x${bytes[1].toString(16)} (expected 0x80 0x24 for P-256 or 0x81 0x24 for P-384)`
    )
  }

  /**
   * Canonicalize a JSON-LD document with URDNA2015 (RDFC-1.0). Uses the
   * preprocessing document loader so combined contexts (VC v2 + DataIntegrity
   * + issuer-defined) don't trip over each other's `@protected` term
   * definitions during expansion.
   */
  private async canonicalize(document: Record<string, unknown>, _useNetworkContexts: boolean): Promise<string> {
    // RN's `globalThis.crypto.subtle` is undefined; rdf-canonize's MessageDigest
    // throws "crypto.subtle not found." on construction without this.
    installSubtleDigestPolyfill()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jld: any = (jsonldNs as any).default ?? jsonldNs
    const documentLoader = createPreprocessingDocumentLoader()
    return jld.canonize(document, {
      algorithm: 'URDNA2015',
      format: 'application/n-quads',
      documentLoader,
    })
  }

  /**
   * Per spec: hashData = SHA256(canonical(proofConfig)) || SHA256(canonical(document))
   */
  private async createHashData(
    document: Record<string, unknown>,
    proofOptions: EcdsaProof,
    useNetworkContexts: boolean
  ): Promise<Uint8Array> {
    const canonicalDocument = await this.canonicalize(document, useNetworkContexts)
    const documentHash = sha256(TypedArrayEncoder.fromString(canonicalDocument))

    const proofConfigDocument: Record<string, unknown> = {
      '@context': DATA_INTEGRITY_V2_CONTEXT_URL,
      ...proofOptions,
    }
    const canonicalProofConfig = await this.canonicalize(proofConfigDocument, useNetworkContexts)
    const proofConfigHash = sha256(TypedArrayEncoder.fromString(canonicalProofConfig))

    const out = new Uint8Array(proofConfigHash.length + documentHash.length)
    out.set(proofConfigHash, 0)
    out.set(documentHash, proofConfigHash.length)
    return out
  }
}
