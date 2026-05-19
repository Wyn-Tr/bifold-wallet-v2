// Entry component for the designer-card system. Resolves the appropriate
// CardDesign for a credential (via shape-matching), then renders the unified
// DCCredentialCard with attribute values pulled from the credential's display
// data. Drop-in replacement for OpenIDCredentialCard when a design matches.

import React, { useMemo } from 'react'
import { TouchableOpacity, View, DimensionValue, ImageSourcePropType } from 'react-native'

import { DCCredentialCard, CredentialField, PhotoMode } from './layouts'
import { resolveDesign } from './registry'
import { CardDesign, CardLayout } from './types'
import { SupportedCredentialRecord } from './util/extractAttributes'

import { getCredentialForDisplay } from '../openid/display'

export interface OpenIDCardRendererProps {
  credentialRecord: SupportedCredentialRecord
  /** Skip resolution and use this design directly. */
  design?: CardDesign
  /** 'compact' for list/proof rows, 'full' for hero. Maps to DCCredentialCard.compact. */
  mode?: 'compact' | 'full'
  onPress?: () => void
  width?: DimensionValue
}

const TITLE_CASE_RE = /[._-]+/g

function humanLabel(key: string): string {
  // Strip dotted prefix (e.g. 'achievement.name' → 'name'), then humanize.
  const tail = key.includes('.') ? key.slice(key.lastIndexOf('.') + 1) : key
  return tail
    .replace(TITLE_CASE_RE, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
}

function lookup(attributes: Record<string, any>, path: string): unknown {
  if (!path) return undefined
  if (path in attributes) return attributes[path]
  // Try dotted lookup.
  const parts = path.split('.')
  let cur: any = attributes
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = cur[p]
  }
  return cur
}

// Attribute paths from an object that, when present, make a one-liner display.
// Ordered by preference — first match wins.
const OBJECT_DISPLAY_KEYS = ['vehicle_category_code', 'code', 'name', 'category', 'id', 'value']

// Strict ISO-8601 datetime: 2024-05-17, 2024-05-17T13:45:00, 2024-05-17T13:45Z, etc.
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/
// US-style: 05/17/2024 or 5/17/24
const US_DATE_RE = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/
// Compact: 20240517
const COMPACT_DATE_RE = /^\d{8}$/

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Render `2024-05-17T00:00:00.000Z` as `May 17, 2024`. Strips the time portion
 * always (cards don't show clock time). Returns null when the value isn't
 * parseable as a date — caller falls back to the raw string.
 */
function tryFormatDate(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Unix seconds (10-digit) vs ms (13-digit). Anything else is just a number.
    const ms = value > 1e12 ? value : value > 1e9 ? value * 1000 : NaN
    if (!Number.isNaN(ms)) {
      const d = new Date(ms)
      if (!Number.isNaN(d.getTime())) return formatDate(d)
    }
    return null
  }
  if (typeof value !== 'string') return null
  const s = value.trim()
  if (!s) return null

  if (ISO_DATE_RE.test(s)) {
    // For pure YYYY-MM-DD strings, parse as UTC to avoid timezone shift.
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(s)
    const d = dateOnly ? new Date(`${s}T00:00:00Z`) : new Date(s)
    if (!Number.isNaN(d.getTime())) return formatDate(d, dateOnly)
  }
  if (US_DATE_RE.test(s)) {
    const d = new Date(s)
    if (!Number.isNaN(d.getTime())) return formatDate(d)
  }
  if (COMPACT_DATE_RE.test(s)) {
    const y = s.slice(0, 4)
    const m = s.slice(4, 6)
    const day = s.slice(6, 8)
    const d = new Date(`${y}-${m}-${day}T00:00:00Z`)
    if (!Number.isNaN(d.getTime())) return formatDate(d, true)
  }
  return null
}

function formatDate(d: Date, useUtc = false): string {
  const year = useUtc ? d.getUTCFullYear() : d.getFullYear()
  const month = useUtc ? d.getUTCMonth() : d.getMonth()
  const day = useUtc ? d.getUTCDate() : d.getDate()
  return `${MONTHS[month]} ${day}, ${year}`
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) {
    return value
      .map((v) => formatValue(v))
      .filter(Boolean)
      .join(', ')
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    for (const k of OBJECT_DISPLAY_KEYS) {
      const v = obj[k]
      if (typeof v === 'string' || typeof v === 'number') {
        return tryFormatDate(v) ?? String(v)
      }
    }
    return ''
  }
  const asDate = tryFormatDate(value)
  if (asDate) return asDate
  return String(value)
}

function deriveHolder(attributes: Record<string, any>): string | undefined {
  const given = formatValue(attributes.given_name ?? attributes.givenName ?? attributes.firstName)
  const family = formatValue(attributes.family_name ?? attributes.familyName ?? attributes.lastName)
  if (given || family) return `${given} ${family}`.trim()
  if (typeof attributes.name === 'string' && !looksLikeDid(attributes.name)) return attributes.name
  if (typeof attributes.fullName === 'string') return attributes.fullName
  // OpenBadge v3: identifier:[{identityHash, identityType:'name'}] is the
  // canonical recipient-name location.
  const identifier = attributes.identifier
  if (Array.isArray(identifier)) {
    for (const entry of identifier) {
      if (
        entry &&
        typeof entry === 'object' &&
        typeof (entry as any).identityHash === 'string' &&
        (entry as any).identityType === 'name'
      ) {
        return (entry as any).identityHash
      }
    }
  }
  return undefined
}

function looksLikeDid(value: string): boolean {
  return /^did:/.test(value)
}

// Date-typed attribute paths shouldn't take up real estate on the card —
// users care about who/what far more than when. Issuer + holder name + the
// document number/ID is what makes the card visually meaningful.
const DATE_PATTERNS: ReadonlyArray<RegExp> = [
  /_date$/i,
  /^date_/i,
  /^date$/i,
  /_at$/i,
  /^iat$/i,
  /^exp$/i,
  /^nbf$/i,
  /birth_?date/i,
  /^birthdate$/i,
  /expir(y|ation|es)/i,
  /issued?$/i,
  /valid_?(from|until|to)/i,
  /effective/i,
  /joined/i,
  /conferred/i,
]

function isDateAttribute(path: string): boolean {
  const tail = path.includes('.') ? path.slice(path.lastIndexOf('.') + 1) : path
  return DATE_PATTERNS.some((re) => re.test(tail))
}

// Attribute keys we never want to surface on the card: identifiers and image
// fields are noise, and given_name/family_name are already rendered as the
// holder line above the fields.
const HIDDEN_ON_CARD = new Set<string>([
  'id',
  'type',
  '@context',
  'picture',
  'portrait',
  'image',
  'photo',
  'avatar',
  'profile_image',
  'profileImage',
  'photo_image',
  'studentPhoto',
  'given_name',
  'givenName',
  'firstName',
  'family_name',
  'familyName',
  'lastName',
  'name',
  'fullName',
  'cnf',
  'iss',
  'sub',
  'jti',
  'iat',
  'exp',
  'nbf',
  'status',
  'vct',
])

function isHiddenAttribute(path: string): boolean {
  if (HIDDEN_ON_CARD.has(path)) return true
  const tail = path.includes('.') ? path.slice(path.lastIndexOf('.') + 1) : path
  return HIDDEN_ON_CARD.has(tail)
}

function buildFields(design: CardDesign, attributes: Record<string, any>): CredentialField[] {
  const out: CredentialField[] = []
  const seen = new Set<string>()
  // Exclude the footer attr from the grid (dedup with the bottom-of-card line).
  if (design.footerAttribute) seen.add(design.footerAttribute)

  // Explicit pushes honor whatever the design declared — including dates,
  // which are critical for some credentials (mDL: DOB, issue, expiry).
  const pushExplicit = (path?: string) => {
    if (!path || seen.has(path) || isHiddenAttribute(path)) return
    seen.add(path)
    const raw = lookup(attributes, path)
    const value = formatValue(raw)
    if (!value) return
    out.push({ label: humanLabel(path), value })
  }
  // Fallthrough is conservative: skips dates so random `iat`/`exp` style
  // claims don't clutter cards that didn't ask for them.
  const pushFallthrough = (path: string) => {
    if (seen.has(path) || isHiddenAttribute(path) || isDateAttribute(path)) return
    seen.add(path)
    const raw = lookup(attributes, path)
    const value = formatValue(raw)
    if (!value) return
    out.push({ label: humanLabel(path), value })
  }

  // 1. Design-declared attributes win — order is meaningful.
  pushExplicit(design.primaryAttribute)
  for (const p of design.secondaryAttributes ?? []) pushExplicit(p)

  // 2. Fall through to every other top-level attribute on the credential so
  // the card never looks empty. Skips hidden/date/already-shown/boolean keys
  // and deeply-nested objects (rendered as ugly empty strings).
  for (const key of Object.keys(attributes)) {
    const value = attributes[key]
    if (value === null || value === undefined) continue
    // Skip raw booleans — "Age Over 21: Yes" looks awful on a card.
    if (typeof value === 'boolean') continue
    // Skip deeply nested objects (arrays are fine — formatValue handles them).
    if (typeof value === 'object' && !Array.isArray(value)) continue
    pushFallthrough(key)
  }

  return out
}

// =============================================================================
// Holder image resolution
// =============================================================================
//
// Cards that are designed to feature a portrait (student-id, employee-badge,
// mdl, professional-license, alumni, generic-portrait) should ONLY show the
// photo slot when the credential actually carries an image. Fake silhouettes
// look amateurish — better to hide the slot and let the fields go full-width.

const PHOTO_LAYOUTS: ReadonlySet<CardLayout> = new Set<CardLayout>([
  'student-id',
  'employee-badge',
  'mdl',
  'professional-license',
  'alumni',
  'generic-portrait',
])

const IMAGE_CLAIM_PATHS = [
  'picture',
  'portrait',
  'image',
  'photo',
  'avatar',
  'profile_image',
  'profileImage',
  'photo_image',
  'studentPhoto',
] as const

function asImageSource(value: unknown): ImageSourcePropType | undefined {
  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim()
    if (trimmed.startsWith('data:') || /^https?:\/\//i.test(trimmed) || trimmed.startsWith('blob:')) {
      return { uri: trimmed }
    }
    // Some issuers ship raw base64 without the data-URI prefix. Treat any
    // long base64-ish blob as JPEG. Skip short strings — they're typically
    // identifiers, not images.
    if (trimmed.length > 256 && /^[A-Za-z0-9+/=_-]+$/.test(trimmed)) {
      return { uri: `data:image/jpeg;base64,${trimmed}` }
    }
  }
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>
    // OpenBadge: `image: { id, type }` — the id is the URL/data URI.
    if (typeof o.id === 'string') return asImageSource(o.id)
    if (typeof o.url === 'string') return asImageSource(o.url)
    // SD-JWT sometimes emits `picture: { value: '...' }`.
    if (typeof o.value === 'string') return asImageSource(o.value)
  }
  return undefined
}

function findHolderImage(attributes: Record<string, any>): ImageSourcePropType | undefined {
  for (const path of IMAGE_CLAIM_PATHS) {
    const direct = attributes[path]
    const src = asImageSource(direct)
    if (src) return src
  }
  // Walk credentialSubject one level deep for nested image fields.
  for (const key of Object.keys(attributes)) {
    const v = attributes[key]
    if (v && typeof v === 'object') {
      for (const path of IMAGE_CLAIM_PATHS) {
        const src = asImageSource((v as Record<string, unknown>)[path])
        if (src) return src
      }
    }
  }
  return undefined
}

function resolvePhotoMode(
  layout: CardLayout,
  imageSource: ImageSourcePropType | undefined
): { photo?: PhotoMode; photoSource?: ImageSourcePropType } {
  // Layouts that ship with a `seal` glyph by default (deans-list, diploma):
  // never inject a person photo — fall through to the layout's default.
  if (!PHOTO_LAYOUTS.has(layout)) {
    return {}
  }
  if (imageSource) {
    return { photo: 'silhouette', photoSource: imageSource }
  }
  // Photo-layout WITHOUT an image: hide the slot entirely (fields go full-width).
  return { photo: false }
}

export const OpenIDCardRenderer: React.FC<OpenIDCardRendererProps> = ({
  credentialRecord,
  design: forcedDesign,
  mode = 'full',
  onPress,
  width,
}) => {
  const design = useMemo(() => forcedDesign ?? resolveDesign(credentialRecord), [forcedDesign, credentialRecord])
  const display = useMemo(() => {
    try {
      return getCredentialForDisplay(credentialRecord as any)
    } catch {
      return null
    }
  }, [credentialRecord])

  if (!design) return null

  const attributes = (display?.attributes ?? {}) as Record<string, any>
  const metaHolder = display?.metadata?.holder
  const holder =
    deriveHolder(attributes) ??
    (typeof metaHolder === 'string' && !looksLikeDid(metaHolder) ? metaHolder : undefined)
  const title = display?.display?.name ?? humanLabel(design.layout)
  const subtitle = display?.display?.issuer?.name ?? undefined
  const fields = buildFields(design, attributes)
  const footer = useMemo(() => {
    if (!design.footerAttribute) return undefined
    const raw = lookup(attributes, design.footerAttribute)
    const v = formatValue(raw)
    return v ? `${humanLabel(design.footerAttribute)} · ${v}` : undefined
  }, [design.footerAttribute, attributes])
  const imageSource = useMemo(() => findHolderImage(attributes), [attributes])
  const photoConfig = resolvePhotoMode(design.layout, imageSource)

  const card = (
    <DCCredentialCard
      design={design}
      title={title}
      subtitle={subtitle}
      holder={holder}
      fields={fields}
      footer={footer}
      compact={mode === 'compact'}
      photo={photoConfig.photo}
      photoSource={photoConfig.photoSource}
      width={width}
    />
  )

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {card}
      </TouchableOpacity>
    )
  }
  return <View>{card}</View>
}

export default OpenIDCardRenderer
