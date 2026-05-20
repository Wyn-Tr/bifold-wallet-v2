// Primary + secondary action stack — full-width buttons, vertical layout.
// Used at the bottom of Offer / Proof-request / Accept-loading / Success screens.

import React from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native'

import { DC_PALETTE } from '../tokens'
import { DCIcon, DCIconName } from './DCIcon'

export interface DCActionRowProps {
  primaryLabel: string
  onPrimary: () => void
  primaryIcon?: DCIconName
  primaryDisabled?: boolean
  primaryLoading?: boolean

  secondaryLabel?: string
  onSecondary?: () => void
  secondaryStyle?: 'outline' | 'ghost'

  style?: ViewStyle
}

export const DCActionRow: React.FC<DCActionRowProps> = ({
  primaryLabel,
  onPrimary,
  primaryIcon,
  primaryDisabled,
  primaryLoading,
  secondaryLabel,
  onSecondary,
  secondaryStyle = 'outline',
  style,
}) => (
  <View style={[styles.container, style]}>
    <TouchableOpacity
      onPress={onPrimary}
      disabled={primaryDisabled || primaryLoading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={primaryLabel}
      style={[styles.primary, { opacity: primaryDisabled ? 0.5 : 1 }]}
    >
      {primaryLoading ? (
        <ActivityIndicator color="#062826" />
      ) : (
        <View style={styles.primaryInner}>
          {primaryIcon ? (
            <View style={{ marginRight: 8 }}>
              <DCIcon name={primaryIcon} size={18} color="#062826" />
            </View>
          ) : null}
          <Text style={styles.primaryText}>{primaryLabel}</Text>
        </View>
      )}
    </TouchableOpacity>

    {secondaryLabel ? (
      <TouchableOpacity
        onPress={onSecondary}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={secondaryLabel}
        style={secondaryStyle === 'outline' ? styles.secondaryOutline : styles.secondaryGhost}
      >
        <Text style={[styles.secondaryText, secondaryStyle === 'ghost' ? styles.secondaryGhostText : null]}>
          {secondaryLabel}
        </Text>
      </TouchableOpacity>
    ) : null}
  </View>
)

const styles = StyleSheet.create({
  container: {
    marginTop: 22,
    gap: 10,
  },
  primary: {
    backgroundColor: DC_PALETTE.accent,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryInner: { flexDirection: 'row', alignItems: 'center' },
  primaryText: { color: '#062826', fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
  secondaryOutline: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  secondaryGhost: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  secondaryGhostText: { color: DC_PALETTE.muted, fontWeight: '500' },
})

export default DCActionRow
