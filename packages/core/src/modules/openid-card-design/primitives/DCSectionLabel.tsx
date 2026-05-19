// Uppercase muted section header — ports `SectionLabel` from /Digicred Wallet/.

import React from 'react'
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native'

import { DC_PALETTE } from '../tokens'

export interface DCSectionLabelProps {
  children: string
  style?: ViewStyle
  textStyle?: TextStyle
}

export const DCSectionLabel: React.FC<DCSectionLabelProps> = ({ children, style, textStyle }) => (
  <View style={[styles.container, style]}>
    <Text style={[styles.text, textStyle]}>{children.toUpperCase()}</Text>
  </View>
)

const styles = StyleSheet.create({
  container: { marginTop: 14, marginBottom: 8 },
  text: {
    color: DC_PALETTE.subMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
})

export default DCSectionLabel
