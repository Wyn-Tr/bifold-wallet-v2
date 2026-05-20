/**
 * Flatten a credentialSubject (or any nested JSON object) into displayable rows.
 *
 * Nested objects become a header row (label-only, depth=N) followed by their
 * leaves at depth=N+1. Arrays of primitives are joined; arrays of objects are
 * recursed with `[i]` indices. Technical JSON-LD keys (`id`, `type`, `@context`)
 * and a caller-provided skip set are excluded.
 *
 * Used by both the credential-offer accept screen and the credential-details
 * screen so deeply-nested credentials (e.g. BirthCertificate with attendant /
 * facility / newborn objects) render as readable rows instead of dumping raw
 * JSON into a single value cell.
 */
export type FlatRow = {
  key: string
  label: string
  value?: string
  depth: number
  isHeader: boolean
  /** When true, `value` is a URI / data-URI suitable for an <Image source={{uri}}/>. */
  isImage?: boolean
}

const DEFAULT_SKIP_KEYS = new Set(['id', 'sub', 'status', 'type', '@context', '@type'])

const IMAGE_KEY_RE = /^(image|photo|picture|portrait|avatar|headshot|logo|icon|profileImage|profilePicture)$/i

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const formatPrimitive = (v: unknown): string => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v)
  return JSON.stringify(v)
}

/**
 * Heuristic: does this string look like an image we can pass to <Image source={{uri}}/>?
 * Accepts data URIs (`data:image/...`) and http(s) URLs ending in a known image extension.
 * Plain http(s) URLs without an image extension are NOT treated as images, since they
 * could just as easily be a DID URL or a JSON document.
 */
export const isImageUriValue = (v: string): boolean => {
  if (typeof v !== 'string') return false
  if (v.startsWith('data:image/')) return true
  if (/^https?:\/\/.+\.(png|jpe?g|gif|webp|svg|bmp|avif)([?#].*)?$/i.test(v)) return true
  return false
}

/**
 * Extract an image URI from an arbitrary JSON value. Handles strings, and the
 * common W3C VC `{ id }` / `{ url }` nested-object shapes.
 */
const resolveImageUri = (v: unknown, key: string): string | null => {
  const isImageKey = IMAGE_KEY_RE.test(key)
  if (typeof v === 'string') {
    if (v.startsWith('data:image/')) return v
    if (isImageUriValue(v)) return v
    // Treat plain http(s) URLs as images only when the field name suggests it.
    if (isImageKey && /^https?:\/\//.test(v)) return v
    return null
  }
  if (isPlainObject(v)) {
    const obj = v as { id?: unknown; url?: unknown; type?: unknown }
    const candidate =
      (typeof obj.id === 'string' && obj.id) || (typeof obj.url === 'string' && obj.url) || ''
    if (!candidate) return null
    if (candidate.startsWith('data:image/')) return candidate
    if (isImageUriValue(candidate)) return candidate
    if (isImageKey && /^https?:\/\//.test(candidate)) return candidate
    return null
  }
  return null
}

export interface FlattenOptions {
  /** Additional top-level keys to skip (e.g. an image attribute already shown in the header). */
  skipTopLevelKeys?: string[]
}

export function flattenSubject(
  obj: Record<string, unknown> | undefined | null,
  options: FlattenOptions = {}
): FlatRow[] {
  if (!obj) return []
  const topSkip = new Set(options.skipTopLevelKeys ?? [])

  const walk = (input: Record<string, unknown>, depth: number, parentKey: string): FlatRow[] => {
    const out: FlatRow[] = []
    for (const [k, v] of Object.entries(input)) {
      if (DEFAULT_SKIP_KEYS.has(k)) continue
      if (depth === 0 && topSkip.has(k)) continue
      if (v === undefined || v === null) continue
      const fullKey = parentKey ? `${parentKey}.${k}` : k

      // Detect image-shaped values FIRST so we don't recurse into a
      // `{id, url, type}` object and dump its fields as separate rows.
      const imageUri = resolveImageUri(v, k)
      if (imageUri) {
        out.push({ key: fullKey, label: k, value: imageUri, depth, isHeader: false, isImage: true })
        continue
      }

      if (isPlainObject(v)) {
        const nested = walk(v, depth + 1, fullKey)
        if (nested.length === 0) continue
        out.push({ key: fullKey, label: k, depth, isHeader: true })
        out.push(...nested)
      } else if (Array.isArray(v)) {
        const allPrimitive = v.every((item) => typeof item !== 'object' || item === null)
        if (allPrimitive) {
          out.push({
            key: fullKey,
            label: k,
            value: v.map((x) => formatPrimitive(x)).join(', '),
            depth,
            isHeader: false,
          })
        } else {
          out.push({ key: fullKey, label: k, depth, isHeader: true })
          v.forEach((item, i) => {
            if (isPlainObject(item)) {
              const nested = walk(item, depth + 1, `${fullKey}[${i}]`)
              if (nested.length > 0) {
                out.push({ key: `${fullKey}[${i}]`, label: `${k} #${i + 1}`, depth: depth + 1, isHeader: true })
                out.push(...nested.map((r) => ({ ...r, depth: r.depth + 1 })))
              }
            } else {
              out.push({
                key: `${fullKey}[${i}]`,
                label: String(i),
                value: formatPrimitive(item),
                depth: depth + 1,
                isHeader: false,
              })
            }
          })
        }
      } else {
        out.push({ key: fullKey, label: k, value: formatPrimitive(v), depth, isHeader: false })
      }
    }
    return out
  }

  return walk(obj, 0, '')
}
