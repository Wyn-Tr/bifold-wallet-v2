// Unified credential card. Ports `/Digicred Wallet/screens.jsx` CredentialCard
// to React Native. All 9 design.layout values render through this component;
// internal switches control aspect ratio, photo treatment, and field grid.

import React from 'react'
import { View, Text, StyleSheet, ImageSourcePropType, Image, DimensionValue } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'

import { getGlyphComponent } from '../glyphs'
import { CardDesign, CardLayout } from '../types'
import DiplomaCard from './DiplomaCard'

export interface CredentialField {
  label: string
  value: string
}

export type PhotoMode = 'placeholder' | 'silhouette' | 'seal' | false

export interface DCCredentialCardProps {
  design: CardDesign
  /** Human-readable card label, e.g. "Student ID" — appears above the title. */
  subtitle?: string
  /** Big title (e.g. "Cloud Computing Specialist", credential name). */
  title: string
  /** Holder's full name (rendered above the fields). */
  holder?: string
  /** Up to 4–6 fields rendered in the bottom-right grid. */
  fields?: CredentialField[]
  /** Single-line footer (e.g. "Issued by Department of Motor Vehicles"). */
  footer?: string
  /** Compact mode (used in lists / proof rows) — wider aspect ratio. */
  compact?: boolean
  /** Photo slot mode. False hides the slot and lets fields go full-width. */
  photo?: PhotoMode
  /** Photo source for `silhouette` mode — pass `{ uri: ... }` for actual portraits. */
  photoSource?: ImageSourcePropType
  /** Monogram fallback for `seal` mode (e.g. holder initials). */
  monogram?: string
  /** Override the card width; defaults to `100%` of parent. */
  width?: DimensionValue
}

// Layout → photo default + aspect ratio + compact-aspect.
// Photo layouts use a chunkier card so the 4:5 portrait fills the body row.
// 1.45 ≈ standard ISO/IEC 7810 ID-1 card aspect (1.586) shortened slightly to
// leave room for the title row above the photo.
const LAYOUT_PROFILE: Record<
  CardLayout,
  { aspect: number; compactAspect: number; defaultPhoto: PhotoMode }
> = {
  'employee-badge': { aspect: 1.45, compactAspect: 1.9, defaultPhoto: 'silhouette' },
  mdl: { aspect: 1.45, compactAspect: 1.9, defaultPhoto: 'silhouette' },
  alumni: { aspect: 1.5, compactAspect: 1.9, defaultPhoto: 'seal' },
  'deans-list': { aspect: 1.4, compactAspect: 2.2, defaultPhoto: 'seal' },
  'professional-license': { aspect: 1.45, compactAspect: 1.9, defaultPhoto: 'silhouette' },
  'student-id': { aspect: 1.45, compactAspect: 1.9, defaultPhoto: 'silhouette' },
  diploma: { aspect: 1.5, compactAspect: 2.2, defaultPhoto: 'seal' },
  'generic-portrait': { aspect: 1.45, compactAspect: 1.9, defaultPhoto: 'placeholder' },
  'generic-landscape': { aspect: 2.0, compactAspect: 2.4, defaultPhoto: false },
}

export const DCCredentialCard: React.FC<DCCredentialCardProps> = ({
  design,
  subtitle,
  title,
  holder,
  fields = [],
  footer,
  compact = false,
  photo,
  photoSource,
  monogram,
  width = '100%',
}) => {
  // Diploma is a fundamentally different layout (formal certificate, centered
  // text, ornamental border, gold seal at bottom). Hand off to its own
  // component instead of fighting the wallet-card grid.
  if (design.layout === 'diploma') {
    return (
      <DiplomaCard
        design={design}
        title={title}
        subtitle={subtitle}
        holder={holder}
        fields={fields}
        footer={footer}
        compact={compact}
        width={width}
      />
    )
  }

  const profile = LAYOUT_PROFILE[design.layout]
  const resolvedPhoto: PhotoMode = photo ?? profile.defaultPhoto
  const showPhoto = resolvedPhoto !== false
  const aspect = compact ? profile.compactAspect : profile.aspect
  // 2-column field grid in both modes — keeps the card feeling balanced and
  // gives every cell some breathing room. With photo: 2×3 = 6 fields max.
  // Without photo: 2×4 = 8 fields max (and the row is wider).
  const fieldCols = 2
  const fieldsMax = !showPhoto ? 8 : 6
  const Glyph = getGlyphComponent(design.glyph)

  // 3-stop linear gradient @ 0/60/100, 135° diagonal (top-left → bottom-right).
  // Mirrors mockup: linear-gradient(135deg, color 0%, dark 60%, tint 100%).
  const primary = design.background.primary
  const secondary = design.background.secondary ?? shade(primary, -0.3)
  const tint = design.background.tint ?? shade(secondary, -0.4)
  const gradientStops = [primary, secondary, tint]
  const gradientLocations = [0, 0.6, 1]

  return (
    <View style={[styles.outer, { width, aspectRatio: aspect }]}>
      <LinearGradient
        colors={gradientStops}
        locations={gradientLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Sheen overlay was dropped — barely visible on the dark palettes we
          ship and the extra absolute-fill gradient layer doubled overdraw per
          card. The 3-stop base gradient already gives plenty of depth. */}

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[styles.subtitle, { color: withAlpha(design.textColor, 0.85) }]} numberOfLines={1}>
              {(subtitle ?? '').toUpperCase()}
            </Text>
            <Text style={[styles.title, { color: design.textColor }]} numberOfLines={2}>
              {title}
            </Text>
          </View>
          {Glyph ? (
            <View style={[styles.glyphFrame, { backgroundColor: withAlpha(design.textColor, 0.18) }]}>
              <Glyph size={22} color={design.textColor} />
            </View>
          ) : null}
        </View>

        {/* Body row fills the rest of the card. Photo column stretches to the
            full height of this area; the right column holds the holder name
            and the field grid. No wasted spacer. */}
        <View style={styles.bodyRow}>
          {showPhoto ? (
            <View
              style={[
                styles.photoFrame,
                {
                  backgroundColor:
                    resolvedPhoto === 'seal'
                      ? withAlpha(design.textColor, 0.18)
                      : withAlpha(design.textColor, 0.14),
                  borderStyle: resolvedPhoto === 'placeholder' ? 'dashed' : 'solid',
                  borderColor:
                    resolvedPhoto === 'placeholder'
                      ? withAlpha(design.textColor, 0.4)
                      : withAlpha(design.textColor, 0.18),
                },
              ]}
            >
              <PhotoContent
                mode={resolvedPhoto}
                color={design.textColor}
                glyphKind={design.glyph}
                photoSource={photoSource}
                monogram={monogram}
              />
            </View>
          ) : null}

          <View style={styles.infoColumn}>
            {holder ? (
              <Text style={[styles.holder, { color: design.textColor }]} numberOfLines={2}>
                {holder}
              </Text>
            ) : null}
            <FieldGrid fields={fields.slice(0, fieldsMax)} columns={fieldCols} textColor={design.textColor} />
          </View>
        </View>

        {footer ? (
          <Text style={[styles.footer, { color: withAlpha(design.textColor, 0.7) }]} numberOfLines={1}>
            {footer}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

const PhotoContent: React.FC<{
  mode: Exclude<PhotoMode, false>
  color: string
  glyphKind?: CardDesign['glyph']
  photoSource?: ImageSourcePropType
  monogram?: string
}> = ({ mode, color, glyphKind, photoSource, monogram }) => {
  if (mode === 'silhouette' && photoSource) {
    return <Image source={photoSource} style={styles.photoImage} resizeMode="cover" />
  }
  const Glyph = getGlyphComponent(glyphKind)
  if (mode === 'seal') {
    return monogram ? (
      <Text style={{ color, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 }}>{monogram}</Text>
    ) : Glyph ? (
      <Glyph size={20} color={color} />
    ) : null
  }
  // 'placeholder' or silhouette-without-photo fallback: generic head/shoulders
  return (
    <View style={styles.placeholderFigure}>
      <View style={[styles.placeholderHead, { backgroundColor: withAlpha(color, 0.85) }]} />
      <View style={[styles.placeholderShoulders, { backgroundColor: withAlpha(color, 0.85) }]} />
    </View>
  )
}

const FieldGrid: React.FC<{
  fields: CredentialField[]
  columns: number
  textColor: string
}> = ({ fields, columns, textColor }) => {
  if (!fields.length) return null
  const rows: CredentialField[][] = []
  for (let i = 0; i < fields.length; i += columns) {
    rows.push(fields.slice(i, i + columns))
  }
  return (
    <View>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.fieldRow}>
          {row.map((f, fi) => (
            <View key={fi} style={styles.fieldCell}>
              <Text style={[styles.fieldLabel, { color: withAlpha(textColor, 0.7) }]} numberOfLines={1}>
                {f.label.toUpperCase()}
              </Text>
              <Text style={[styles.fieldValue, { color: textColor }]} numberOfLines={1}>
                {f.value}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

// =============================================================================
// Color helpers
// =============================================================================

function withAlpha(hex: string, alpha: number): string {
  // accepts '#RRGGBB' or 'rgba(…)'; passes through unchanged if already rgba/rgb
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function shade(hex: string, ratio: number): string {
  // ratio in [-1, 1]; negative darkens, positive lightens.
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  let r = (n >> 16) & 0xff
  let g = (n >> 8) & 0xff
  let b = n & 0xff
  const t = ratio < 0 ? 0 : 255
  const p = Math.abs(ratio)
  r = Math.round((t - r) * p + r)
  g = Math.round((t - g) * p + g)
  b = Math.round((t - b) * p + b)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 18,
    overflow: 'hidden',
    // Trimmed from elevation:8 — Android composites elevation onto a separate
    // texture layer per draw, which is expensive when the card lives inside a
    // list and re-paints on scroll.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 3,
  },
  content: {
    flex: 1,
    padding: 18,
    paddingHorizontal: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 22,
  },
  glyphFrame: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  photoFrame: {
    // Portrait stretches to fill the full body-row height. Aspect ratio gives
    // it a real ID-photo look (4:5).
    width: 104,
    aspectRatio: 4 / 5,
    borderRadius: 10,
    marginRight: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImage: { width: '100%', height: '100%' },
  placeholderFigure: { alignItems: 'center', justifyContent: 'flex-end', flex: 1 },
  placeholderHead: { width: 32, height: 32, borderRadius: 16, marginTop: 14 },
  placeholderShoulders: {
    width: 58,
    height: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: 6,
  },
  infoColumn: {
    flex: 1,
    minWidth: 0,
    // Top-align so attributes start right after the title row — no awkward
    // empty band between header and content.
    justifyContent: 'flex-start',
  },
  holder: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 7,
  },
  fieldCell: {
    flex: 1,
    paddingRight: 8,
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: '600',
  },
  fieldValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.3,
    marginTop: 10,
    textAlign: 'right',
  },
})

export default DCCredentialCard
