import React from 'react'
import { View, Text } from 'react-native'
import { ContentProps, ContentRegistry } from '../ContentRegistry'

interface TimelineEntry {
  order: number | string
  entry: string
  text: string
}

const parseOrder = (order: number | string): number => {
  if (typeof order === 'number') return order
  return parseInt(order, 10) || 0
}

const TimelineContent: React.FC<ContentProps> = ({ item, styles, colors }) => {
  const entries: TimelineEntry[] = item.entries || []

  if (entries.length === 0) {
    return null
  }

  // Sort by order
  const sortedEntries = [...entries].sort((a, b) => parseOrder(a.order) - parseOrder(b.order))

  return (
    <View style={styles.fieldContainer}>
      {item.title && <Text style={[styles.formLabel, { color: colors.text, marginBottom: 16 }]}>{item.title}</Text>}

      {sortedEntries.map((entry, index) => (
        <View key={index} style={{ flexDirection: 'row', marginBottom: 24 }}>
          {/* Timeline line and dot */}
          <View style={{ alignItems: 'center', marginRight: 16 }}>
            {/* Dot */}
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: colors.primary,
                borderWidth: 3,
                borderColor: colors.background,
              }}
            />
            {/* Vertical line */}
            {index < sortedEntries.length - 1 && (
              <View
                style={{
                  width: 2,
                  flex: 1,
                  backgroundColor: `${colors.primary}50`,
                  marginTop: 4,
                }}
              />
            )}
          </View>

          {/* Content */}
          <View style={{ flex: 1, paddingBottom: 8 }}>
            <Text style={[styles.formLabel, { color: colors.text, marginBottom: 4 }]}>{entry.entry}</Text>
            <Text style={[styles.description, { color: colors.text, fontSize: 13 }]}>{entry.text}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

ContentRegistry.register('timeline', TimelineContent)

export default TimelineContent
