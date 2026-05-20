import React from 'react'
import { StyleSheet, View } from 'react-native'

import { ActionMenuContentItem } from '../../types'
import { ContentRegistry, ContentProps } from '../ContentRegistry'
import { FormFieldRegistry } from '../FormFieldRegistry'
import { computeItemWidth } from './useGridDimensions'

export interface GridLayoutProps {
  items: ActionMenuContentItem[]
  containerWidth: number
  styles: Record<string, any>
  colors: {
    primary: string
    text: string
    background: string
    border: string
  }
  formData?: Record<string, any>
  onFieldChange?: (name: string, value: any) => void
  onAction: (actionId: string, data?: any) => void
  gap?: number
}

const mapTypeToRegistryType = (type: string): string => {
  const typeMap: { [key: string]: string } = {
    'text-field': 'text',
    'check-box': 'checkbox',
    'drop-down': 'dropdown',
    'submit-button': 'submit-button',
    'text-area': 'textarea',
    'radio-button': 'radio',
    mcq: 'mcq',
    'multiple-choice': 'mcq',
    'date-field': 'date',
    'slider-field': 'slider',
  }
  return typeMap[type] || type
}

const renderSingleItem = (
  item: ActionMenuContentItem,
  index: number,
  props: Omit<GridLayoutProps, 'items' | 'containerWidth' | 'gap'>,
): React.ReactNode => {
  const { styles, colors, formData, onFieldChange, onAction } = props
  const isFormField = item['form-id'] !== undefined

  if (isFormField) {
    const registryType = mapTypeToRegistryType(item.type)
    const field = {
      name: item['form-id'] || '',
      label: item.label || item.question || '',
      placeholder: item.placeholder,
      options:
        item.values ||
        item.options ||
        (item.answers ? item.answers.map((a: any) => a.option) : []),
      required: item.required,
      type: registryType,
      actionID: item.actionID,
      min: item.min ? Number(item.min) : undefined,
      max: item.max ? Number(item.max) : undefined,
    }
    const currentValue = formData?.[item['form-id'] || '']

    return FormFieldRegistry.render(registryType, {
      field,
      value: currentValue,
      onChange: (value: any) => {
        if (item.type === 'submit-button' && item.actionID) {
          onAction(item.actionID, formData)
        } else if (item['form-id']) {
          onFieldChange?.(item['form-id'], value)
        }
      },
      styles,
      colors,
    })
  }

  // Regular content item
  const contentProps: ContentProps = {
    item,
    onAction,
    styles,
    colors,
    formData,
    onFieldChange,
    FormFieldRegistry,
  }

  return ContentRegistry.render(item.type, contentProps)
}

export const GridLayout: React.FC<GridLayoutProps> = ({
  items,
  containerWidth,
  styles: parentStyles,
  colors,
  formData,
  onFieldChange,
  onAction,
  gap = 10,
}) => {
  const renderProps = { styles: parentStyles, colors, formData, onFieldChange, onAction }

  const gridStyles = StyleSheet.create({
    container: {
      width: containerWidth,
      gap,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    cell: {
      overflow: 'hidden',
    },
  })

  const renderItem = (item: ActionMenuContentItem, index: number): React.ReactNode => {
    // Row container: render children horizontally
    if (item.type === 'row' && item.children) {
      const rowGap = item.gap ?? gap
      return (
        <View key={`row-${index}`} style={[gridStyles.row, { gap: rowGap }]}>
          {item.children.map((child, childIndex) => {
            const childWidth = computeItemWidth(child.col, containerWidth) - (
              item.children!.length > 1 ? rowGap * (item.children!.length - 1) / item.children!.length : 0
            )
            return (
              <View
                key={`row-${index}-child-${childIndex}`}
                style={[
                  gridStyles.cell,
                  {
                    width: childWidth,
                    alignItems: child.align === 'center' ? 'center' :
                      child.align === 'end' ? 'flex-end' : 'stretch',
                    backgroundColor: child.bgColor,
                    padding: child.padding,
                  },
                ]}
              >
                {child.type === 'row' && child.children
                  ? renderItem(child, childIndex)
                  : renderSingleItem(child, childIndex, renderProps)}
              </View>
            )
          })}
        </View>
      )
    }

    // Section container: render title + children vertically
    if (item.type === 'section' && item.children) {
      return (
        <View key={`section-${index}`} style={{ gap: item.gap ?? gap, backgroundColor: item.bgColor, padding: item.padding }}>
          {item.title && (
            <View style={parentStyles.fieldContainer}>
              {ContentRegistry.render('title', {
                item: { type: 'title', text: item.title },
                onAction,
                styles: parentStyles,
                colors,
              })}
            </View>
          )}
          {item.children.map((child, childIndex) => renderItem(child, childIndex))}
        </View>
      )
    }

    // Spacer
    if (item.type === 'spacer') {
      return <View key={`spacer-${index}`} style={{ height: item.gap ?? 16 }} />
    }

    // Divider
    if (item.type === 'divider' || item.type === 'HR') {
      return (
        <View
          key={`divider-${index}`}
          style={{ height: 1, backgroundColor: colors.border, opacity: 0.3 }}
        />
      )
    }

    // Regular item with optional col
    const itemWidth = computeItemWidth(item.col, containerWidth)
    const isFullWidth = (item.col ?? 12) === 12

    return (
      <View
        key={`item-${index}`}
        style={[
          gridStyles.cell,
          !isFullWidth && { width: itemWidth },
          {
            alignItems: item.align === 'center' ? 'center' :
              item.align === 'end' ? 'flex-end' : 'stretch',
            backgroundColor: item.bgColor,
            padding: item.padding,
          },
        ]}
      >
        {renderSingleItem(item, index, renderProps)}
      </View>
    )
  }

  return (
    <View style={gridStyles.container}>
      {items.map((item, index) => renderItem(item, index))}
    </View>
  )
}

export default GridLayout
