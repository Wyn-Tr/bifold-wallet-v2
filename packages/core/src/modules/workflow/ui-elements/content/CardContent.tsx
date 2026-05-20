import React from 'react'
import { View, Text } from 'react-native'
import { ContentProps, ContentRegistry } from '../ContentRegistry'

const CardContent: React.FC<ContentProps> = ({ item, styles, colors, onAction, formData, onFieldChange }) => {
  const children = (item.children as ContentProps['item'][] | undefined) ?? undefined
  const padding = (item.padding as number | undefined) ?? 16
  const bg = (item.bgColor as string | undefined) ?? colors.background

  return (
    <View
      style={[
        styles.fieldContainer,
        {
          padding,
          borderRadius: 8,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: colors.border,
          gap: (item.gap as number | undefined) ?? 8,
        },
      ]}
    >
      {item.title && <Text style={[styles.formLabel, { color: colors.text, marginBottom: 4 }]}>{String(item.title)}</Text>}
      {item.text && <Text style={[styles.description, { color: colors.text }]}>{String(item.text)}</Text>}
      {children?.map((child, i) =>
        ContentRegistry.has(child.type) ? (
          <View key={`card-child-${i}`}>
            {ContentRegistry.render(child.type, { item: child, onAction, styles, colors, formData, onFieldChange })}
          </View>
        ) : null
      )}
    </View>
  )
}

ContentRegistry.register('card', CardContent)

export default CardContent
