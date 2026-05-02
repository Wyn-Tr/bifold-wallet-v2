import React from 'react'
import { Text, View } from 'react-native'
import { ContentProps, ContentRegistry } from '../ContentRegistry'

const TONES: Record<string, { bg: string; fg: string }> = {
  default: { bg: '#e5e7eb', fg: '#1f2937' },
  green: { bg: '#dcfce7', fg: '#166534' },
  red: { bg: '#fee2e2', fg: '#991b1b' },
  amber: { bg: '#fef3c7', fg: '#92400e' },
  blue: { bg: '#dbeafe', fg: '#1e3a8a' },
  purple: { bg: '#ede9fe', fg: '#5b21b6' },
}

const BadgeContent: React.FC<ContentProps> = ({ item }) => {
  const label = (item.label as string | undefined) ?? (item.text as string | undefined) ?? ''
  const tone = (item.tone as string | undefined) ?? 'default'
  const palette = TONES[tone] ?? TONES.default

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: palette.bg,
      }}
    >
      <Text style={{ color: palette.fg, fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  )
}

ContentRegistry.register('badge', BadgeContent)

export default BadgeContent
