// Expanding glow ring — ports `@keyframes dw-pulse-ring`
// (scale 1 → 1.8, opacity 0.7 → 0 over 1800ms). Used behind success checks.

import { useEffect } from 'react'
import { AccessibilityInfo } from 'react-native'
import {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

export interface PulseRingResult {
  style: ReturnType<typeof useAnimatedStyle>
}

export function usePulseRing(durationMs = 1800, enabled = true): PulseRingResult {
  const progress = useSharedValue(0)

  useEffect(() => {
    if (!enabled) {
      cancelAnimation(progress)
      progress.value = 0
      return
    }
    let cancelled = false
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled || reduceMotion) return
      progress.value = withRepeat(
        withTiming(1, { duration: durationMs, easing: Easing.out(Easing.quad) }),
        -1,
        false
      )
    })
    return () => {
      cancelled = true
      cancelAnimation(progress)
    }
  }, [durationMs, enabled, progress])

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 0.8 }],
    opacity: 0.7 * (1 - progress.value),
  }))

  return { style }
}
