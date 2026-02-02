import React from 'react'
import { View, Text } from 'react-native'
import Svg, { Circle, G } from 'react-native-svg'
import { ContentProps, ContentRegistry } from '../ContentRegistry'

interface SliceItem {
  label: string
  count: number | string
}

const parseCount = (count: number | string): number => {
  if (typeof count === 'number') return count
  return parseFloat(count) || 0
}

const DonutChartContent: React.FC<ContentProps> = ({ item, styles, colors }) => {
  const slices: SliceItem[] = item.slices || []

  if (slices.length === 0) {
    return null
  }

  const size = 200
  const radius = size / 2
  const donutWidth = 40 // Width of the donut ring
  const innerRadius = radius - donutWidth

  // Calculate total for percentages
  const total = slices.reduce((sum, slice) => sum + parseCount(slice.count), 0)

  // Predefined colors for slices
  const sliceColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']

  let currentAngle = -90 // Start at top

  return (
    <View style={styles.fieldContainer}>
      {item.title && (
        <Text style={[styles.formLabel, { color: colors.text, marginBottom: 12, textAlign: 'center' }]}>
          {item.title}
        </Text>
      )}

      <View style={{ alignItems: 'center' }}>
        <Svg width={size} height={size}>
          <G rotation={0} origin={`${radius}, ${radius}`}>
            {slices.map((slice, index) => {
              const count = parseCount(slice.count)
              const percentage = (count / total) * 100
              const angle = (percentage / 100) * 360

              // Calculate stroke-dasharray for each slice
              const circumference = 2 * Math.PI * innerRadius
              const strokeDasharray = `${(angle / 360) * circumference} ${circumference}`
              const rotation = currentAngle

              currentAngle += angle

              return (
                <Circle
                  key={index}
                  cx={radius}
                  cy={radius}
                  r={innerRadius}
                  fill="none"
                  stroke={sliceColors[index % sliceColors.length]}
                  strokeWidth={donutWidth}
                  strokeDasharray={strokeDasharray}
                  rotation={rotation}
                  origin={`${radius}, ${radius}`}
                />
              )
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

ContentRegistry.register('donut-chart', DonutChartContent)

export default DonutChartContent
