import React from 'react'
import Svg, { Path } from 'react-native-svg'

import { GlyphProps } from './BadgeGlyph'

export const GraduationCapGlyph: React.FC<GlyphProps> = ({ size = 22, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M2 10l10-4 10 4-10 4-10-4z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
    <Path
      d="M6 12v4c0 1.6 2.7 3 6 3s6-1.4 6-3v-4"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
    />
    <Path d="M20 11v5" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
  </Svg>
)

export default GraduationCapGlyph
