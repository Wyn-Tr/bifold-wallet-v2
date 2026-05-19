// Continuous 360° rotation — ports `@keyframes dw-spin` from
// /Digicred Wallet/Credential Rendering.html. Respects Reduce Motion.

import { useEffect } from 'react'
import { AccessibilityInfo } from 'react-native'
import {
  cancelAnimation,
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

export interface SpinResult {
  rotation: SharedValue<number>
  style: ReturnType<typeof useAnimatedStyle>
}

export function useSpin(durationMs = 900, enabled = true): SpinResult {
  const rotation = useSharedValue(0)

  useEffect(() => {
    if (!enabled) {
      cancelAnimation(rotation)
      return
    }
    let cancelled = false
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled || reduceMotion) return
      rotation.value = withRepeat(
        withTiming(360, { duration: durationMs, easing: Easing.linear }),
        -1,
        false
      )
    })
    return () => {
      cancelled = true
      cancelAnimation(rotation)
    }
  }, [durationMs, enabled, rotation])

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  return { rotation, style }
}
