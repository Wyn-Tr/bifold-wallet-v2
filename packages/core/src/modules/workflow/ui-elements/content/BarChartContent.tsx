// packages/core/src/modules/workflow/ui-elements/content/BarChartContent.tsx

import React from 'react'
import { View, Text } from 'react-native'
import { ContentProps, ContentRegistry } from '../ContentRegistry'

interface BarItem {
  label: string
  count: number | string
}

const parseCount = (count: number | string): number => {
  if (typeof count === 'number') return count
  return parseFloat(count) || 0
}

const BarChartContent: React.FC<ContentProps> = ({ item, styles, colors }) => {
  const bars: BarItem[] = item.bars || []

  if (bars.length === 0) {
    return null
  }

  // Find max count for scaling
  const maxCount = Math.max(...bars.map((b) => parseCount(b.count)), 1)

  // Use the same colors as PieChart for consistency
  const barColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']

  return (
    <View style={styles.fieldContainer}>
      {item.title && <Text style={[styles.formLabel, { color: colors.text, marginBottom: 12 }]}>{item.title}</Text>}

      {bars.map((bar, index) => {
        const count = parseCount(bar.count) //  Parse to number first
        const percentage = (count / maxCount) * 100 // Use parsed
        const barColor = barColors[index % barColors.length]

        return (
          <View key={index} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={[styles.description, { color: colors.text, fontSize: 13 }]}>{bar.label}</Text>
              <Text style={[styles.description, { color: colors.text, fontSize: 13, fontWeight: '600' }]}>{count}</Text>
            </View>

            <View
              style={{
                height: 24,
                backgroundColor: `${barColor}20`, // Light background with 20% opacity
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${percentage}%`,
                  backgroundColor: barColor, // Solid color for the bar
                }}
              />
            </View>
          </View>
        )
      })}
    </View>
  )
}

ContentRegistry.register('bar-chart', BarChartContent)

export default BarChartContent
