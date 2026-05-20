import { useState, useRef, useEffect, useCallback } from 'react'

import { ActionMenuContentItem } from '../types'

export interface FormData {
  [key: string]: any
}

/**
 * Resolve placeholder values like {field1} in strings using formData and contextData
 */
export const resolveValue = (value: any, formData: FormData, additionalData?: any): any => {
  if (typeof value !== 'string') return value

  const placeholderPattern = /\{([^}]+)\}/g

  return value.replace(placeholderPattern, (match: string, key: string) => {
    if (formData[key] !== undefined) {
      return String(formData[key])
    }
    if (additionalData && additionalData[key] !== undefined) {
      return String(additionalData[key])
    }
    return ''
  })
}

/**
 * Map JSON content types to FormFieldRegistry types
 */
export const mapTypeToRegistryType = (type: string): string => {
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

/**
 * Group radio buttons with the same form-id into a single renderable object
 */
export const groupRadioButtons = (content: ActionMenuContentItem[]) => {
  const radioGroups: { [key: string]: any[] } = {}
  const processedIndices = new Set<number>()
  const processedContent: any[] = []

  content.forEach((item, index) => {
    if (item.type === 'radio-button' && item['form-id']) {
      const formId = item['form-id']
      if (!radioGroups[formId]) {
        radioGroups[formId] = []
      }
      radioGroups[formId].push({
        label: item.label,
        value: item.value,
        default: item.default,
        form: item.form,
      })
      processedIndices.add(index)
    }
  })

  content.forEach((item, index) => {
    if (processedIndices.has(index)) {
      const formId = item['form-id']
      if (formId && radioGroups[formId]) {
        const firstIndex = content.findIndex((i) => i.type === 'radio-button' && i['form-id'] === formId)
        if (index === firstIndex) {
          processedContent.push({
            isRadioGroup: true,
            type: 'radio-button',
            formId,
            form: item.form,
            options: radioGroups[formId],
          })
        }
      }
    } else {
      processedContent.push(item)
    }
  })

  return processedContent
}

/**
 * Hook that manages form state for workflow content items.
 * Extracted from ActionMenuBubble to be shared with WorkflowAppScreen.
 */
export function useWorkflowFormState(
  content: ActionMenuContentItem[],
  workflowID: string,
  contextData: Record<string, any> = {},
) {
  const [formData, setFormData] = useState<FormData>({})
  const hasInitialized = useRef(false)
  const workflowIDRef = useRef(workflowID)

  useEffect(() => {
    if (workflowIDRef.current !== workflowID) {
      hasInitialized.current = false
      workflowIDRef.current = workflowID
    }

    if (!hasInitialized.current) {
      const initialData: FormData = {}

      const initFromItems = (items: ActionMenuContentItem[]) => {
        items.forEach((item) => {
          // Recurse into children for row/section containers
          if (item.children) {
            initFromItems(item.children)
          }

          const formId = 'form-id' in item ? item['form-id'] : undefined
          if (!formId) return

          if (item.type === 'radio-button') {
            if (item.default === true) {
              initialData[formId] = item.value
            }
            return
          }

          if (item.type === 'check-box') {
            initialData[formId] = item.value === 'true'
            return
          }

          if (item.value !== undefined && item.value !== null && item.value !== '') {
            initialData[formId] = resolveValue(item.value, {}, contextData)
          }
        })
      }

      initFromItems(content)
      setFormData(initialData)
      hasInitialized.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowID])

  const handleFieldChange = useCallback((name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }, [])

  return {
    formData,
    setFormData,
    handleFieldChange,
  }
}
