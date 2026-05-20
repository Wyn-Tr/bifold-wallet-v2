// Formal certificate layout — ports `/Digicred Wallet/screens.jsx`
// CredentialDetailDiploma hero (lines 1206-1280) to React Native.
//
// Centered, ornamental — not the wallet-card grid. Gold seal at the bottom,
// "CONFERRED ── seal ── HONORS" footer row, ornamental inner border.

import React from 'react'
import { View, Text, StyleSheet, DimensionValue } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'

import { getGlyphComponent } from '../glyphs'
import { CardDesign } from '../types'
import { CredentialField } from './DCCredentialCard'

export interface DiplomaCardProps {
  design: CardDesign
  title: string
  subtitle?: string
  holder?: string
  fields?: CredentialField[]
  footer?: string
  compact?: boolean
  width?: DimensionValue
}

const DiplomaCard: React.FC<DiplomaCardProps> = ({
  design,
  title,
  subtitle,
  holder,
  fields = [],
  footer,
  compact = false,
  width = '100%',
}) => {
  const aspect = compact ? 2.0 : 1.45
  const Glyph = getGlyphComponent(design.glyph ?? 'diploma')
  const Seal = getGlyphComponent('seal')

  // Mockup matches the bottom row to specific labels:
  //   left:  CONFERRED · <date_conferred|issue_date|graduation_year>
  //   right: HONORS    · <honors|gpa|major>  (whatever's available)
  const pickField = (...labels: string[]): CredentialField | null => {
    for (const lbl of labels) {
      const hit = fields.find((f) => f.label.toLowerCase().replace(/\s+/g, '_').includes(lbl))
      if (hit) return hit
    }
    return null
  }
  const conferred = pickField('conferred', 'graduation', 'issue')
  const honors = pickField('honor', 'gpa', 'major', 'distinction')

  const primary = design.background.primary
  const secondary = design.background.secondary ?? primary
  const tint = design.background.tint ?? primary

  return (
    <View style={[styles.outer, { width, aspectRatio: aspect }]}>
      <LinearGradient
        colors={[primary, secondary, tint]}
        locations={[0, 0.55, 1]}
        // 155° in CSS ≈ start at top-right, end at bottom-left.
        start={{ x: 0.95, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Ornamental inner border (the "certificate" frame). */}
      <View style={styles.ornamentBorder} pointerEvents="none" />
      <View style={styles.ornamentInnerShadow} pointerEvents="none" />

      {/* Subtle sheen overlay. */}
      <LinearGradient
        colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.18)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.content}>
        {/* University · Est. line */}
        <Text style={[styles.universityLine, { color: withAlpha(design.textColor, 0.75) }]} numberOfLines={1}>
          {(subtitle ?? 'DIPLOMA').toUpperCase()}
        </Text>

        {/* Glyph between two horizontal rules (mockup line 1235-1239). */}
        <View style={styles.glyphRow}>
          <View style={[styles.rule, { backgroundColor: withAlpha(design.textColor, 0.35) }]} />
          {Glyph ? <Glyph size={26} color={design.accentColor ?? '#E6D9A2'} /> : null}
          <View style={[styles.rule, { backgroundColor: withAlpha(design.textColor, 0.35) }]} />
        </View>

        <Text style={[styles.kicker, { color: withAlpha(design.textColor, 0.75) }]}>
          THIS CERTIFIES THAT
        </Text>
        <Text
          style={[
            styles.recipientName,
            { color: design.textColor, fontSize: recipientFontSize(holder) },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          ellipsizeMode="tail"
        >
          {holder ?? 'the holder'}
        </Text>

        <Text style={[styles.kicker, { color: withAlpha(design.textColor, 0.75), marginTop: 10 }]}>
          HAS BEEN AWARDED
        </Text>
        <Text style={[styles.awardTitle, { color: design.textColor }]} numberOfLines={2}>
          {title}
        </Text>

        {/* Footer: CONFERRED · seal · HONORS */}
        <View style={[styles.footerRow, { borderTopColor: withAlpha(design.textColor, 0.18) }]}>
          <View style={styles.footerCell}>
            <Text style={[styles.footerLabel, { color: withAlpha(design.textColor, 0.7) }]}>
              {conferred ? conferred.label.toUpperCase() : 'CONFERRED'}
            </Text>
            <Text style={[styles.footerValue, { color: design.textColor }]} numberOfLines={1}>
              {conferred?.value ?? '—'}
            </Text>
          </View>

          <View style={styles.sealWrap}>
            <LinearGradient
              colors={['#E8D8A0', '#B8973F', '#8A6A20']}
              locations={[0, 0.7, 1]}
              start={{ x: 0.35, y: 0.3 }}
              end={{ x: 1, y: 1 }}
              style={styles.seal}
            >
              {Seal ? <Seal size={22} color="#3A2A0A" /> : null}
            </LinearGradient>
          </View>

          <View style={[styles.footerCell, { alignItems: 'flex-end' }]}>
            <Text style={[styles.footerLabel, { color: withAlpha(design.textColor, 0.7), textAlign: 'right' }]}>
              {honors ? honors.label.toUpperCase() : 'HONORS'}
            </Text>
            <Text
              style={[styles.footerValue, { color: design.textColor, textAlign: 'right' }]}
              numberOfLines={1}
            >
              {honors?.value ?? '—'}
            </Text>
          </View>
        </View>

        {footer ? (
          <Text style={[styles.bottomFootnote, { color: withAlpha(design.textColor, 0.6) }]} numberOfLines={1}>
            {footer}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

function recipientFontSize(holder?: string): number {
  const len = (holder ?? '').length
  if (len > 30) return 14
  if (len > 22) return 17
  return 22
}

function withAlpha(hex: string, alpha: number): string {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 9,
  },
  ornamentBorder: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  ornamentInnerShadow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    bottom: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
    paddingVertical: 20,
    alignItems: 'center',
  },
  universityLine: {
    fontSize: 9,
    letterSpacing: 3,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  glyphRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  rule: {
    width: 28,
    height: 1,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  recipientName: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
    // RN doesn't ship Cormorant — use the system serif fallback. iOS picks
    // "Times New Roman", Android picks the platform serif.
    fontFamily: 'serif',
  },
  awardTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 12,
    borderTopWidth: 1,
    width: '100%',
  },
  footerCell: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 8,
    letterSpacing: 1.4,
    fontWeight: '600',
  },
  footerValue: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  sealWrap: {
    width: 46,
    height: 46,
    marginHorizontal: 12,
  },
  seal: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  bottomFootnote: {
    fontSize: 9,
    letterSpacing: 0.4,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
})

export default DiplomaCard
