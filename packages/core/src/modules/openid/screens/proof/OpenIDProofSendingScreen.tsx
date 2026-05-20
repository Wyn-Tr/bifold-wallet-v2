// Dark-teal "sending proof" screen — big hero spinner + 3-step trail.

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  DC_PALETTE,
  DCActionRow,
  DCHeroSpinner,
  DCIcon,
  DCStepRow,
  DCTopBar,
} from '../../../openid-card-design'
import {
  PROOF_STEPS,
  ProofStep,
  stateForProofStep,
  useProofPresentationProgress,
} from '../../hooks/useProofPresentationProgress'

export interface OpenIDProofSendingScreenProps {
  verifierName: string
  onCancel?: () => void
  forcedStep?: ProofStep
  onBack?: () => void
}

export const OpenIDProofSendingScreen: React.FC<OpenIDProofSendingScreenProps> = ({
  verifierName,
  onCancel,
  forcedStep,
  onBack,
}) => {
  const { step } = useProofPresentationProgress()
  const current = forcedStep ?? step

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <DCTopBar title="Proof Request" onBack={onBack} />
      <View style={styles.body}>
        <View style={styles.heroArea}>
          <DCHeroSpinner size={100} thickness={3} />
          <View style={styles.heroIcon}>
            <DCIcon name="share" size={28} color={DC_PALETTE.accent} />
          </View>
        </View>

        <Text style={styles.title}>Sharing proof</Text>
        <Text style={styles.subtitle}>{`with ${verifierName}`}</Text>

        <View style={styles.stepsCard}>
          {PROOF_STEPS.map((s, i) => {
            const state = stateForProofStep(current, s.key)
            return (
              <View key={s.key}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <DCStepRow state={state} label={s.label} />
              </View>
            )
          })}
        </View>

        <View style={{ flex: 1 }} />

        {onCancel ? (
          <DCActionRow
            primaryLabel="Cancel"
            primaryIcon="close"
            onPrimary={onCancel}
            primaryDisabled={current === 'done'}
          />
        ) : null}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DC_PALETTE.bg },
  body: { flex: 1, padding: 24, alignItems: 'center' },
  heroArea: {
    width: 100,
    height: 100,
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(125,224,213,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(125,224,213,0.2)',
  },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginTop: 20 },
  subtitle: { color: DC_PALETTE.muted, fontSize: 14, marginTop: 4 },
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

export default OpenIDProofSendingScreen
