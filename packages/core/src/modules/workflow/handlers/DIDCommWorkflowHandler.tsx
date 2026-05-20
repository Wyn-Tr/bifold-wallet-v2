/**
 * DIDCommWorkflowHandler
 *
 * Handles DIDComm workflow instances in the chat interface.
 * Converts WorkflowInstanceRecord to chat messages with UI hints.
 */

import { ConnectionRecord } from '@credo-ts/core'
import type { WorkflowInstanceRecord } from '@ajna-inc/workflow'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import { TFunction } from 'react-i18next'

import { CallbackType, ExtendedChatMessage } from '../../../components/chat/ChatMessage'
import { ThemedText } from '../../../components/texts/ThemedText'
import { useTheme } from '../../../contexts/theme'
import { Role } from '../../../types/chat'
import { RootStackParams, ContactStackParams, Screens } from '../../../types/navigators'
import {
  MessageContext,
  NavigationResult,
  WorkflowType,
} from '../types'

import { BaseWorkflowHandler } from './BaseWorkflowHandler'

/**
 * Check if a record is a WorkflowInstanceRecord
 */
function isWorkflowInstanceRecord(record: unknown): record is WorkflowInstanceRecord {
  if (!record || typeof record !== 'object') return false
  const r = record as any
  // WorkflowInstanceRecord has these key properties
  const hasId = typeof r.id === 'string'
  const hasTemplateId = typeof r.templateId === 'string'
  const hasInstanceId = typeof r.instanceId === 'string'
  const hasState = typeof r.state === 'string'
  const result = hasId && hasTemplateId && hasInstanceId && hasState

  return result
}

export class DIDCommWorkflowHandler extends BaseWorkflowHandler<WorkflowInstanceRecord> {
  readonly type = WorkflowType.DIDComm
  readonly displayName = 'DIDComm Workflow'

  canHandle(record: unknown): record is WorkflowInstanceRecord {
    return isWorkflowInstanceRecord(record)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getRole(record: WorkflowInstanceRecord): Role {
    // Workflows are typically initiated by them (the issuer/verifier)
    return Role.them
  }

  getLabel(record: WorkflowInstanceRecord, t: TFunction): string {
    const templateId = record.templateId || ''

    let label: string
    // Common template patterns
    if (templateId.includes('credential') || templateId.includes('issuance')) {
      label = t('Workflow.CredentialWorkflow' as any) || 'Credential Workflow'
    } else if (templateId.includes('proof') || templateId.includes('verification')) {
      label = t('Workflow.ProofWorkflow' as any) || 'Proof Workflow'
    } else {
      // Humanize the template ID (replace dashes/underscores, title case)
      // Skip if it looks like a UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(templateId)
      label = isUuid
        ? (t('Workflow.Workflow' as any) || 'Workflow')
        : templateId.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    }

    const stateLabel = this.getStateLabel(record, t)
    return `${label} - ${stateLabel}`
  }

  private getStateLabel(record: WorkflowInstanceRecord, t: TFunction): string {
    const s = ((record as any).state || '').toLowerCase()
    if (s === 'done' || s === 'completed') return t('Workflow.Completed' as any) || 'Completed'
    if (s === 'failed' || s === 'error') return t('Workflow.Failed' as any) || 'Failed'
    if (s === 'cancelled') return t('Workflow.Cancelled' as any) || 'Cancelled'
    if (s === 'paused') return t('Workflow.Paused' as any) || 'Paused'
    return t('Workflow.InProgress' as any) || 'In Progress'
  }

  getCallbackType(record: WorkflowInstanceRecord): CallbackType | undefined {
    // If workflow has pending actions, show a callback
    const state = (record as any).state?.toLowerCase() || ''
    if (!['done', 'completed', 'cancelled', 'failed', 'error'].includes(state)) {
      return CallbackType.Workflow
    }
    return undefined
  }

  toMessage(
    record: WorkflowInstanceRecord,
    _connection: ConnectionRecord,
    context: MessageContext
  ): ExtendedChatMessage {
    const role = this.getRole(record)
    const label = this.getLabel(record, context.t)
    const state = (record as any).state || 'unknown'
    const section = (record as any).section || ''

    // Create the workflow bubble
    const renderEvent = () => (
      <WorkflowBubble
        templateId={record.templateId}
        state={state}
        section={section}
        label={label}
        t={context.t}
      />
    )

    return {
      _id: record.id,
      text: label,
      renderEvent,
      createdAt: record.createdAt,
      user: { _id: role },
      messageOpensCallbackType: this.getCallbackType(record),
      onDetails: this.createOnDetails(record, context.navigation as StackNavigationProp<RootStackParams | ContactStackParams>),
    }
  }

  getDetailNavigation(record: WorkflowInstanceRecord): NavigationResult | undefined {
    return {
      screen: Screens.WorkflowDetails,
      params: { instanceId: record.instanceId },
    }
  }

  shouldDisplay(record: WorkflowInstanceRecord): boolean {
    // Show all workflows except completed ones (unless they just completed)
    const state = (record as any).state?.toLowerCase() || ''
    const completedStates = ['done', 'completed', 'cancelled', 'failed', 'error']

    // Show if not completed, or if completed recently (within last hour)
    if (!completedStates.includes(state)) {
      return true
    }

    // Check if completed recently
    const updatedAt = record.updatedAt ? new Date(record.updatedAt) : record.createdAt
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    return updatedAt > oneHourAgo
  }

  /**
   * Create the onDetails callback for navigation
   */
  private createOnDetails(
    record: WorkflowInstanceRecord,
    navigation?: StackNavigationProp<RootStackParams | ContactStackParams>
  ): (() => void) | undefined {
    if (!navigation) return undefined
    return () => {
      navigation.navigate(Screens.WorkflowDetails as any, { instanceId: record.instanceId })
    }
  }
}

/**
 * Workflow bubble component for displaying workflow status in chat
 */
interface WorkflowBubbleProps {
  templateId: string
  state: string
  section: string
  label: string
  t: TFunction
}

const WorkflowBubble: React.FC<WorkflowBubbleProps> = ({
  templateId,
  state,
  section,
  label,
  t,
}) => {
  const { ColorPalette, SettingsTheme } = useTheme()

  // Try to get a friendly display name for the template
  const displayName = useMemo(() => {
    // If it looks like a UUID, just show "Workflow"
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(templateId)
    if (isUuid) return null
    // Otherwise humanize the template ID
    return templateId.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
  }, [templateId])

  // Get status color based on state using theme colors
  const getStatusColor = () => {
    const s = state.toLowerCase()
    if (['done', 'completed'].includes(s)) {
      return SettingsTheme.newSettingColors.successColor || ColorPalette.semantic.success
    }
    if (['failed', 'error', 'cancelled'].includes(s)) {
      return SettingsTheme.newSettingColors.deleteBtn
    }
    if (['paused'].includes(s)) {
      return SettingsTheme.newSettingColors.warningColor || '#FF9800'
    }
    return ColorPalette.brand.primary
  }

  // Get status label
  const getStatusLabel = () => {
    const s = state.toLowerCase()
    if (s === 'done' || s === 'completed') return t('Workflow.Completed' as any) || 'Completed'
    if (s === 'failed' || s === 'error') return t('Workflow.Failed' as any) || 'Failed'
    if (s === 'cancelled') return t('Workflow.Cancelled' as any) || 'Cancelled'
    if (s === 'paused') return t('Workflow.Paused' as any) || 'Paused'
    return t('Workflow.InProgress' as any) || 'In Progress'
  }

  // Create themed styles
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          width: 280,
          backgroundColor: SettingsTheme.newSettingColors.bgColorDown,
          borderRadius: 10,
          overflow: 'hidden',
          shadowColor: ColorPalette.grayscale.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        header: {
          paddingVertical: 8,
          paddingHorizontal: 12,
        },
        headerText: {
          color: ColorPalette.grayscale.white,
          fontSize: 12,
          fontWeight: '600' as const,
        },
        body: {
          padding: 12,
        },
        templateText: {
          color: ColorPalette.brand.text,
          fontSize: 14,
          fontWeight: '600' as const,
          marginBottom: 8,
        },
        sectionText: {
          color: SettingsTheme.newSettingColors.textColor,
          fontSize: 12,
          marginBottom: 8,
        },
        statusRow: {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
        },
        statusDot: {
          width: 8,
          height: 8,
          borderRadius: 4,
          marginRight: 6,
        },
        statusText: {
          color: SettingsTheme.newSettingColors.textColor,
          fontSize: 12,
        },
        tapHint: {
          color: ColorPalette.grayscale.mediumGrey,
          fontSize: 10,
          fontStyle: 'italic' as const,
          paddingHorizontal: 12,
          paddingBottom: 8,
        },
      }),
    [ColorPalette, SettingsTheme]
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: getStatusColor() }]}>
        <ThemedText style={styles.headerText}>{label}</ThemedText>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Template info */}
        {displayName && (
          <ThemedText style={styles.templateText} numberOfLines={1}>
            {displayName}
          </ThemedText>
        )}

        {/* Current section */}
        {section && (
          <ThemedText style={styles.sectionText}>
            {t('Workflow.CurrentStep' as any) || 'Step'}: {section}
          </ThemedText>
        )}

        {/* Status */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <ThemedText style={styles.statusText}>{getStatusLabel()}</ThemedText>
        </View>
      </View>

      {/* Tap to view hint */}
      <ThemedText style={styles.tapHint}>
        {t('Chat.TapToView' as any) || 'Tap to view details'}
      </ThemedText>
    </View>
  )
}

/**
 * Factory function to create a DIDCommWorkflowHandler
 */
export function createDIDCommWorkflowHandler(): DIDCommWorkflowHandler {
  return new DIDCommWorkflowHandler()
}
