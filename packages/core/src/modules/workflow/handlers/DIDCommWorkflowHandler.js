/**
 * DIDCommWorkflowHandler
 *
 * Handles DIDComm workflow instances in the chat interface.
 * Converts WorkflowInstanceRecord to chat messages with UI hints.
 */
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { CallbackType } from '../../../components/chat/ChatMessage';
import { ThemedText } from '../../../components/texts/ThemedText';
import { useTheme } from '../../../contexts/theme';
import { Role } from '../../../types/chat';
import { Screens } from '../../../types/navigators';
import { WorkflowType, } from '../types';
import { BaseWorkflowHandler } from './BaseWorkflowHandler';
/**
 * Check if a record is a WorkflowInstanceRecord
 */
function isWorkflowInstanceRecord(record) {
    if (!record || typeof record !== 'object')
        return false;
    const r = record;
    // WorkflowInstanceRecord has these key properties
    const hasId = typeof r.id === 'string';
    const hasTemplateId = typeof r.templateId === 'string';
    const hasInstanceId = typeof r.instanceId === 'string';
    const hasState = typeof r.state === 'string';
    const result = hasId && hasTemplateId && hasInstanceId && hasState;
    return result;
}
export class DIDCommWorkflowHandler extends BaseWorkflowHandler {
    type = WorkflowType.DIDComm;
    displayName = 'DIDComm Workflow';
    canHandle(record) {
        return isWorkflowInstanceRecord(record);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getRole(record) {
        // Workflows are typically initiated by them (the issuer/verifier)
        return Role.them;
    }
    getLabel(record, t) {
        // Try to get a friendly name based on template ID
        const templateId = record.templateId || '';
        // Common template patterns
        if (templateId.includes('credential') || templateId.includes('issuance')) {
            return t('Workflow.CredentialWorkflow') || 'Credential Workflow';
        }
        if (templateId.includes('proof') || templateId.includes('verification')) {
            return t('Workflow.ProofWorkflow') || 'Proof Workflow';
        }
        return t('Workflow.Workflow') || 'Workflow';
    }
    getCallbackType(record) {
        // If workflow has pending actions, show a callback
        const state = record.state?.toLowerCase() || '';
        if (!['done', 'completed', 'cancelled', 'failed', 'error'].includes(state)) {
            return CallbackType.Workflow;
        }
        return undefined;
    }
    toMessage(record, _connection, context) {
        const role = this.getRole(record);
        const label = this.getLabel(record, context.t);
        const state = record.state || 'unknown';
        const section = record.section || '';
        // Create the workflow bubble
        const renderEvent = () => (<WorkflowBubble templateId={record.templateId} state={state} section={section} label={label} t={context.t}/>);
        return {
            _id: record.id,
            text: label,
            renderEvent,
            createdAt: record.createdAt,
            user: { _id: role },
            messageOpensCallbackType: this.getCallbackType(record),
            onDetails: this.createOnDetails(record, context.navigation),
        };
    }
    getDetailNavigation(record) {
        return {
            screen: Screens.WorkflowDetails,
            params: { instanceId: record.instanceId },
        };
    }
    shouldDisplay(record) {
        // Show all workflows except completed ones (unless they just completed)
        const state = record.state?.toLowerCase() || '';
        const completedStates = ['done', 'completed', 'cancelled', 'failed', 'error'];
        // Show if not completed, or if completed recently (within last hour)
        if (!completedStates.includes(state)) {
            return true;
        }
        // Check if completed recently
        const updatedAt = record.updatedAt ? new Date(record.updatedAt) : record.createdAt;
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return updatedAt > oneHourAgo;
    }
    /**
     * Create the onDetails callback for navigation
     */
    createOnDetails(record, navigation) {
        if (!navigation)
            return undefined;
        return () => {
            navigation.navigate(Screens.WorkflowDetails, { instanceId: record.instanceId });
        };
    }
}
const WorkflowBubble = ({ templateId, state, section, label, t, }) => {
    const { ColorPalette, SettingsTheme } = useTheme();
    // Get status color based on state using theme colors
    const getStatusColor = () => {
        const s = state.toLowerCase();
        if (['done', 'completed'].includes(s)) {
            return SettingsTheme.newSettingColors.successColor || ColorPalette.semantic.success;
        }
        if (['failed', 'error', 'cancelled'].includes(s)) {
            return SettingsTheme.newSettingColors.deleteBtn;
        }
        if (['paused'].includes(s)) {
            return SettingsTheme.newSettingColors.warningColor || '#FF9800';
        }
        return ColorPalette.brand.primary;
    };
    // Get status label
    const getStatusLabel = () => {
        const s = state.toLowerCase();
        if (s === 'done' || s === 'completed')
            return t('Workflow.Completed') || 'Completed';
        if (s === 'failed' || s === 'error')
            return t('Workflow.Failed') || 'Failed';
        if (s === 'cancelled')
            return t('Workflow.Cancelled') || 'Cancelled';
        if (s === 'paused')
            return t('Workflow.Paused') || 'Paused';
        return t('Workflow.InProgress') || 'In Progress';
    };
    // Create themed styles
    const styles = useMemo(() => StyleSheet.create({
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
            fontWeight: '600',
        },
        body: {
            padding: 12,
        },
        templateText: {
            color: ColorPalette.brand.text,
            fontSize: 14,
            fontWeight: '600',
            marginBottom: 8,
        },
        sectionText: {
            color: SettingsTheme.newSettingColors.textColor,
            fontSize: 12,
            marginBottom: 8,
        },
        statusRow: {
            flexDirection: 'row',
            alignItems: 'center',
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
            fontStyle: 'italic',
            paddingHorizontal: 12,
            paddingBottom: 8,
        },
    }), [ColorPalette, SettingsTheme]);
    return (<View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: getStatusColor() }]}>
        <ThemedText style={styles.headerText}>{label}</ThemedText>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Template info */}
        <ThemedText style={styles.templateText} numberOfLines={1}>
          {templateId.split('/').pop() || templateId}
        </ThemedText>

        {/* Current section */}
        {section && (<ThemedText style={styles.sectionText}>
            {t('Workflow.CurrentStep') || 'Step'}: {section}
          </ThemedText>)}

        {/* Status */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]}/>
          <ThemedText style={styles.statusText}>{getStatusLabel()}</ThemedText>
        </View>
      </View>

      {/* Tap to view hint */}
      <ThemedText style={styles.tapHint}>
        {t('Chat.TapToView') || 'Tap to view details'}
      </ThemedText>
    </View>);
};
/**
 * Factory function to create a DIDCommWorkflowHandler
 */
export function createDIDCommWorkflowHandler() {
    return new DIDCommWorkflowHandler();
}
