import React from 'react'
import Svg, { Circle, Path } from 'react-native-svg'

import { GlyphProps } from './BadgeGlyph'

export const DiplomaGlyph: React.FC<GlyphProps> = ({ size = 22, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 4h11l3 3v13a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z"
      stroke={color}
      strokeWidth={1.7}
      strokeLinejoin="round"
    />
    <Path d="M16 4v3h3" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
    <Circle cx="12" cy="13" r="2.4" stroke={color} strokeWidth={1.7} />
    <Path
      d="M10.4 14.8L9.5 18l2.5-1.4 2.5 1.4-.9-3.2"
      stroke={color}
      strokeWidth={1.7}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </Svg>
)

export default DiplomaGlyph
