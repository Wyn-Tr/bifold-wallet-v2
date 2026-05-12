/*
 * React Native polyfill for `@digitalcredentials/jsonld`.
 *
 * In Node, jsonld registers `documentLoaders.node` (uses `https`); in browsers
 * it registers `documentLoaders.xhr` (uses `XMLHttpRequest`). React Native ends
 * up on the browser entry — so `documentLoaders.node` is `undefined`.
 *
 * @ajna-inc/openbadges' `contextPreprocessor.ts` looks specifically at
 * `jsonld.documentLoaders.node` to decide whether it can reach the network. If
 * absent, its loader silently returns `{ '@context': {} }` for every URL,
 * which causes JSON-LD canonicalization to throw
 * "No @context value present, but it is required" on any credential whose
 * contexts aren't in openbadges' tiny built-in cache.
 *
 * Calling `installJsonLdRnLoader()` once before any cryptosuite verify call
 * registers a `fetch`-based loader as `node`, so the preprocessor reaches the
 * network and the cryptosuite can canonicalize credentials with arbitrary
 * `@context` references (v1, OBv3, schema.org, custom issuer contexts, etc.).
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — package ships untyped JS
import * as jsonldNS from '@digitalcredentials/jsonld'
import { sha1 } from '@noble/hashes/legacy'
import { sha256 } from '@noble/hashes/sha2'

let installed = false
let subtleInstalled = false

/**
 * Polyfill `globalThis.crypto.subtle.digest` and patch the cached
 * `isomorphic-webcrypto` module that `@digitalcredentials/rdf-canonize` uses
 * for hashing during URDNA2015 canonicalization.
 *
 * On React Native, `globalThis.crypto.subtle` is `undefined`; rdf-canonize's
 * RN MessageDigest reads `require('isomorphic-webcrypto').subtle` and throws
 * "crypto.subtle not found." at construction time. We replace `subtle` on
 * both globalThis.crypto and the isomorphic-webcrypto module export with a
 * minimal `digest`-only shim backed by `@noble/hashes` (pure JS).
 */
export function installSubtleDigestPolyfill(): void {
  if (subtleInstalled) return

  const digest = async (
    algorithm: string | { name?: string },
    data: ArrayBuffer | ArrayBufferView
  ): Promise<ArrayBuffer> => {
    const algoName =
      typeof algorithm === 'string' ? algorithm : (algorithm?.name ?? '')
    const normalized = algoName.toUpperCase().replace(/-/g, '')
    const bytes =
      data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array((data as ArrayBufferView).buffer, (data as ArrayBufferView).byteOffset, (data as ArrayBufferView).byteLength)
    let out: Uint8Array
    if (normalized === 'SHA256') out = sha256(bytes)
    else if (normalized === 'SHA1') out = sha1(bytes)
    else throw new Error(`Unsupported digest algorithm: ${algoName}`)
    // Return an ArrayBuffer (subtle.digest contract).
    const ab = new ArrayBuffer(out.length)
    new Uint8Array(ab).set(out)
    return ab
  }

  // 1. Make sure globalThis.crypto exists with a subtle.digest.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis as any
  if (!g.crypto) g.crypto = {}
  if (!g.crypto.subtle) g.crypto.subtle = {}
  if (typeof g.crypto.subtle.digest !== 'function') {
    g.crypto.subtle.digest = digest
  }

  // 2. Patch the isomorphic-webcrypto module — rdf-canonize captures it at
  //    require-time, so even after we set globalThis.crypto.subtle, the cached
  //    reference inside that module is still empty. Mutate its `subtle` field
  //    directly. Use a try/catch in case the package isn't resolvable.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const isomorphicWebcrypto = require('isomorphic-webcrypto')
    if (isomorphicWebcrypto && (!isomorphicWebcrypto.subtle || typeof isomorphicWebcrypto.subtle.digest !== 'function')) {
      isomorphicWebcrypto.subtle = { ...(isomorphicWebcrypto.subtle ?? {}), digest }
    }
    if (isomorphicWebcrypto?.default && (!isomorphicWebcrypto.default.subtle || typeof isomorphicWebcrypto.default.subtle.digest !== 'function')) {
      isomorphicWebcrypto.default.subtle = {
        ...(isomorphicWebcrypto.default.subtle ?? {}),
        digest,
      }
    }
  } catch {
    // package not resolvable; the globalThis patch is enough for callers
    // that read `globalThis.crypto.subtle` directly.
  }

  subtleInstalled = true
}

export function installJsonLdRnLoader(): void {
  // SHA-256/SHA-1 polyfill is needed for URDNA2015 canonicalization on RN.
  installSubtleDigestPolyfill()
  if (installed) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonld = (jsonldNS as any).default ?? jsonldNS
  if (!jsonld?.documentLoaders) return

  // Already registered (e.g. by another consumer): nothing to do.
  if (typeof jsonld.documentLoaders.node === 'function') {
    installed = true
    return
  }

  const fetchLoader = async (url: string) => {
    const response = await fetch(url, {
      headers: { Accept: 'application/ld+json, application/json' },
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch JSON-LD context ${url}: ${response.status}`)
    }
    const document = await response.json()
    return { contextUrl: null, document, documentUrl: url }
  }

  // The openbadges preprocessor calls `jld.documentLoaders.node()` (factory) to
  // get the real loader, so we expose a factory that returns our fetcher.
  jsonld.documentLoaders.node = () => fetchLoader
  installed = true
}
