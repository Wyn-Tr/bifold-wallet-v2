// Build DCAttrItem trees from arbitrary credential attribute values.
//
// Primitives become a single-line row. Objects and arrays-of-objects become
// a group header with indented children — so JSON nested values like mDL's
// `driving_privileges: [{vehicle_category_code: "B", issue_date: "…"}]` are
// readable instead of dumped as `[object Object]` or raw JSON strings.

import type { DCAttrItem } from '../primitives'

const ISO_OR_SLASH = /^\d{4}-\d{2}-\d{2}|^\d{1,2}\/\d{1,2}\/\d{2,4}/
const COMPACT_YYYYMMDD = /^\d{8}$/
const SKIP_KEYS = new Set(['id', 'sub', 'status', 'type', '@context', '@type'])

// Base64 image payloads / long binary strings: rendering them is useless and
// they push the rest of the screen off. The card already shows the portrait
// for credentials that carry one.
const IMAGE_DATA_URI = /^data:image\//i
const IMAGE_KEY_RE = /^(image|photo|picture|portrait|avatar|headshot|profile_?image|profile_?picture)$/i

export function toAttrItem(label: string, value: unknown): DCAttrItem | null {
  if (value === null || value === undefined) return null

  // Drop image attributes — they're either on the card already or render
  // as a useless 4KB data: URI in a text cell.
  if (isImageValue(label, value)) return null

  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    const v = formatPrimitive(label, value)
    return v ? { label, value: v } : null
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null
    const allPrimitive = value.every(
      (v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
    )
    if (allPrimitive) {
      return {
        label,
        value: value
          .map((v) => formatPrimitive(label, v as string | number | boolean))
          .filter(Boolean)
          .join(', '),
      }
    }
    // OpenBadge v3 `IdentityObject` pattern: array of
    // `{identityHash, identityType, hashed?}`. Render each as one line —
    // "name: Alice Johnson", "url: alice@x" — no nested ENTRY/Hashed garbage.
    const asIdentityObjects = projectIdentityObjects(label, value as Record<string, unknown>[])
    if (asIdentityObjects) return asIdentityObjects

    // Array of objects. With a single element, inline its keys directly under
    // the array's label — no redundant `1. <summary>` wrapper. With multiple
    // elements, render each as an indented subgroup.
    if (value.length === 1 && value[0] && typeof value[0] === 'object' && !Array.isArray(value[0])) {
      const inner = expandObject(value[0] as Record<string, unknown>)
      if (!inner.length) return null
      if (inner.length === 1 && !inner[0].children) {
        return { label, value: inner[0].value }
      }
      return { label, children: inner }
    }
    const children: DCAttrItem[] = []
    value.forEach((entry, i) => {
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        const summary = readableSummary(entry as Record<string, unknown>)
        const inner = expandObject(entry as Record<string, unknown>)
        if (!inner.length) return
        children.push({
          label: summary ? `${i + 1}. ${summary}` : `Entry ${i + 1}`,
          children: inner,
        })
      } else {
        const child = toAttrItem(String(i + 1), entry)
        if (child) children.push(child)
      }
    })
    if (!children.length) return null
    return { label, children }
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.value === 'string' || typeof obj.value === 'number' || typeof obj.value === 'boolean') {
      const v = formatPrimitive(label, obj.value)
      return v ? { label, value: v } : null
    }
    const inner = expandObject(obj)
    if (!inner.length) return null
    if (inner.length === 1 && !inner[0].children) {
      return { label, value: inner[0].value }
    }
    return { label, children: inner }
  }

  return null
}

// OBv3 IdentityObject — `{identityHash, identityType, hashed?}`. We project
// the array into one row when there's a single entry, or a multi-row block
// where each row's label is the identityType ("name", "email", "url"…).
function projectIdentityObjects(
  parentLabel: string,
  entries: Record<string, unknown>[]
): DCAttrItem | null {
  const allMatch = entries.every(
    (e) =>
      e &&
      typeof e === 'object' &&
      typeof (e as any).identityHash === 'string' &&
      typeof (e as any).identityType === 'string'
  )
  if (!allMatch) return null
  if (entries.length === 1) {
    const e = entries[0] as { identityHash: string; identityType: string; hashed?: unknown }
    // If hashed=true the identityHash is a hash, not human-readable — show
    // only the type to avoid pasting a long hex string in the value cell.
    if ((e as any).hashed === true) {
      return { label: parentLabel, value: e.identityType }
    }
    return { label: e.identityType, value: e.identityHash }
  }
  const children = entries.map((e) => {
    const o = e as { identityHash: string; identityType: string; hashed?: unknown }
    return {
      label: o.identityType,
      value: (o as any).hashed === true ? '(hashed)' : o.identityHash,
    }
  })
  return { label: parentLabel, children }
}

function isImageValue(label: string, value: unknown): boolean {
  if (IMAGE_KEY_RE.test(label)) {
    // Any value under an image-keyed attribute is dropped — we don't surface
    // these in the attribute list because the card already shows them.
    return true
  }
  if (typeof value === 'string' && IMAGE_DATA_URI.test(value)) return true
  return false
}

export function expandObject(obj: Record<string, unknown>, skip: Iterable<string> = []): DCAttrItem[] {
  const skipSet = new Set([...SKIP_KEYS, ...skip])
  const out: DCAttrItem[] = []
  for (const [k, v] of Object.entries(obj)) {
    if (skipSet.has(k)) continue
    const item = toAttrItem(k, v)
    if (item) out.push(item)
  }
  return out
}

function readableSummary(obj: Record<string, unknown>): string | undefined {
  const pick = (k: string) =>
    typeof obj[k] === 'string' || typeof obj[k] === 'number' ? String(obj[k]) : undefined
  return pick('name') ?? pick('vehicle_category_code') ?? pick('code') ?? pick('label') ?? pick('id')
}

export function formatPrimitive(name: string, value: string | number | boolean): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') {
    if (/^age_over_\d+$/i.test(name)) return value ? 'Yes' : 'No'
    return String(value)
  }
  const trimmed = String(value).trim()
  if (!trimmed) return ''
  if (ISO_OR_SLASH.test(trimmed) || COMPACT_YYYYMMDD.test(trimmed)) {
    const parsed = parseDate(trimmed)
    if (parsed) return parsed
  }
  return trimmed
}

export function parseDate(input: string): string | null {
  const s = input.trim()
  let d: Date | null = null
  if (COMPACT_YYYYMMDD.test(s)) {
    d = new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`)
  } else {
    const candidate = new Date(s)
    if (!Number.isNaN(candidate.getTime())) d = candidate
  }
  if (!d || Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
