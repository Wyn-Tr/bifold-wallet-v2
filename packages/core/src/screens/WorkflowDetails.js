import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, TextInput, Alert, KeyboardAvoidingView, Platform, } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Button, { ButtonType } from '../components/buttons/Button';
import { ThemedText } from '../components/texts/ThemedText';
import { useTheme } from '../contexts/theme';
import { useWorkflowInstance } from '../hooks/useWorkflowInstance';
import { useWorkflowEvents } from '../hooks/useWorkflowEvents';
import { testIdWithKey } from '../utils/testable';
/**
 * Flatten a JSON Schema into a list of renderable fields
 */
function flattenSchema(schema, path = []) {
    const fields = [];
    if (schema.type === 'object' && schema.properties) {
        const required = schema.required ?? [];
        for (const [key, prop] of Object.entries(schema.properties)) {
            const newPath = [...path, key];
            if (prop.type === 'object' && prop.properties) {
                fields.push(...flattenSchema(prop, newPath));
            }
            else {
                fields.push({
                    path: newPath,
                    key,
                    title: prop.title ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
                    type: prop.type,
                    required: required.includes(key),
                    description: prop.description,
                    enumOptions: prop.enum,
                });
            }
        }
    }
    return fields;
}
/**
 * Build a nested object from flat form values
 */
function buildNestedObject(fields, values) {
    const result = {};
    for (const field of fields) {
        const value = values[field.path.join('.')];
        if (value === undefined || value === '')
            continue;
        let current = result;
        for (let i = 0; i < field.path.length - 1; i++) {
            const segment = field.path[i];
            if (!current[segment]) {
                current[segment] = {};
            }
            current = current[segment];
        }
        current[field.path[field.path.length - 1]] = value;
    }
    return result;
}
/**
 * Flatten context object for display
 */
function flattenContextForDisplay(context, prefix = '') {
    const result = [];
    for (const [key, val] of Object.entries(context)) {
        if (key.startsWith('_'))
            continue;
        const label = prefix
            ? `${prefix} ${key.replace(/([A-Z])/g, ' $1').trim()}`
            : key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            result.push(...flattenContextForDisplay(val, label));
        }
        else if (val !== null && val !== undefined && val !== '') {
            const displayValue = Array.isArray(val) ? val.join(', ') : String(val);
            result.push({ label, value: displayValue });
        }
    }
    return result;
}
const WorkflowDetails = ({ route }) => {
    const { instanceId } = route.params;
    const { t } = useTranslation();
    const { ColorPalette, SettingsTheme } = useTheme();
    const [actionLoading, setActionLoading] = useState(null);
    const [formValues, setFormValues] = useState({});
    const insets = useSafeAreaInsets();
    const { instance, status, loading, error, refresh, advance, actions, uiHints, isComplete, uiProfile, pause, resume, cancel, } = useWorkflowInstance(instanceId);
    // Clear form when workflow state changes
    const workflowState = status?.state;
    useEffect(() => {
        setFormValues({});
    }, [workflowState]);
    const handleFormChange = useCallback((key, value) => {
        setFormValues(prev => ({ ...prev, [key]: value }));
    }, []);
    // Subscribe to workflow events for real-time updates
    useWorkflowEvents({
        instanceId,
        onStateChanged: useCallback(() => {
            refresh();
        }, [refresh]),
        onStatusChanged: useCallback(() => {
            refresh();
        }, [refresh]),
        onCompleted: useCallback(() => {
            refresh();
        }, [refresh]),
    });
    // State configuration for icons and colors using theme
    const successColor = SettingsTheme.newSettingColors.successColor || ColorPalette.semantic.success;
    const errorColor = SettingsTheme.newSettingColors.deleteBtn;
    const warningColor = SettingsTheme.newSettingColors.warningColor || '#FF9800';
    const infoColor = SettingsTheme.newSettingColors.buttonColor;
    const stateConfig = useMemo(() => ({
        pending: { icon: 'clock-outline', color: warningColor },
        in_progress: { icon: 'loading', color: ColorPalette.brand.primary },
        awaiting_input: { icon: 'pencil', color: infoColor },
        completed: { icon: 'check-circle', color: successColor },
        done: { icon: 'check-circle', color: successColor },
        failed: { icon: 'close-circle', color: errorColor },
        error: { icon: 'alert-circle', color: errorColor },
        cancelled: { icon: 'cancel', color: ColorPalette.grayscale.mediumGrey },
        paused: { icon: 'pause-circle', color: warningColor },
        default: { icon: 'state-machine', color: ColorPalette.brand.primary },
    }), [ColorPalette, successColor, errorColor, warningColor, infoColor]);
    const { icon, color } = useMemo(() => {
        const statusValue = status?.status?.toLowerCase() ?? 'default';
        return stateConfig[statusValue] ?? stateConfig.default;
    }, [status, stateConfig]);
    const _templateName = useMemo(() => {
        const templateId = status?.template_id ?? instance?.templateId ?? 'Workflow';
        return templateId
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
    }, [status, instance]);
    void _templateName; // Reserved for future use
    const currentState = useMemo(() => {
        const state = status?.state ?? 'Unknown';
        return state
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
    }, [status]);
    const currentSection = status?.section ?? '';
    const handleAction = useCallback(async (event, input) => {
        setActionLoading(event);
        try {
            await advance(event, input);
        }
        catch (e) {
            Alert.alert(t('Workflow.ActionFailed') || 'Action Failed', e.message || t('Workflow.ActionFailedDescription') || 'Something went wrong', [{ text: t('Global.Okay') }]);
        }
        finally {
            setActionLoading(null);
        }
    }, [advance, t]);
    // Workflow control handlers
    const handlePause = useCallback(() => {
        Alert.alert(t('Workflow.PauseWorkflow') || 'Pause Workflow', t('Workflow.PauseConfirmation') || 'Are you sure you want to pause this workflow?', [
            { text: t('Global.Cancel'), style: 'cancel' },
            {
                text: t('Global.Confirm'),
                onPress: async () => {
                    try {
                        await pause();
                        refresh();
                    }
                    catch (e) {
                        Alert.alert(t('Global.Failure') || 'Failure', e.message || t('Global.SomethingWentWrong') || 'Something went wrong', [{ text: t('Global.Okay') }]);
                    }
                },
            },
        ]);
    }, [pause, refresh, t]);
    const handleResume = useCallback(() => {
        Alert.alert(t('Workflow.ResumeWorkflow') || 'Resume Workflow', t('Workflow.ResumeConfirmation') || 'Are you sure you want to resume this workflow?', [
            { text: t('Global.Cancel'), style: 'cancel' },
            {
                text: t('Global.Confirm'),
                onPress: async () => {
                    try {
                        await resume();
                        refresh();
                    }
                    catch (e) {
                        Alert.alert(t('Global.Failure') || 'Failure', e.message || t('Global.SomethingWentWrong') || 'Something went wrong', [{ text: t('Global.Okay') }]);
                    }
                },
            },
        ]);
    }, [resume, refresh, t]);
    const handleCancel = useCallback(() => {
        Alert.alert(t('Workflow.CancelWorkflow') || 'Cancel Workflow', t('Workflow.CancelConfirmation') || 'Are you sure you want to cancel this workflow?', [
            { text: t('Global.Cancel'), style: 'cancel' },
            {
                text: t('Workflow.CancelWorkflow') || 'Cancel Workflow',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await cancel();
                        refresh();
                    }
                    catch (e) {
                        Alert.alert(t('Global.Failure') || 'Failure', e.message || t('Global.SomethingWentWrong') || 'Something went wrong', [{ text: t('Global.Okay') }]);
                    }
                },
            },
        ]);
    }, [cancel, refresh, t]);
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
            paddingBottom: 100,
        },
        loadingContainer: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        loadingText: {
            color: ColorPalette.grayscale.mediumGrey,
            marginTop: 12,
            fontSize: 14,
        },
        errorContainer: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
        },
        errorTitle: {
            color: ColorPalette.semantic.error,
            fontSize: 18,
            fontWeight: '600',
            marginTop: 12,
            marginBottom: 8,
        },
        errorSubtitle: {
            color: ColorPalette.grayscale.mediumGrey,
            fontSize: 14,
            textAlign: 'center',
        },
        retryButton: {
            marginTop: 20,
            minWidth: 120,
        },
        stateCard: {
            backgroundColor: ColorPalette.brand.secondaryBackground,
            borderRadius: 12,
            padding: 24,
            alignItems: 'center',
            marginBottom: 16,
            borderWidth: 1,
            borderColor: ColorPalette.grayscale.lightGrey,
        },
        stateIcon: {
            width: 72,
            height: 72,
            borderRadius: 36,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
        },
        stateName: {
            fontSize: 20,
            fontWeight: '600',
            color: ColorPalette.brand.text,
            marginBottom: 4,
            textAlign: 'center',
        },
        sectionName: {
            fontSize: 14,
            color: ColorPalette.grayscale.mediumGrey,
            marginBottom: 12,
        },
        statusBadge: {
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            marginBottom: 8,
        },
        statusBadgeText: {
            fontSize: 12,
            fontWeight: '600',
            textTransform: 'capitalize',
        },
        roleContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
        },
        roleText: {
            fontSize: 12,
            color: ColorPalette.grayscale.mediumGrey,
        },
        section: {
            marginBottom: 16,
        },
        sectionTitle: {
            fontSize: 12,
            fontWeight: '600',
            color: ColorPalette.grayscale.mediumGrey,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 8,
        },
        uiText: {
            fontSize: 14,
            color: ColorPalette.brand.text,
            marginBottom: 8,
        },
        formContainer: {
            marginBottom: 12,
        },
        formFieldsContainer: {
            backgroundColor: ColorPalette.brand.secondaryBackground,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: ColorPalette.grayscale.lightGrey,
            padding: 16,
            marginBottom: 12,
        },
        formFieldContainer: {
            marginBottom: 16,
        },
        formFieldLabel: {
            fontSize: 14,
            fontWeight: '600',
            color: ColorPalette.brand.text,
            marginBottom: 4,
        },
        requiredStar: {
            color: ColorPalette.semantic.error,
        },
        formFieldDescription: {
            fontSize: 12,
            color: ColorPalette.grayscale.mediumGrey,
            marginBottom: 4,
        },
        formFieldInput: {
            backgroundColor: ColorPalette.brand.primaryBackground,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: ColorPalette.grayscale.lightGrey,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
            color: ColorPalette.brand.text,
        },
        contextCard: {
            backgroundColor: ColorPalette.brand.secondaryBackground,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: ColorPalette.grayscale.lightGrey,
            overflow: 'hidden',
        },
        contextRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: ColorPalette.grayscale.lightGrey,
        },
        contextRowLast: {
            borderBottomWidth: 0,
        },
        contextKey: {
            fontSize: 14,
            fontWeight: '600',
            color: ColorPalette.brand.text,
            flex: 0.4,
        },
        contextValue: {
            fontSize: 14,
            color: ColorPalette.grayscale.mediumGrey,
            flex: 0.6,
            textAlign: 'right',
        },
        completeCard: {
            backgroundColor: `${successColor}15`,
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            borderWidth: 1,
            borderColor: `${successColor}30`,
        },
        completeText: {
            fontSize: 14,
            fontWeight: '600',
            color: successColor,
        },
        actionsContainer: {
            paddingTop: 12,
            gap: 8,
        },
        actionButtonContainer: {
            marginBottom: 8,
        },
        controlsContainer: {
            flexDirection: 'row',
            gap: 8,
            marginTop: 16,
        },
        controlButton: {
            flex: 1,
        },
    });
    // UI Hint Renderer
    const renderUiHint = useCallback((hint, index) => {
        if (hint.type === 'text') {
            return <ThemedText key={index} style={styles.uiText}>{hint.text}</ThemedText>;
        }
        if (hint.type === 'submit-button') {
            const label = hint.label || hint.event || 'Submit';
            const schemaFields = hint.input_schema ? flattenSchema(hint.input_schema) : [];
            const hasSchema = schemaFields.length > 0;
            const isFormValid = !hasSchema || schemaFields
                .filter(f => f.required)
                .every(f => {
                const val = formValues[f.path.join('.')];
                return val && val.trim().length > 0;
            });
            const handleSubmit = () => {
                if (hasSchema) {
                    const input = buildNestedObject(schemaFields, formValues);
                    handleAction(hint.event, input);
                }
                else {
                    handleAction(hint.event);
                }
            };
            return (<View key={index} style={styles.formContainer}>
          {hasSchema && (<View style={styles.formFieldsContainer}>
              {schemaFields.map((field) => (<View key={field.path.join('.')} style={styles.formFieldContainer}>
                  <ThemedText style={styles.formFieldLabel}>
                    {field.title}
                    {field.required && <ThemedText style={styles.requiredStar}> *</ThemedText>}
                  </ThemedText>
                  {field.description && (<ThemedText style={styles.formFieldDescription}>{field.description}</ThemedText>)}
                  <TextInput style={styles.formFieldInput} value={formValues[field.path.join('.')] ?? ''} onChangeText={(val) => handleFormChange(field.path.join('.'), val)} placeholder={`Enter ${field.title.toLowerCase()}...`} placeholderTextColor={ColorPalette.grayscale.mediumGrey} autoCapitalize="none" autoCorrect={false} testID={testIdWithKey(`FormField-${field.path.join('.')}`)}/>
                </View>))}
            </View>)}
          <Button title={label} buttonType={ButtonType.Primary} onPress={handleSubmit} disabled={actionLoading !== null || !isFormValid} testID={testIdWithKey(`WorkflowAction-${hint.event}`)}/>
        </View>);
        }
        if (hint.type === 'divider') {
            return <View key={index} style={{ height: 1, backgroundColor: ColorPalette.grayscale.lightGrey, marginVertical: 12 }}/>;
        }
        return null;
    }, [styles, formValues, handleFormChange, handleAction, actionLoading, ColorPalette]);
    // Loading state
    if (loading && !status) {
        return (<SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ColorPalette.brand.primary}/>
          <ThemedText style={styles.loadingText}>Loading workflow...</ThemedText>
        </View>
      </SafeAreaView>);
    }
    // Error state
    if (error || !status) {
        return (<SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={ColorPalette.semantic.error}/>
          <ThemedText style={styles.errorTitle}>Failed to load workflow</ThemedText>
          <ThemedText style={styles.errorSubtitle}>{error?.message || 'Unknown error'}</ThemedText>
          <View style={styles.retryButton}>
            <Button title="Retry" buttonType={ButtonType.Secondary} onPress={refresh} testID={testIdWithKey('RetryButton')}/>
          </View>
        </View>
      </SafeAreaView>);
    }
    const workflowStatus = status?.status?.toLowerCase();
    const showControls = !isComplete && workflowStatus !== 'cancelled' && workflowStatus !== 'failed';
    return (<SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 60 : 0}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
          {/* State Card */}
          <View style={styles.stateCard}>
            <View style={[styles.stateIcon, { backgroundColor: color + '20' }]}>
              <Icon name={icon} size={36} color={color}/>
            </View>
            <ThemedText style={styles.stateName}>{currentState}</ThemedText>
            {currentSection ? (<ThemedText style={styles.sectionName}>{currentSection}</ThemedText>) : null}

            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
              <ThemedText style={[styles.statusBadgeText, { color }]}>
                {status.status ?? 'Active'}
              </ThemedText>
            </View>

            {/* Role Indicator */}
            {uiProfile && (<View style={styles.roleContainer}>
                <Icon name={uiProfile === 'sender' ? 'send' : 'inbox'} size={14} color={ColorPalette.grayscale.mediumGrey}/>
                <ThemedText style={styles.roleText}>
                  You are the {uiProfile === 'sender' ? 'Initiator' : 'Participant'}
                </ThemedText>
              </View>)}
          </View>

          {/* UI Hints */}
          {uiHints.length > 0 && (<View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Instructions</ThemedText>
              {uiHints.map((hint, index) => renderUiHint(hint, index))}
            </View>)}

          {/* Context Data */}
          {status.context && Object.keys(status.context).length > 0 && (<View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Collected Information</ThemedText>
              <View style={styles.contextCard}>
                {flattenContextForDisplay(status.context).map(({ label, value }, index, arr) => (<View key={label} style={[
                    styles.contextRow,
                    index === arr.length - 1 && styles.contextRowLast,
                ]}>
                    <ThemedText style={styles.contextKey}>{label}</ThemedText>
                    <ThemedText style={styles.contextValue} numberOfLines={2}>
                      {value}
                    </ThemedText>
                  </View>))}
              </View>
            </View>)}

          {/* Completed State */}
          {isComplete && (<View style={styles.completeCard}>
              <Icon name="check-circle" size={32} color={successColor}/>
              <ThemedText style={styles.completeText}>Workflow Complete</ThemedText>
            </View>)}

          {/* Actions */}
          {!isComplete && actions.length > 0 && (<View style={styles.actionsContainer}>
              {actions.map((action, index) => (<View key={action.key || action.event} style={styles.actionButtonContainer}>
                  <Button title={action.label || action.event.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} buttonType={index === 0 ? ButtonType.Primary : ButtonType.Secondary} onPress={() => handleAction(action.event)} disabled={actionLoading === action.event} testID={testIdWithKey(`WorkflowAction-${action.event}`)}/>
                </View>))}
            </View>)}

          {/* Workflow Controls */}
          {showControls && (<View style={styles.controlsContainer}>
              {(workflowStatus === 'in_progress' || workflowStatus === 'awaiting_input') && (<View style={styles.controlButton}>
                  <Button title={t('Workflow.PauseWorkflow') || 'Pause'} buttonType={ButtonType.Secondary} onPress={handlePause} testID={testIdWithKey('PauseWorkflow')}/>
                </View>)}
              {workflowStatus === 'paused' && (<View style={styles.controlButton}>
                  <Button title={t('Workflow.ResumeWorkflow') || 'Resume'} buttonType={ButtonType.Secondary} onPress={handleResume} testID={testIdWithKey('ResumeWorkflow')}/>
                </View>)}
              <View style={styles.controlButton}>
                <Button title={t('Workflow.CancelWorkflow') || 'Cancel'} buttonType={ButtonType.Secondary} onPress={handleCancel} testID={testIdWithKey('CancelWorkflow')}/>
              </View>
            </View>)}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>);
};
export default WorkflowDetails;
