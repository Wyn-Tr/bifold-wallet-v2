/* eslint-disable react/prop-types */
import React, { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StackScreenProps } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import { ThemedText } from '../components/texts/ThemedText'
import { useTheme } from '../contexts/theme'
import { useWorkflows, useWorkflowTemplates } from '../hooks/useWorkflows'
import { ContactStackParams, Screens } from '../types/navigators'
import { testIdWithKey } from '../utils/testable'

type Props = StackScreenProps<ContactStackParams, Screens.WorkflowTemplatePicker>

const WorkflowTemplatePicker: React.FC<Props> = ({ route, navigation }) => {
  const { connectionId } = route.params
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const [launching, setLaunching] = useState<string | null>(null)

  const { templates, loading: templatesLoading, discoverTemplates } = useWorkflowTemplates()
  const { instances, start } = useWorkflows(connectionId)

  const runningTemplateIds = useMemo(() => {
    const activeStatuses = new Set(['active', 'paused'])
    return new Set(
      instances
        .filter((i) => activeStatuses.has((i as any).status ?? ''))
        .map((i) => (i as any).templateId as string)
    )
  }, [instances])

  const handleLaunch = useCallback(
    async (templateId: string, templateVersion: string) => {
      setLaunching(templateId)
      try {
        const instance = await start({
          templateId,
          templateVersion,
          connectionId,
        })
        navigation.replace(Screens.WorkflowDetails, {
          instanceId: (instance as any).instanceId,
        })
      } catch (e) {
        Alert.alert(
          t('WorkflowTemplatePicker.LaunchFailed') || 'Failed to start workflow',
          (e as Error).message
        )
      } finally {
        setLaunching(null)
      }
    },
    [start, connectionId, navigation, t]
  )

  const handleDiscover = useCallback(() => {
    discoverTemplates(connectionId).catch(() => {})
  }, [discoverTemplates, connectionId])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    discoverRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.md,
      borderBottomColor: ColorPalette.grayscale.lightGrey,
      borderBottomWidth: 1,
    },
    templateItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: Spacing.md,
      borderBottomColor: ColorPalette.grayscale.lightGrey,
      borderBottomWidth: 1,
    },
    runningBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: Spacing.sm,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.xl,
    },
  })

  const describeTemplate = useCallback((tpl: any): string => {
    if (tpl?.description && typeof tpl.description === 'string') return tpl.description
    const stateCount = Array.isArray(tpl?.states) ? tpl.states.length : 0
    const actionCount = Array.isArray(tpl?.actions) ? tpl.actions.length : 0
    if (stateCount || actionCount) {
      const parts: string[] = []
      if (stateCount) parts.push(`${stateCount} state${stateCount === 1 ? '' : 's'}`)
      if (actionCount) parts.push(`${actionCount} action${actionCount === 1 ? '' : 's'}`)
      return parts.join(' · ')
    }
    return t('WorkflowTemplatePicker.NoDescription') || 'No description'
  }, [t])

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const tpl = item.template
      if (!tpl) return null
      const templateId = tpl.template_id
      const isRunning = runningTemplateIds.has(templateId)
      const isLaunching = launching === templateId
      const description = describeTemplate(tpl)

      return (
        <TouchableOpacity
          style={styles.templateItem}
          onPress={() => handleLaunch(templateId, tpl.version)}
          disabled={isLaunching}
          testID={testIdWithKey(`Template-${templateId}`)}
        >
          <View style={{ flex: 1 }}>
            <ThemedText variant="labelTitle">{tpl.title || templateId}</ThemedText>
            <ThemedText
              numberOfLines={2}
              style={{ fontSize: 13, color: ColorPalette.grayscale.mediumGrey, marginTop: 2 }}
            >
              {description}
            </ThemedText>
            <ThemedText style={{ fontSize: 11, color: ColorPalette.grayscale.mediumGrey, marginTop: 2 }}>
              v{tpl.version}
            </ThemedText>
          </View>
          {isRunning && (
            <View style={styles.runningBadge}>
              <Icon name="play-circle" size={16} color={ColorPalette.brand.primary} />
              <ThemedText
                style={{ fontSize: 12, color: ColorPalette.brand.primary, marginLeft: 4 }}
              >
                Running
              </ThemedText>
            </View>
          )}
          {isLaunching ? (
            <ActivityIndicator size="small" color={ColorPalette.brand.primary} />
          ) : (
            <Icon name="chevron-right" size={24} color={ColorPalette.grayscale.mediumGrey} />
          )}
        </TouchableOpacity>
      )
    },
    [runningTemplateIds, launching, handleLaunch, styles, ColorPalette, describeTemplate]
  )

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <TouchableOpacity style={styles.discoverRow} onPress={handleDiscover}>
        <Icon name="refresh" size={18} color={ColorPalette.brand.primary} />
        <ThemedText style={{ color: ColorPalette.brand.primary, marginLeft: 8 }}>
          {t('WorkflowTemplatePicker.Discover') || 'Discover Templates'}
        </ThemedText>
      </TouchableOpacity>

      {templatesLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={ColorPalette.brand.primary} />
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => (item as any).template?.template_id ?? (item as any).id}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ThemedText style={{ color: ColorPalette.grayscale.mediumGrey, textAlign: 'center' }}>
                {t('WorkflowTemplatePicker.Empty') || 'No templates available.\nTap Discover to fetch from peer.'}
              </ThemedText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

export default WorkflowTemplatePicker
