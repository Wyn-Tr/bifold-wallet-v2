import React from 'react'
import Svg, { Rect, Circle, Path } from 'react-native-svg'

export interface GlyphProps {
  size?: number
  color?: string
}

export const BadgeGlyph: React.FC<GlyphProps> = ({ size = 22, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="5" y="3" width="14" height="18" rx="2.5" stroke={color} strokeWidth={1.7} />
    <Circle cx="12" cy="9" r="2.4" stroke={color} strokeWidth={1.7} />
    <Path d="M8 16c.7-1.8 2.2-2.8 4-2.8s3.3 1 4 2.8" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    <Rect x="10" y="1.5" width="4" height="2.5" rx="0.8" fill={color} />
  </Svg>
)

export default BadgeGlyph
