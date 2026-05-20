import React from 'react'
import { View, Text } from 'react-native'
import { ContentProps, ContentRegistry } from '../ContentRegistry'

interface HeaderColumn {
  [key: string]: string | number
}

interface TableRow {
  [key: string]: string | number
}

const parseOrder = (order: string | number | undefined): number => {
  if (order === undefined) return 0
  if (typeof order === 'number') return order
  return parseInt(order, 10) || 0
}

const DEFAULT_HEADER: HeaderColumn[] = [
  { column1: 'Name', order: 0 },
  { column1: 'Value', order: 1 },
]
const DEFAULT_ROWS: TableRow[] = [
  { col1: 'Item 1', col2: '100' },
  { col1: 'Item 2', col2: '200' },
  { col1: 'Item 3', col2: '300' },
]

const BasicTableContent: React.FC<ContentProps> = ({ item, styles, colors }) => {
  const rawHeader: HeaderColumn[] = item.header || []
  const rawRows: TableRow[] = item.rows || []
  const header = rawHeader.length > 0 ? rawHeader : DEFAULT_HEADER
  const rows = rawRows.length > 0 ? rawRows : DEFAULT_ROWS
  const showBorder = item.border === true || item.border === 'true'

  const sortedHeader = [...header].sort((a, b) => {
    return parseOrder(a.order) - parseOrder(b.order)
  })

  // Get column keys (excluding 'order')
  const columnKeys = rows.length > 0 ? Object.keys(rows[0]).sort() : []
  const headerLabels = sortedHeader.map((h) => h.column1 || '')

  const borderStyle = showBorder
    ? {
        borderWidth: 1,
        borderColor: colors.border,
      }
    : {}

  return (
    <View style={styles.fieldContainer}>
      {item.title && <Text style={[styles.formLabel, { color: colors.text, marginBottom: 12 }]}>{item.title}</Text>}

      <View style={[{ overflow: 'hidden', borderRadius: 4 }, showBorder && borderStyle]}>
        {/* Header Row */}
        <View style={{ flexDirection: 'row', backgroundColor: `${colors.primary}20` }}>
          {sortedHeader.map((col, index) => {
            return (
              <View
                key={index}
                style={[
                  {
                    flex: 1,
                    padding: 12,
                  },
                  showBorder && index > 0 && { borderLeftWidth: 1, borderLeftColor: colors.border },
                ]}
              >
                <Text style={[styles.formLabel, { color: colors.text, fontSize: 13 }]}>{headerLabels[index]}</Text>
              </View>
            )
          })}
        </View>

        {/* Data Rows */}
        {rows.map((row, rowIndex) => (
          <View
            key={rowIndex}
            style={[
              { flexDirection: 'row' },
              showBorder && rowIndex > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
            ]}
          >
            {columnKeys.map((key, colIndex) => (
              <View
                key={colIndex}
                style={[
                  {
                    flex: 1,
                    padding: 12,
                  },
                  showBorder && colIndex > 0 && { borderLeftWidth: 1, borderLeftColor: colors.border },
                ]}
              >
                <Text style={[styles.description, { color: colors.text, fontSize: 13 }]}>{row[key] || ''}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  )
}

ContentRegistry.register('basic-table', BasicTableContent)

export default BasicTableContent
