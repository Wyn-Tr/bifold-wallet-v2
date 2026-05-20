import React from 'react'
import Svg, { Rect, Circle, Path } from 'react-native-svg'

import { GlyphProps } from './BadgeGlyph'

export const CarGlyph: React.FC<GlyphProps> = ({ size = 22, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="9" width="18" height="9" rx="2" stroke={color} strokeWidth={1.7} />
    <Path
      d="M6 9l1.6-3.4a2 2 0 011.8-1.1h5.2a2 2 0 011.8 1.1L18 9"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
    />
    <Circle cx="7.5" cy="18" r="1.6" fill={color} />
    <Circle cx="16.5" cy="18" r="1.6" fill={color} />
  </Svg>
)

export default CarGlyph
