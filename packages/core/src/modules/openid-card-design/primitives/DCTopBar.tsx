// Teal page header — ports `TopBar` from /Digicred Wallet/screens.jsx.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { DC_PALETTE } from '../tokens'
import { DCIcon } from './DCIcon'

export interface DCTopBarProps {
  title: string
  onBack?: () => void
  onHome?: () => void
  style?: ViewStyle
  /** Override the bar background; defaults to the bright DC headerTeal. Pass
   *  'transparent' to let the underlying page gradient show through. */
  backgroundColor?: string
}

export const DCTopBar: React.FC<DCTopBarProps> = ({ title, onBack, onHome, style, backgroundColor }) => {
  const insets = useSafeAreaInsets()
  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 16) + 8,
          paddingBottom: 18,
          backgroundColor: backgroundColor ?? DC_PALETTE.headerTeal,
        },
        style,
      ]}
    >
      {/* Flex row so a long title can ellipsize within the title slot
          instead of sliding under the back button. */}
      <View style={styles.row}>
        <View style={styles.side}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <DCIcon name="back" size={26} color={DC_PALETTE.text} />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>

        <View style={[styles.side, styles.sideRight]}>
          {onHome ? (
            <TouchableOpacity
              onPress={onHome}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Home"
            >
              <DCIcon name="home" size={24} color={DC_PALETTE.text} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  )
}

const SIDE_WIDTH = 48

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  side: {
    width: SIDE_WIDTH,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: { alignItems: 'flex-end' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
})

export default DCTopBar
