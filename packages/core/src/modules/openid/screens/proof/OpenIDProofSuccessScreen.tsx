// Dark-teal "Proof shared" success screen — pulsing check + verifier receipt.
// Ports `ProofSuccessScreen()` from /Digicred Wallet/loading-screens.jsx.

import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  DC_PALETTE,
  DCActionRow,
  DCAttrList,
  DCIcon,
  DCSectionLabel,
} from '../../../openid-card-design'
import { usePulse, usePulseRing } from '../../../openid-card-design/animations'
import { useScreenFocused } from '../../../openid-card-design/animations/useScreenFocused'

export interface OpenIDProofSuccessScreenProps {
  verifierName: string
  verifierDomain?: string
  /** ISO timestamp the verifier acknowledged at — or a pre-formatted string. */
  sharedAt?: string
  /** Attributes that were actually shared (read-only receipt). */
  sharedAttributes?: { label: string; value?: string }[]
  onDone: () => void
  onViewActivity?: () => void
  onBack?: () => void
}

export const OpenIDProofSuccessScreen: React.FC<OpenIDProofSuccessScreenProps> = ({
  verifierName,
  verifierDomain,
  sharedAt,
  sharedAttributes,
  onDone,
  onViewActivity,
}) => {
  const focused = useScreenFocused()
  const { style: pulseStyle } = usePulse(0.06, 1800, focused)
  const { style: ringStyle } = usePulseRing(1800, focused)

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={DC_PALETTE.bgGrad as unknown as string[]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroArea}>
            <Animated.View style={[styles.ring, ringStyle]} />
            <Animated.View style={[styles.hero, pulseStyle]}>
              <DCIcon name="check" size={44} color={DC_PALETTE.bg} />
            </Animated.View>
          </View>

          <Text style={styles.title}>Proof shared</Text>
          <Text style={styles.subtitle}>
            {`${verifierName} has received your credentials. Their site should now let you continue.`}
          </Text>

          <View style={styles.receiptCard}>
            <View style={styles.receiptHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.receiptVerifier} numberOfLines={1}>
                  {verifierName}
                </Text>
                {verifierDomain ? (
                  <Text style={styles.receiptDomain} numberOfLines={1}>
                    {verifierDomain}
                  </Text>
                ) : null}
              </View>
              {sharedAt ? <Text style={styles.receiptTime}>{sharedAt}</Text> : null}
            </View>

            {sharedAttributes && sharedAttributes.length > 0 ? (
              <>
                <DCSectionLabel style={{ marginTop: 12, marginBottom: 8 }}>
                  {`Shared ${sharedAttributes.length} attribute${sharedAttributes.length === 1 ? '' : 's'}`}
                </DCSectionLabel>
                <DCAttrList items={sharedAttributes} dense />
              </>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <DCActionRow
            primaryLabel="Done"
            onPrimary={onDone}
            secondaryLabel={onViewActivity ? 'View in activity log' : undefined}
            onSecondary={onViewActivity}
            secondaryStyle="ghost"
          />
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DC_PALETTE.bg },
  safe: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  heroArea: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: DC_PALETTE.accent,
  },
  hero: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: DC_PALETTE.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: DC_PALETTE.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', marginTop: 22 },
  subtitle: {
    color: DC_PALETTE.muted,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  receiptCard: {
    width: '100%',
    marginTop: 24,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  receiptVerifier: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  receiptDomain: { color: DC_PALETTE.muted, fontSize: 12, marginTop: 2 },
  receiptTime: { color: DC_PALETTE.subMuted, fontSize: 11, marginTop: 2, marginLeft: 8 },
  actions: {
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
})

export default OpenIDProofSuccessScreen
