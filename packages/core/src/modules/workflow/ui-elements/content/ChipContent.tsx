import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { ContentProps, ContentRegistry } from '../ContentRegistry'

const ChipContent: React.FC<ContentProps> = ({ item, colors, onAction }) => {
  const label = (item.label as string | undefined) ?? (item.text as string | undefined) ?? 'Chip'
  const selected = item.selected === true || item.selected === 'true'
  const event = item.event as string | undefined
  const input = item.input as Record<string, unknown> | undefined
  const tone = (item.tone as string | undefined) ?? 'default'

  const baseBg = selected ? colors.primary : 'transparent'
  const baseBorder = selected ? colors.primary : colors.border
  const baseText = selected ? '#ffffff' : colors.text
  const toneOverrides: Record<string, { bg: string; border: string; text: string }> = {
    success: { bg: '#1f8a3b22', border: '#1f8a3b', text: '#1f8a3b' },
    danger: { bg: '#b3261e22', border: '#b3261e', text: '#b3261e' },
  }
  const palette = !selected && toneOverrides[tone]
    ? toneOverrides[tone]
    : { bg: baseBg, border: baseBorder, text: baseText }

  const Content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.bg,
        gap: 6,
      }}
    >
      {item.icon ? <Text style={{ fontSize: 14 }}>{String(item.icon)}</Text> : null}
      <Text style={{ color: palette.text, fontSize: 13, fontWeight: selected ? '600' : '500' }}>{label}</Text>
    </View>
  )

  if (!event) {
    return Content
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={item.disabled === true}
      onPress={() => onAction(event, input ?? {})}
    >
      {Content}
    </TouchableOpacity>
  )
}

ContentRegistry.register('chip', ChipContent)

export default ChipContent
