// Small square credential thumbnail used in list rows and the source-credential
// picker on the proof screen. Ports `CredentialMark` from screens.jsx.

import React from 'react'
import { StyleSheet, View } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'

import { getGlyphComponent } from '../glyphs'
import { CardDesign } from '../types'

export interface DCCredentialMarkProps {
  design: CardDesign
  size?: number
}

export const DCCredentialMark: React.FC<DCCredentialMarkProps> = ({ design, size = 56 }) => {
  const Glyph = getGlyphComponent(design.glyph)
  const colors = [design.background.primary, design.background.secondary ?? design.background.primary]
  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: Math.max(10, size * 0.25) },
      ]}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {Glyph ? <Glyph size={size * 0.5} color={design.textColor} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // Light shadow only — list rows render many of these per scroll frame and
    // Android `elevation` allocates a separate texture per item.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
})

export default DCCredentialMark
