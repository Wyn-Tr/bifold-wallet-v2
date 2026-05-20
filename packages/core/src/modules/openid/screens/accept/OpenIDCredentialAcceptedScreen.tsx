// Dark-teal success screen — credential added. Big pulsing check + receipt.

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  DC_PALETTE,
  DCActionRow,
  DCAttrList,
  DCIcon,
  DCTopBar,
} from '../../../openid-card-design'
import { usePulse, usePulseRing } from '../../../openid-card-design/animations'
import { useScreenFocused } from '../../../openid-card-design/animations/useScreenFocused'

export interface OpenIDCredentialAcceptedScreenProps {
  credentialName: string
  issuerName?: string
  /** Attribute summary shown in the receipt card. */
  attributes?: { label: string; value?: string }[]
  onDone: () => void
  onSecondary?: () => void
  secondaryLabel?: string
}

export const OpenIDCredentialAcceptedScreen: React.FC<OpenIDCredentialAcceptedScreenProps> = ({
  credentialName,
  issuerName,
  attributes,
  onDone,
  onSecondary,
  secondaryLabel,
}) => {
  const focused = useScreenFocused()
  const { style: pulseStyle } = usePulse(0.06, 1800, focused)
  const { style: ringStyle } = usePulseRing(1800, focused)

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <DCTopBar title="Credential added" />
      <View style={styles.body}>
        <View style={styles.heroArea}>
          <Animated.View style={[styles.ring, ringStyle]} />
          <Animated.View style={[styles.hero, pulseStyle]}>
            <DCIcon name="check" size={44} color="#062826" />
          </Animated.View>
        </View>

        <Text style={styles.title}>Added to wallet</Text>
        <Text style={styles.subtitle}>
          {credentialName}
          {issuerName ? ` · ${issuerName}` : ''}
        </Text>

        {attributes && attributes.length > 0 ? (
          <View style={{ width: '100%', marginTop: 20 }}>
            <DCAttrList items={attributes} dense />
          </View>
        ) : null}

        <View style={{ flex: 1 }} />

        <DCActionRow
          primaryLabel="Done"
          onPrimary={onDone}
          secondaryLabel={secondaryLabel}
          onSecondary={onSecondary}
          secondaryStyle="ghost"
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DC_PALETTE.bg },
  body: { flex: 1, padding: 24, alignItems: 'center' },
  heroArea: {
    width: 96,
    height: 96,
    marginTop: 36,
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
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', marginTop: 20 },
  subtitle: { color: DC_PALETTE.muted, fontSize: 14, marginTop: 6, textAlign: 'center' },
})

export default OpenIDCredentialAcceptedScreen
