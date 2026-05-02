import React from 'react'
import { View, Text } from 'react-native'

import { ContentProps, ContentRegistry } from '../ContentRegistry'
import { FormFieldRegistry } from '../FormFieldRegistry'

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

const SectionContent: React.FC<ContentProps> = ({ item, onAction, styles, colors, formData, onFieldChange }) => {
  const children = item.children as ContentProps['item'][] | undefined
  if (!children || children.length === 0) return null

  const gap = item.gap ?? 10

  return (
    <View style={{ gap, backgroundColor: item.bgColor, padding: item.padding }}>
      {item.title && (
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
      )}
      {children.map((child: any, index: number) => {
        const isFormField = child['form-id'] !== undefined

        return (
          <View key={`section-child-${index}`}>
            {isFormField ? (
              FormFieldRegistry.render(mapTypeToRegistryType(child.type), {
                field: {
                  name: child['form-id'] || '',
                  label: child.label || '',
                  placeholder: child.placeholder,
                  options: child.values || child.options || [],
                  required: child.required,
                  type: mapTypeToRegistryType(child.type),
                  min: child.min ? Number(child.min) : undefined,
                  max: child.max ? Number(child.max) : undefined,
                },
                value: formData?.[child['form-id'] || ''],
                onChange: (value: any) => {
                  if (child.type === 'submit-button' && child.actionID) {
                    onAction(child.actionID, formData)
                  } else if (child['form-id']) {
                    onFieldChange?.(child['form-id'], value)
                  }
                },
                styles,
                colors,
              })
            ) : (
              ContentRegistry.render(child.type, {
                item: child,
                onAction,
                styles,
                colors,
                formData,
                onFieldChange,
                FormFieldRegistry,
              })
            )}
          </View>
        )
      })}
    </View>
  )
}

ContentRegistry.register('section', SectionContent)

export default SectionContent
