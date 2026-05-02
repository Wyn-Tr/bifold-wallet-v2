import React from 'react'
import { ScrollView, View } from 'react-native'
import { ContentProps, ContentRegistry } from '../ContentRegistry'

const CarouselContent: React.FC<ContentProps> = ({ item, colors, onAction, styles, formData, onFieldChange }) => {
  const children = (item.children as ContentProps['item'][] | undefined) ?? []
  const gap = (item.gap as number | undefined) ?? 12
  const snap = item.snap === true || item.snap === 'true'

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      pagingEnabled={snap}
      decelerationRate={snap ? 'fast' : 'normal'}
      contentContainerStyle={{ flexDirection: 'row', gap, paddingHorizontal: 4, paddingVertical: 6 }}
    >
      {children.map((child, i) => {
        if (!ContentRegistry.has(child.type)) return null
        return (
          <View key={`carousel-${i}`}>
            {ContentRegistry.render(child.type, { item: child, onAction, styles, colors, formData, onFieldChange })}
          </View>
        )
      })}
    </ScrollView>
  )
}

ContentRegistry.register('carousel', CarouselContent)
ContentRegistry.register('h-scroll', CarouselContent)

export default CarouselContent
