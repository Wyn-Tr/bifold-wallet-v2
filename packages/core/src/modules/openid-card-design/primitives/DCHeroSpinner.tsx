// Big dashed-arc spinner — ports `HeroSpinner` from /Digicred Wallet/.
//
// Implementation note: we previously wrapped an `<Svg><Circle/></Svg>` inside
// `Animated.View` for the rotation. On Android, `react-native-svg` renders the
// SVG as its own native graphics layer and the parent `Animated.View`'s
// UI-thread `rotate` transform did not propagate to that sub-layer — the arc
// drew correctly but never spun. Switching to plain View borders (the same
// pattern that powers the empty-state ripple rings) makes the rotation the
// layer's own transform, which Reanimated drives reliably on both platforms.

import React from 'react'
import Animated from 'react-native-reanimated'

import { useSpin } from '../animations'
import { useScreenFocused } from '../animations/useScreenFocused'
import { DC_PALETTE } from '../tokens'

export interface DCHeroSpinnerProps {
  size?: number
  color?: string
  thickness?: number
}

export const DCHeroSpinner: React.FC<DCHeroSpinnerProps> = ({
  size = 92,
  color = DC_PALETTE.accent,
  thickness = 3,
}) => {
  const focused = useScreenFocused()
  const { style } = useSpin(900, focused)

  // 3/4 arc — top + right + bottom borders coloured, left transparent. Rotates
  // continuously so it reads as a dashed-looking loader sweeping around the
  // circle. (RN can't render true `strokeDasharray` dashes on a View border;
  // a partial arc is the closest reliable equivalent without re-introducing
  // SVG and its propagation problem.)
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: thickness,
          borderTopColor: color,
          borderRightColor: color,
          borderBottomColor: color,
          borderLeftColor: 'transparent',
        },
        style,
      ]}
    />
  )
}

export default DCHeroSpinner
