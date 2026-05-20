import React from 'react'
import { Image, Text, TouchableOpacity, View } from 'react-native'
import { ContentProps, ContentRegistry } from '../ContentRegistry'

interface BadgeSpec {
  label: string
  tone?: string
}

const TileContent: React.FC<ContentProps> = ({ item, colors, onAction, styles, formData, onFieldChange }) => {
  const layout = (item.layout as string | undefined) ?? 'horizontal' // 'horizontal' | 'vertical'
  const title = (item.title as string | undefined) ?? ''
  const subtitle = (item.subtitle as string | undefined) ?? ''
  const text = (item.text as string | undefined) ?? ''
  const imageUrl = (item.image as string | undefined) ?? (item.url as string | undefined)
  const badges = (item.badges as BadgeSpec[] | undefined) ?? []
  const event = item.event as string | undefined
  const input = item.input as Record<string, unknown> | undefined
  const children = item.children as ContentProps['item'][] | undefined

  const isVertical = layout === 'vertical'
  const tileWidth = isVertical ? 220 : undefined
  const imageStyle = isVertical
    ? { width: '100%' as const, height: 120, borderRadius: 8 }
    : { width: 88, height: 88, borderRadius: 8 }

  const Body = (
    <View
      style={{
        flexDirection: isVertical ? 'column' : 'row',
        gap: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        width: tileWidth,
      }}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={imageStyle} resizeMode="cover" />
      ) : (
        <View style={[imageStyle, { backgroundColor: '#cbd5e1' }]} />
      )}
      <View style={{ flex: 1, justifyContent: 'center', gap: 4 }}>
        {title ? (
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={{ fontSize: 12, color: colors.text, opacity: 0.7 }} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {text ? (
          <Text style={{ fontSize: 12, color: colors.text, opacity: 0.7 }} numberOfLines={2}>
            {text}
          </Text>
        ) : null}
        {badges.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {badges.map((b, i) =>
              ContentRegistry.render('badge', {
                item: { type: 'badge', label: b.label, tone: b.tone },
                onAction,
                styles,
                colors,
                formData,
                onFieldChange,
              })
                ? (
                  <View key={`tile-badge-${i}`}>
                    {ContentRegistry.render('badge', {
                      item: { type: 'badge', label: b.label, tone: b.tone },
                      onAction,
                      styles,
                      colors,
                      formData,
                      onFieldChange,
                    })}
                  </View>
                )
                : null
            )}
          </View>
        ) : null}
        {children?.map((child, i) =>
          ContentRegistry.has(child.type) ? (
            <View key={`tile-child-${i}`}>
              {ContentRegistry.render(child.type, { item: child, onAction, styles, colors, formData, onFieldChange })}
            </View>
          ) : null
        )}
      </View>
    </View>
  )

  if (!event) return Body

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => onAction(event, input ?? {})}>
      {Body}
    </TouchableOpacity>
  )
}

ContentRegistry.register('tile', TileContent)

export default TileContent
