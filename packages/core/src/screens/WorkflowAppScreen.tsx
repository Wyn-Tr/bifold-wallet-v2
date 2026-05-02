import React, { useCallback } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StackScreenProps } from '@react-navigation/stack'

import { useTheme } from '../contexts/theme'
import { ActionMenuContentItem } from '../modules/workflow/types'
import { useWorkflowFormState, resolveValue } from '../modules/workflow/hooks/useWorkflowFormState'
import { GridLayout } from '../modules/workflow/ui-elements/layout/GridLayout'
import { useGridDimensions } from '../modules/workflow/ui-elements/layout/useGridDimensions'
import { ContactStackParams, Screens } from '../types/navigators'

type WorkflowAppScreenProps = StackScreenProps<ContactStackParams, Screens.WorkflowAppScreen>

const WorkflowAppScreen: React.FC<WorkflowAppScreenProps> = ({ route, navigation }) => {
  const {
    content,
    workflowID,
    connectionId,
    screenTitle,
    onActionPress,
  } = route.params

  const { ColorPalette } = useTheme()
  const { contentWidth } = useGridDimensions()
  const { formData, handleFieldChange } = useWorkflowFormState(content, workflowID)

  // Set header title
  React.useLayoutEffect(() => {
    if (screenTitle) {
      navigation.setOptions({ title: screenTitle })
    }
  }, [screenTitle, navigation])

  const handleAction = useCallback(
    (actionId: string, data?: any) => {
      if (onActionPress) {
        onActionPress(actionId, workflowID, data)
      }
    },
    [onActionPress, workflowID],
  )

  // Separate sticky footer items from scrollable content
  const stickyItems: ActionMenuContentItem[] = []
  const scrollableItems: ActionMenuContentItem[] = []

  const categorizeItems = (items: ActionMenuContentItem[]) => {
    items.forEach((item) => {
      if (item.sticky === 'bottom') {
        stickyItems.push(item)
      } else {
        scrollableItems.push(item)
      }
    })
  }
  categorizeItems(content)

  // Resolve placeholder values in items
  const resolveItem = (item: ActionMenuContentItem): ActionMenuContentItem => ({
    ...item,
    text: item.text ? resolveValue(item.text, formData) : item.text,
    label: item.label ? resolveValue(item.label, formData) : item.label,
    children: item.children?.map(resolveItem),
  })

  const resolvedScrollableItems = scrollableItems.map(resolveItem)
  const resolvedStickyItems = stickyItems.map(resolveItem)

  const colors = {
    primary: ColorPalette.brand.primary,
    text: ColorPalette.brand.text,
    background: ColorPalette.brand.secondaryBackground,
    border: ColorPalette.brand.primary,
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    keyboardAvoid: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 24,
    },
    stickyFooter: {
      padding: 16,
      paddingBottom: Platform.OS === 'ios' ? 0 : 16,
      backgroundColor: ColorPalette.brand.primaryBackground,
      borderTopWidth: 1,
      borderTopColor: ColorPalette.grayscale.lightGrey,
    },
    // Styles passed to content renderers
    title: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 12,
      color: ColorPalette.brand.text,
    },
    image: {
      width: '100%',
      height: 150,
      marginBottom: 12,
      borderRadius: 8,
    },
    description: {
      fontSize: 15,
      marginBottom: 12,
      color: ColorPalette.brand.text,
      lineHeight: 22,
    },
    fieldContainer: {
      marginBottom: 12,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: ColorPalette.brand.text,
      marginBottom: 8,
    },
    formLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: ColorPalette.brand.text,
      marginBottom: 8,
    },
    button: {
      flexDirection: 'row',
      paddingTop: 12,
      paddingRight: 27,
      paddingBottom: 12,
      paddingLeft: 32,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 16,
      borderWidth: 1,
      height: 50,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '700',
      lineHeight: 24,
      textAlign: 'center',
      color: ColorPalette.grayscale.white,
    },
    textInput: {
      height: 48,
      borderColor: ColorPalette.brand.primary,
      borderWidth: 1.5,
      marginBottom: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: ColorPalette.brand.tertiaryBackground,
      color: ColorPalette.brand.text,
      fontSize: 15,
    },
    input: {
      height: 48,
      borderColor: ColorPalette.brand.primary,
      borderWidth: 1.5,
      marginBottom: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: ColorPalette.brand.tertiaryBackground,
      color: ColorPalette.brand.text,
      fontSize: 15,
    },
    radioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      paddingVertical: 4,
    },
    radioButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      paddingVertical: 4,
    },
    radioButtonIcon: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center',
      borderColor: ColorPalette.brand.primary,
    },
    radioButtonIconSelected: {
      backgroundColor: ColorPalette.brand.primary,
    },
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    radioLabel: {
      fontSize: 15,
    },
    radioButtonText: {
      fontSize: 15,
      color: ColorPalette.brand.text,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkbox: {
      width: 24,
      height: 24,
      borderWidth: 2,
      borderRadius: 4,
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxLabel: {
      fontSize: 15,
    },
    mcqRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
    },
    mcqBox: {
      width: 20,
      height: 20,
      borderWidth: 2,
      borderRadius: 4,
      marginRight: 10,
    },
    mcqLabel: {
      fontSize: 15,
    },
    dropdown: {
      height: 48,
      borderWidth: 1,
      borderRadius: 8,
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    dropdownList: {
      borderRadius: 8,
      maxHeight: 200,
    },
    dropdownItem: {
      padding: 12,
      borderBottomWidth: 1,
    },
    dateButton: {
      height: 48,
      borderWidth: 1,
      borderRadius: 8,
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    slider: {
      width: '100%',
      height: 40,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonContainer: {
      flexDirection: 'column',
      alignItems: 'center',
    },
  })

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <GridLayout
            items={resolvedScrollableItems}
            containerWidth={contentWidth}
            styles={styles}
            colors={colors}
            formData={formData}
            onFieldChange={handleFieldChange}
            onAction={handleAction}
          />
        </ScrollView>

        {resolvedStickyItems.length > 0 && (
          <View style={styles.stickyFooter}>
            <GridLayout
              items={resolvedStickyItems}
              containerWidth={contentWidth}
              styles={styles}
              colors={colors}
              formData={formData}
              onFieldChange={handleFieldChange}
              onAction={handleAction}
              gap={8}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default WorkflowAppScreen
