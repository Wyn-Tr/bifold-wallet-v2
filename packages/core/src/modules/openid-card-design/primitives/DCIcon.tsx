// UI icons (not credential glyphs). Ports the non-credential variants of the
// `Glyph` factory from /Digicred Wallet/screens.jsx — back, home, verified,
// share, check, chevron-right, info, expand, trash, export, gear.

import React from 'react'
import Svg, { Circle, Path } from 'react-native-svg'

export type DCIconName =
  | 'back'
  | 'home'
  | 'verified'
  | 'share'
  | 'check'
  | 'chev'
  | 'expand'
  | 'info'
  | 'trash'
  | 'export'
  | 'gear'
  | 'close'

export interface DCIconProps {
  name: DCIconName
  size?: number
  color?: string
}

export const DCIcon: React.FC<DCIconProps> = ({ name, size = 22, color = '#FFFFFF' }) => {
  switch (name) {
    case 'back':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M15 6l-6 6 6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1v-9z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
        </Svg>
      )
    case 'verified':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2l2.5 1.8 3 .2.5 3 2 2.2L18.5 12 20 14.8l-2 2.2-.5 3-3 .2L12 22l-2.5-1.8-3-.2-.5-3-2-2.2L5.5 12 4 9.2l2-2.2L6.5 4l3-.2L12 2z"
            fill={color}
          />
          <Path d="M8.5 12l2.5 2.5L15.5 10" stroke="#062826" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )
    case 'share':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="6" cy="12" r="2.5" stroke={color} strokeWidth={1.8} />
          <Circle cx="17" cy="6" r="2.5" stroke={color} strokeWidth={1.8} />
          <Circle cx="17" cy="18" r="2.5" stroke={color} strokeWidth={1.8} />
          <Path d="M8.2 10.8L14.8 7.2M8.2 13.2L14.8 16.8" stroke={color} strokeWidth={1.8} />
        </Svg>
      )
    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M5 12l5 5L20 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )
    case 'chev':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )
    case 'expand':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )
    case 'info':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.7} />
          <Path d="M12 11v5M12 8v.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      )
    case 'trash':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12"
            stroke={color}
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )
    case 'export':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3v12M8 7l4-4 4 4"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M5 14v5a1 1 0 001 1h12a1 1 0 001-1v-5"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )
    case 'gear':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.8} />
          <Path
            d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
      )
    case 'close':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      )
    default:
      return null
  }
}

export default DCIcon
