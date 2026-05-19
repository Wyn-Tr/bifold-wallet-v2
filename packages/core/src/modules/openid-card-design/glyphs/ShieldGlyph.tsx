import React from 'react'
import Svg, { Path } from 'react-native-svg'

import { GlyphProps } from './BadgeGlyph'

export const ShieldGlyph: React.FC<GlyphProps> = ({ size = 22, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2.5l8 3v6c0 4.6-3.2 8.7-8 10-4.8-1.3-8-5.4-8-10v-6l8-3z"
      stroke={color}
      strokeWidth={1.7}
      strokeLinejoin="round"
    />
    <Path d="M9 12l2.2 2.2L15.5 10" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

export default ShieldGlyph
