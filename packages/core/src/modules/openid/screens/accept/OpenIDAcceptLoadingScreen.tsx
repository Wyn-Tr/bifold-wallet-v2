// Dark-teal 4-step "accepting…" screen. Ports `AcceptLoadingStepper` from
// /Digicred Wallet/screens.jsx. Consumes the AcceptProgress event stream
// emitted by offerResolve.tsx (call `emitAcceptStep()` at each milestone).

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  DC_PALETTE,
  DCActionRow,
  DCStepRow,
  DCTopBar,
  getGlyphComponent,
} from '../../../openid-card-design'
import { usePulse } from '../../../openid-card-design/animations'
import { useScreenFocused } from '../../../openid-card-design/animations/useScreenFocused'
import {
  ACCEPT_STEPS,
  AcceptStep,
  stateForStep,
  useCredentialOfferProgress,
} from '../../hooks/useCredentialOfferProgress'

import type { CardDesign } from '../../../openid-card-design'

export interface OpenIDAcceptLoadingScreenProps {
  /** Card design for the credential being received — drives the hero color. */
  design?: CardDesign | null
  /** Credential type label (e.g. "Student ID"). */
  credentialName?: string
  /** Issuer display name. */
  issuerName?: string
  onCancel?: () => void
  /** Override the live progress (mostly for previews/dev gallery). */
  forcedStep?: AcceptStep
  onBack?: () => void
}

export const OpenIDAcceptLoadingScreen: React.FC<OpenIDAcceptLoadingScreenProps> = ({
  design,
  credentialName = 'Credential',
  issuerName,
  onCancel,
  forcedStep,
  onBack,
}) => {
  const { step } = useCredentialOfferProgress()
  const current = forcedStep ?? step
  const focused = useScreenFocused()
  const { style: pulseStyle } = usePulse(0.04, 1800, focused)
  const Glyph = getGlyphComponent(design?.glyph)
  const heroColor = design?.background.primary ?? DC_PALETTE.accent

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <DCTopBar title="Adding credential" onBack={onBack} />
      <View style={styles.body}>
        <Animated.View
          style={[
            styles.hero,
            { backgroundColor: heroColor, shadowColor: heroColor },
            pulseStyle,
          ]}
        >
          {Glyph ? <Glyph size={36} color={design?.textColor ?? '#FFFFFF'} /> : null}
        </Animated.View>

        <Text style={styles.title}>{credentialName}</Text>
        {issuerName ? <Text style={styles.subtitle}>{issuerName}</Text> : null}

        <View style={styles.stepsCard}>
          {ACCEPT_STEPS.map((s, i) => {
            const state = stateForStep(current, s.key)
            return (
              <View key={s.key}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <DCStepRow state={state} label={s.label} hint={s.hint} />
              </View>
            )
          })}
        </View>

        <View style={{ flex: 1 }} />

        {onCancel ? (
          <DCActionRow
            primaryLabel="Cancel"
            onPrimary={onCancel}
            primaryIcon="close"
            primaryDisabled={current === 'saving' || current === 'done'}
          />
        ) : null}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DC_PALETTE.bg },
  body: { flex: 1, padding: 24, alignItems: 'center' },
  hero: {
    width: 82,
    height: 82,
    borderRadius: 22,
    marginTop: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  title: { color: '#FFFFFF', fontSize: 19, fontWeight: '700', marginTop: 18, textAlign: 'center' },
  subtitle: { color: DC_PALETTE.muted, fontSize: 13, marginTop: 4, textAlign: 'center' },
  stepsCard: {
    marginTop: 28,
    width: '100%',
    backgroundColor: DC_PALETTE.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DC_PALETTE.cardBorder,
    padding: 8,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: DC_PALETTE.divider, marginLeft: 40 },
})

export default OpenIDAcceptLoadingScreen
