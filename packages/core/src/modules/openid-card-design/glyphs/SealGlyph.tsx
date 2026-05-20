import React from 'react'
import Svg, { Circle, Path } from 'react-native-svg'

import { GlyphProps } from './BadgeGlyph'

export const SealGlyph: React.FC<GlyphProps> = ({ size = 22, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="10" r="6" stroke={color} strokeWidth={1.7} />
    <Path d="M9 10l2 2 4-4" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    <Path
      d="M8.5 15.5L7 22l5-2.5L17 22l-1.5-6.5"
      stroke={color}
      strokeWidth={1.7}
      strokeLinejoin="round"
    />
  </Svg>
)

export default SealGlyph
