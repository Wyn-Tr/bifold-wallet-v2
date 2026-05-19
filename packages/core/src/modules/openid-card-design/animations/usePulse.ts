// Scale pulse — ports `@keyframes dw-pulse` (1.0 → 1.04 → 1.0 over 1800ms).
// Used on the hero mark in OpenIDAcceptLoadingScreen and the success check.

import { useEffect } from 'react'
import { AccessibilityInfo } from 'react-native'
import {
  cancelAnimation,
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

export interface PulseResult {
  scale: SharedValue<number>
  style: ReturnType<typeof useAnimatedStyle>
}

export function usePulse(amplitude = 0.04, durationMs = 1800, enabled = true): PulseResult {
  const scale = useSharedValue(1)

  useEffect(() => {
    if (!enabled) {
      cancelAnimation(scale)
      scale.value = 1
      return
    }
    let cancelled = false
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled || reduceMotion) return
      const half = durationMs / 2
      scale.value = withRepeat(
        withSequence(
          withTiming(1 + amplitude, { duration: half, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: half, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      )
    })
    return () => {
      cancelled = true
      cancelAnimation(scale)
    }
  }, [amplitude, durationMs, enabled, scale])

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return { scale, style }
}
