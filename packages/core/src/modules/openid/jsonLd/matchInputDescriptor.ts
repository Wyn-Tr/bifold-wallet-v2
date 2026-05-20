/*
 * Lightweight DIF Presentation Exchange matcher for JSON-LD credentials we
 * store outside of Credo (JsonLdCredentialRecord / OpenBadgeCredentialRecord).
 *
 * Credo's built-in PEX engine only inspects W3cCredentialRecord / SdJwtVcRecord
 * / MdocRecord — anything else is invisible to verifier flows. This file fills
 * that gap with a focused matcher that handles the patterns OID4VP verifiers
 * use in practice (VC Playground, ESSI, Mattr, walt.id):
 *
 *   - `format` clause: ldp_vp / ldp_vc / jwt_vp / etc.
 *   - JSONPath fields: `$.type`, `$['@context']`, `$.credentialSubject.*`,
 *     `$.vc.*`, `$.issuer`
 *   - filter forms: `pattern` (regex / literal substring), `const`, `enum`,
 *     `contains`, `type` (array vs string)
 *
 * We don't pull in `@astronautlabs/jsonpath` because it's a transitive dep of
 * `@sphereon/pex` and importing through a deep path is fragile across yarn
 * hoisting. The hand-rolled walker covers everything verifiers actually send.
 */

interface InputDescriptorField {
  path: string[]
  filter?: {
    type?: string
    pattern?: string
    const?: unknown
    enum?: unknown[]
    contains?: { const?: unknown; pattern?: string }
  }
  optional?: boolean
}

export interface InputDescriptor {
  id: string
  name?: string
  purpose?: string
  format?: Record<string, unknown>
  constraints?: {
    fields?: InputDescriptorField[]
    limit_disclosure?: 'required' | 'preferred'
  }
}

/**
 * The wallet's format support for `ldp_vp` proofs we can build (via
 * `buildJsonLdPresentation`). If a descriptor restricts to `jwt_vp` / `vc+sd-jwt`
 * etc., this matcher bows out — Credo's native PEX handles those.
 */
const LDP_VP_FORMATS = new Set(['ldp_vp', 'ldp_vc'])

/**
 * Does the verifier accept an `ldp_vp` proof for this descriptor?
 *
 * No `format` block at all means "any format" — we accept it. A `format` block
 * means we only accept if it lists ldp_vp / ldp_vc.
 */
export function acceptsLdpVp(descriptor: InputDescriptor, globalFormat?: Record<string, unknown>): boolean {
  const fmt = descriptor.format ?? globalFormat
  if (!fmt) return true
  return Object.keys(fmt).some((k) => LDP_VP_FORMATS.has(k))
}

/**
 * Walk a (very small) subset of JSONPath. Supported:
 *   $          → root
 *   $.foo      → property
 *   $['foo']   → property (bracket notation, needed for `@context`)
 *   $.foo.bar  → nested
 *   $.foo[*]   → spread array (returns multiple values)
 *
 * Returns an array of matched values (possibly multiple for `[*]`). Misses
 * yield an empty array, which the filter logic treats as "no match".
 */
function jsonPath(doc: unknown, path: string): unknown[] {
  if (!path.startsWith('$')) return []
  let current: unknown[] = [doc]
  let i = 1
  while (i < path.length) {
    const ch = path[i]
    if (ch === '.') {
      // Read property name up to next . [ or end
      i++
      let key = ''
      while (i < path.length && path[i] !== '.' && path[i] !== '[') {
        key += path[i]
        i++
      }
      if (!key) continue
      current = current.flatMap((v) => {
        if (v && typeof v === 'object') {
          const value = (v as Record<string, unknown>)[key]
          return value === undefined ? [] : [value]
        }
        return []
      })
    } else if (ch === '[') {
      const end = path.indexOf(']', i)
      if (end === -1) return []
      const inner = path.slice(i + 1, end)
      i = end + 1
      if (inner === '*') {
        current = current.flatMap((v) => (Array.isArray(v) ? v : []))
      } else {
        const quoted = inner.replace(/^['"]|['"]$/g, '')
        // numeric index?
        const idx = Number(inner)
        if (!Number.isNaN(idx) && Number.isInteger(idx)) {
          current = current.flatMap((v) => (Array.isArray(v) && v[idx] !== undefined ? [v[idx]] : []))
        } else {
          current = current.flatMap((v) => {
            if (v && typeof v === 'object') {
              const value = (v as Record<string, unknown>)[quoted]
              return value === undefined ? [] : [value]
            }
            return []
          })
        }
      }
    } else {
      i++
    }
  }
  return current
}

/**
 * Apply a filter clause to a value.
 *
 * `contains` is an array-aware constraint — it asks "does this array hold
 * at least one element matching X?" — so it's evaluated against the value
 * as a whole, never against the unwrapped elements. Everything else
 * (`const`, `enum`, `pattern`) is element-wise: if the value is an array,
 * the filter passes if ANY element passes, mirroring how JSONPath-on-array
 * results are typically consumed.
 */
function valueMatches(value: unknown, filter: InputDescriptorField['filter']): boolean {
  if (!filter) return true

  if (filter.contains) {
    if (!Array.isArray(value)) return false
    return value.some((el) => {
      if (filter.contains!.const !== undefined) return el === filter.contains!.const
      if (filter.contains!.pattern) {
        if (typeof el !== 'string') return false
        try {
          return new RegExp(filter.contains!.pattern).test(el)
        } catch {
          return el.includes(filter.contains!.pattern)
        }
      }
      return true
    })
  }

  const candidates: unknown[] = Array.isArray(value) ? value : [value]
  return candidates.some((v) => {
    if (filter.const !== undefined && v !== filter.const) return false
    if (filter.enum && Array.isArray(filter.enum) && !filter.enum.includes(v)) return false
    if (filter.pattern) {
      if (typeof v !== 'string') return false
      try {
        return new RegExp(filter.pattern).test(v)
      } catch {
        return v.includes(filter.pattern)
      }
    }
    // No constraints fired → field is present, which is itself a "match"
    // for path-only descriptors that just require existence.
    return true
  })
}

/**
 * Does `credential` satisfy every (non-optional) field constraint in `descriptor`?
 *
 * Each field may carry multiple `path`s — they're alternatives (any path that
 * resolves + passes filter is enough). Optional fields are skipped.
 */
export function credentialMatchesDescriptor(
  credential: Record<string, unknown>,
  descriptor: InputDescriptor
): boolean {
  const fields = descriptor.constraints?.fields ?? []
  if (fields.length === 0) return true

  for (const field of fields) {
    if (field.optional) continue
    const paths = field.path ?? []
    const fieldOk = paths.some((p) => {
      const values = jsonPath(credential, p)
      if (values.length === 0) return false
      return values.some((v) => valueMatches(v, field.filter))
    })
    if (!fieldOk) return false
  }
  return true
}
