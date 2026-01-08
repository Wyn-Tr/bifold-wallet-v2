/**
 * CredentialWorkflowHandler
 *
 * Handles credential exchange workflow records in the chat interface.
 * Supports custom renderers for displaying credentials as visual cards.
 */
import { CredentialExchangeRecord, CredentialState } from '@credo-ts/core';
import React from 'react';
import { ChatEvent } from '../../../components/chat/ChatEvent';
import { CallbackType } from '../../../components/chat/ChatMessage';
import { SettingsTheme } from '../../../theme';
import { Role } from '../../../types/chat';
import { Screens, Stacks } from '../../../types/navigators';
import { getCredentialEventLabel, getCredentialEventRole } from '../../../utils/helpers';
import { WorkflowType } from '../types';
import { BaseWorkflowHandler } from './BaseWorkflowHandler';
export class CredentialWorkflowHandler extends BaseWorkflowHandler {
    type = WorkflowType.Credential;
    displayName = 'Credential Exchange';
    /** Custom renderer for displaying credentials as visual cards */
    renderer;
    canHandle(record) {
        return record instanceof CredentialExchangeRecord;
    }
    getRole(record) {
        return getCredentialEventRole(record);
    }
    getLabel(record, t) {
        const labelKey = getCredentialEventLabel(record);
        return labelKey ? t(labelKey) : '';
    }
    getCallbackType(record) {
        if (record.state === CredentialState.Done || record.state === CredentialState.OfferReceived) {
            return CallbackType.CredentialOffer;
        }
        return undefined;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // CUSTOM RENDERER SUPPORT
    // ═══════════════════════════════════════════════════════════════════════════
    setRenderer(renderer) {
        this.renderer = renderer;
    }
    getRenderer() {
        return this.renderer;
    }
    hasCustomRenderer() {
        return this.renderer !== undefined;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // MESSAGE TRANSFORMATION
    // ═══════════════════════════════════════════════════════════════════════════
    toMessage(record, connection, context) {
        const role = this.getRole(record);
        const userLabel = role === Role.me ? context.t('Chat.UserYou') : context.theirLabel;
        const actionLabel = this.getLabel(record, context.t);
        let renderEvent;
        // Use custom renderer if available
        if (this.renderer && context.navigation) {
            const renderContext = {
                t: context.t,
                navigation: context.navigation,
                theirLabel: context.theirLabel,
                settingsTheme: SettingsTheme,
                chatTheme: context.theme,
                colorPalette: context.colorPalette,
                isInChat: true,
                modalWidthPercent: 90,
            };
            renderEvent = () => this.renderer.render(record, renderContext);
        }
        else {
            // Default rendering as text event
            renderEvent = () => <ChatEvent role={role} userLabel={userLabel} actionLabel={actionLabel}/>;
        }
        return {
            ...this.createBaseMessage(record, context, renderEvent),
            messageOpensCallbackType: this.getCallbackType(record),
            onDetails: this.createOnDetails(record, context.navigation),
        };
    }
    getDetailNavigation(record) {
        if (record.state === CredentialState.Done) {
            return {
                stack: Stacks.ContactStack,
                screen: Screens.CredentialDetails,
                params: { credentialId: record.id },
            };
        }
        if (record.state === CredentialState.OfferReceived) {
            return {
                stack: Stacks.ConnectionStack,
                screen: Screens.Connection,
                params: { credentialId: record.id },
            };
        }
        return undefined;
    }
    /**
     * Create the onDetails callback for navigation
     */
    createOnDetails(record, navigation) {
        if (!navigation)
            return undefined;
        const navResult = this.getDetailNavigation(record);
        if (!navResult)
            return undefined;
        return () => {
            if (navResult.stack) {
                // Navigate to a specific stack and screen
                const parent = navigation.getParent();
                if (parent) {
                    parent.navigate(navResult.stack, {
                        screen: navResult.screen,
                        params: navResult.params,
                    });
                }
                else {
                    navigation.navigate(navResult.stack, {
                        screen: navResult.screen,
                        params: navResult.params,
                    });
                }
            }
            else {
                navigation.navigate(navResult.screen, navResult.params);
            }
        };
    }
    isNotification(record) {
        return record.state === CredentialState.OfferReceived;
    }
}
/**
 * Factory function to create a CredentialWorkflowHandler
 */
export function createCredentialHandler() {
    return new CredentialWorkflowHandler();
}
