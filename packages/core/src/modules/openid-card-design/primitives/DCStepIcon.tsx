// Step indicator — done/active/error/pending. The 'active' state rotates the
// dashed border via Reanimated. Ports `StepIcon` from /Digicred Wallet/.

import React from 'react'
import { View } from 'react-native'
import Animated from 'react-native-reanimated'

import { useSpin } from '../animations'
import { useScreenFocused } from '../animations/useScreenFocused'
import { DC_PALETTE } from '../tokens'
import { DCIcon } from './DCIcon'

export type DCStepState = 'pending' | 'active' | 'done' | 'error'

export interface DCStepIconProps {
  state: DCStepState
  size?: number
}

export const DCStepIcon: React.FC<DCStepIconProps> = ({ state, size = 28 }) => {
  const focused = useScreenFocused()
  // Only spin when the host screen is focused AND we're in the active state.
  // Avoids a UI-thread worklet ticking for off-screen steps and blurred screens.
  const { style: spinStyle } = useSpin(900, focused && state === 'active')

  if (state === 'done') {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: DC_PALETTE.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <DCIcon name="check" size={size * 0.55} color="#062826" />
      </View>
    )
  }
  if (state === 'error') {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: DC_PALETTE.danger,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <DCIcon name="close" size={size * 0.55} color="#FFFFFF" />
      </View>
    )
  }
  if (state === 'active') {
    // Same SVG-propagation workaround as DCHeroSpinner — a 3/4 arc made of
    // partial View borders rotates reliably on Android.
    return (
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderTopColor: DC_PALETTE.accent,
            borderRightColor: DC_PALETTE.accent,
            borderBottomColor: DC_PALETTE.accent,
            borderLeftColor: 'transparent',
          },
          spinStyle,
        ]}
      />
    )
  }
  // pending — empty outline circle
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.25)',
      }}
    />
  )
}

export default DCStepIcon
