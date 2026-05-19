// Two attribute-list styles ported from /Digicred Wallet/.
//
//   variant='standard'  — credential offer + details. Label left muted,
//                         value right white. Right-aligned value, up to 60%
//                         width, word-wraps. When `children` is set the row
//                         becomes a group header with indented sub-rows.
//   variant='shared'    — "you'll share" list on the proof presentation
//                         screen. Leading teal check-square, label center
//                         white, value right muted. Per-row checkmark only
//                         renders for items with `shared !== false`.

import React from 'react'
import { StyleSheet, Text, View, ViewStyle } from 'react-native'

import { DC_PALETTE } from '../tokens'
import { DCIcon } from './DCIcon'

export interface DCAttrItem {
  label: string
  value?: string
  /** Nested key/value pairs — rendered as indented sub-rows under this row.
   *  Use for object / array-of-object JSON values that wouldn't fit in a
   *  single value cell. */
  children?: DCAttrItem[]
  /** Only meaningful in the 'shared' variant — renders the leading checkmark. */
  shared?: boolean
}

export interface DCAttrListProps {
  items: DCAttrItem[]
  dense?: boolean
  variant?: 'standard' | 'shared'
  style?: ViewStyle
}

function humanize(key: string): string {
  return key
    .replace(/[._-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

export const DCAttrList: React.FC<DCAttrListProps> = ({ items, dense, variant = 'standard', style }) => (
  <View style={[styles.container, style]}>
    {items.map((it, idx) => (
      <Row
        key={`${it.label}-${idx}`}
        item={it}
        dense={dense}
        variant={variant}
        isFirst={idx === 0}
        depth={0}
      />
    ))}
  </View>
)

const Row: React.FC<{
  item: DCAttrItem
  dense?: boolean
  variant: 'standard' | 'shared'
  isFirst: boolean
  depth: number
}> = ({ item, dense, variant, isFirst, depth }) => {
  const hasChildren = !!(item.children && item.children.length > 0)
  const verticalPad = dense ? 10 : 13
  const horizontalPad = (dense ? 14 : 16) + depth * 12

  return (
    <>
      <View
        style={[
          styles.row,
          { paddingVertical: verticalPad, paddingHorizontal: horizontalPad },
          isFirst ? null : styles.rowTopBorder,
          hasChildren ? styles.groupHeaderRow : null,
        ]}
      >
        {variant === 'shared' ? (
          <SharedRow item={item} />
        ) : hasChildren ? (
          <GroupHeader item={item} />
        ) : (
          <StandardRow item={item} />
        )}
      </View>
      {hasChildren
        ? item.children!.map((child, ci) => (
            <Row
              key={`${child.label}-${ci}-d${depth + 1}`}
              item={child}
              dense={dense}
              variant={variant}
              isFirst={false}
              depth={depth + 1}
            />
          ))
        : null}
    </>
  )
}

const StandardRow: React.FC<{ item: DCAttrItem }> = ({ item }) => (
  <>
    <Text style={styles.standardLabel} numberOfLines={2}>
      {humanize(item.label)}
    </Text>
    {item.value ? (
      <Text style={styles.standardValue} numberOfLines={4}>
        {item.value}
      </Text>
    ) : null}
  </>
)

const GroupHeader: React.FC<{ item: DCAttrItem }> = ({ item }) => (
  <Text style={styles.groupHeaderLabel} numberOfLines={1}>
    {humanize(item.label)}
  </Text>
)

const SharedRow: React.FC<{ item: DCAttrItem }> = ({ item }) => {
  const isShared = item.shared !== false
  return (
    <>
      {isShared ? (
        <View style={styles.checkBox}>
          <DCIcon name="check" size={10} color={DC_PALETTE.accent} />
        </View>
      ) : (
        <View style={styles.checkSpacer} />
      )}
      <Text style={styles.sharedLabel} numberOfLines={2}>
        {humanize(item.label)}
      </Text>
      {item.value ? (
        <Text style={styles.sharedValue} numberOfLines={2}>
          {item.value}
        </Text>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: DC_PALETTE.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DC_PALETTE.cardBorder,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowTopBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DC_PALETTE.divider,
  },
  groupHeaderRow: {
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  groupHeaderLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  // Standard variant — credential offer + details
  standardLabel: {
    flex: 1,
    color: DC_PALETTE.muted,
    fontSize: 13,
    fontWeight: '500',
    marginRight: 14,
  },
  standardValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '60%',
  },

  // Shared variant — proof "you'll share"
  checkBox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: 'rgba(125,224,213,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(125,224,213,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkSpacer: {
    width: 18,
    height: 18,
    marginRight: 12,
    opacity: 0.2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  sharedLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '500',
  },
  sharedValue: {
    color: DC_PALETTE.muted,
    fontSize: 12.5,
    fontWeight: '600',
    marginLeft: 8,
  },
})

export default DCAttrList
