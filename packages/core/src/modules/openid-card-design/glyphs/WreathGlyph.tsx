import React from 'react'
import Svg, { Path } from 'react-native-svg'

import { GlyphProps } from './BadgeGlyph'

export const WreathGlyph: React.FC<GlyphProps> = ({ size = 22, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 3l2 4 4.5.5-3.4 3 1 4.5L12 12.8 7.9 15l1-4.5L5.5 7.5 10 7l2-4z" fill={color} />
    <Path d="M6 17c2 1.2 4 1.8 6 1.8s4-.6 6-1.8" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
  </Svg>
)

export default WreathGlyph
