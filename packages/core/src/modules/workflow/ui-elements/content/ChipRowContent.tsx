import React from 'react'
import { ScrollView, View } from 'react-native'
import { ContentProps, ContentRegistry } from '../ContentRegistry'

const ChipRowContent: React.FC<ContentProps> = ({ item, colors, onAction, styles, formData, onFieldChange }) => {
  const children = (item.children as ContentProps['item'][] | undefined) ?? []
  const gap = (item.gap as number | undefined) ?? 8

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ flexDirection: 'row', gap, paddingHorizontal: 4, paddingVertical: 6 }}
    >
      {children.map((child, i) => {
        if (!ContentRegistry.has(child.type)) return null
        return (
          <View key={`chip-row-${i}`}>
            {ContentRegistry.render(child.type, { item: child, onAction, styles, colors, formData, onFieldChange })}
          </View>
        )
      })}
    </ScrollView>
  )
}

ContentRegistry.register('chip-row', ChipRowContent)
ContentRegistry.register('pill-row', ChipRowContent)

export default ChipRowContent
