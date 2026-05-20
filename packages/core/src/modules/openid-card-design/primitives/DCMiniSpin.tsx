// Small inline spinner — ports `MiniSpin` from /Digicred Wallet/.

import React from 'react'
import { View } from 'react-native'
import Animated from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'

import { useSpin } from '../animations'
import { DC_PALETTE } from '../tokens'

export interface DCMiniSpinProps {
  size?: number
  color?: string
}

export const DCMiniSpin: React.FC<DCMiniSpinProps> = ({ size = 14, color = DC_PALETTE.accent }) => {
  const { style } = useSpin(750)
  const r = (size - 2) / 2
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[{ width: size, height: size }, style]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={1.6}
            strokeDasharray={`${(2 * Math.PI * r) / 5} ${(2 * Math.PI * r) / 5}`}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  )
}

export default DCMiniSpin
