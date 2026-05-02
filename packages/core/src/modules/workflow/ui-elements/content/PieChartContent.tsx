import React from 'react'
import { View, Text } from 'react-native'
import Svg, { Path, G } from 'react-native-svg'
import { ContentProps, ContentRegistry } from '../ContentRegistry'

interface SliceItem {
  label: string
  count: number | string
}

const parseCount = (count: number | string): number => {
  if (typeof count === 'number') return count
  return parseFloat(count) || 0
}

const DEFAULT_SLICES: SliceItem[] = [
  { label: 'Category A', count: 40 },
  { label: 'Category B', count: 30 },
  { label: 'Category C', count: 20 },
  { label: 'Category D', count: 10 },
]

const PieChartContent: React.FC<ContentProps> = ({ item, styles, colors }) => {
  const rawSlices: SliceItem[] = item.slices || []
  const slices = rawSlices.length > 0 ? rawSlices : DEFAULT_SLICES

  const size = 200
  const radius = size / 2
  const centerX = size / 2
  const centerY = size / 2

  // Calculate total for percentages
  const total = slices.reduce((sum, slice) => sum + parseCount(slice.count), 0)

  // Predefined colors for slices
  const sliceColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']

  // Helper function to convert angle to coordinates
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    }
  }

  // Create pie slice path
  const createPieSlice = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle)
    const end = polarToCartesian(centerX, centerY, radius, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

    return [
      `M ${centerX} ${centerY}`,
      `L ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
      'Z',
    ].join(' ')
  }

  let currentAngle = 0

  return (
    <View style={styles.fieldContainer}>
      {item.title && (
        <Text style={[styles.formLabel, { color: colors.text, marginBottom: 12, textAlign: 'center' }]}>
          {item.title}
        </Text>
      )}

      <View style={{ alignItems: 'center' }}>
        <Svg width={size} height={size}>
          <G>
            {slices.map((slice, index) => {
              const count = parseCount(slice.count)
              const percentage = (count / total) * 100
              const angle = (percentage / 100) * 360
              const startAngle = currentAngle
              const endAngle = currentAngle + angle

              currentAngle += angle

              const path = createPieSlice(startAngle, endAngle)

              return <Path key={index} d={path} fill={sliceColors[index % sliceColors.length]} />
            })}
          </G>
        </Svg>

        {/* Legend */}
        <View style={{ marginTop: 16, width: '100%' }}>
          {slices.map((slice, index) => {
            const count = parseCount(slice.count)
            const percentage = ((count / total) * 100).toFixed(1)
            return (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View
                  style={{
                    width: 16,
                    height: 16,
                    backgroundColor: sliceColors[index % sliceColors.length],
                    borderRadius: 2,
                    marginRight: 8,
                  }}
                />
                <Text style={[styles.description, { color: colors.text, fontSize: 13 }]}>
                  {slice.label}: {count} ({percentage}%)
                </Text>
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )
}

ContentRegistry.register('pie-chart', PieChartContent)

export default PieChartContent
