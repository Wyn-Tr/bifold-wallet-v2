// Animated "no channels yet" empty-state illustration. Continuous outward
// waves of line rings emanate from the inbox in the center. Pure line art —
// every ring is moving, none are static.

import React, { useEffect } from 'react'
import { AccessibilityInfo, StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { useIsFocused } from '@react-navigation/native'

import { DigiCredColors } from '../theme'

export interface EmptyChannelHeroProps {
  size?: number
}

// Slow, large wave with a long visible life:
//  • 4 staggered rings → always 2–3 visible at once
//  • 4 second cycle → each ring lives longer
//  • opacity stays high until the last third of its life
const WAVE_COUNT = 4
const WAVE_DURATION = 4000
const INNER_SCALE = 0.44
const OUTER_SCALE = 1.0
const ACCENT = '#7DE0D5'

export const EmptyChannelHero: React.FC<EmptyChannelHeroProps> = ({ size = 220 }) => {
  // Four independent wave progress values, staggered so the line rings
  // emanate continuously rather than all together.
  const wave0 = useSharedValue(0)
  const wave1 = useSharedValue(0)
  const wave2 = useSharedValue(0)
  const wave3 = useSharedValue(0)

  const isFocused = useIsFocused()

  useEffect(() => {
    if (!isFocused) {
      cancelAnimation(wave0)
      cancelAnimation(wave1)
      cancelAnimation(wave2)
      cancelAnimation(wave3)
      return
    }
    let cancelled = false
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((reduced) => {
        if (cancelled || reduced) return
        const startWave = (sv: typeof wave0, delay: number) => {
          sv.value = withDelay(
            delay,
            withRepeat(withTiming(1, { duration: WAVE_DURATION, easing: Easing.out(Easing.cubic) }), -1, false)
          )
        }
        const stagger = WAVE_DURATION / WAVE_COUNT
        startWave(wave0, 0)
        startWave(wave1, stagger)
        startWave(wave2, stagger * 2)
        startWave(wave3, stagger * 3)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      cancelAnimation(wave0)
      cancelAnimation(wave1)
      cancelAnimation(wave2)
      cancelAnimation(wave3)
    }
  }, [isFocused, wave0, wave1, wave2, wave3])

  // Each wave ring: starts at the inner ring's edge, grows to the outer
  // edge, holds its opacity for most of its life, then fades only in the
  // last 25%. Math is inlined because `useAnimatedStyle`'s callback is a
  // Reanimated worklet that can't call regular JS helpers.
  const wave0Style = useAnimatedStyle(() => {
    const t = wave0.value
    const fade = t < 0.75 ? 0.7 : 0.7 * (1 - (t - 0.75) / 0.25)
    return {
      transform: [{ scale: 0.44 + t * 0.56 }],
      opacity: fade,
    }
  })
  const wave1Style = useAnimatedStyle(() => {
    const t = wave1.value
    const fade = t < 0.75 ? 0.7 : 0.7 * (1 - (t - 0.75) / 0.25)
    return {
      transform: [{ scale: 0.44 + t * 0.56 }],
      opacity: fade,
    }
  })
  const wave2Style = useAnimatedStyle(() => {
    const t = wave2.value
    const fade = t < 0.75 ? 0.7 : 0.7 * (1 - (t - 0.75) / 0.25)
    return {
      transform: [{ scale: 0.44 + t * 0.56 }],
      opacity: fade,
    }
  })
  const wave3Style = useAnimatedStyle(() => {
    const t = wave3.value
    const fade = t < 0.75 ? 0.7 : 0.7 * (1 - (t - 0.75) / 0.25)
    return {
      transform: [{ scale: 0.44 + t * 0.56 }],
      opacity: fade,
    }
  })

  const outerSize = size
  const innerSize = size * INNER_SCALE

  return (
    <View style={[styles.root, { width: outerSize, height: outerSize }]}>
      {/* Four expanding wave rings — staggered so the outermost is always
          visible while a new one is just leaving the center. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.wave,
          { width: outerSize, height: outerSize, borderRadius: outerSize / 2 },
          wave0Style,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.wave,
          { width: outerSize, height: outerSize, borderRadius: outerSize / 2 },
          wave1Style,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.wave,
          { width: outerSize, height: outerSize, borderRadius: outerSize / 2 },
          wave2Style,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.wave,
          { width: outerSize, height: outerSize, borderRadius: outerSize / 2 },
          wave3Style,
        ]}
      />

      {/* Center ring with the inbox icon — the source of the waves. */}
      <View
        style={[
          styles.innerRing,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            top: (outerSize - innerSize) / 2,
            left: (outerSize - innerSize) / 2,
          },
        ]}
      >
        <Icon name="inbox-outline" size={innerSize * 0.5} color={ACCENT} />
      </View>
    </View>
  )
}

// Reference outerScale so eslint doesn't flag the constant as unused — keeps
// the math symbols paired (inner/outer) for the next person reading this.
void OUTER_SCALE

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wave: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: ACCENT,
  },
  innerRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
})

// Reference DigiCredColors so theme is imported (kept for parity with sibling
// components; the hero hard-codes the accent for the stroke colour).
void DigiCredColors

export default EmptyChannelHero
