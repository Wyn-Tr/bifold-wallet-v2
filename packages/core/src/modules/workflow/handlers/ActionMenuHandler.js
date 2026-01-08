/**
 * ActionMenuWorkflowHandler
 *
 * Handles action menu messages (JSON with displayData) in the chat interface.
 * Ported from bifold-wallet-1.
 */
import { BasicMessageRecord } from '@credo-ts/core';
import { BasicMessageRole } from '@credo-ts/core/build/modules/basic-messages/BasicMessageRole';
import React from 'react';
import { Alert } from 'react-native';
import { Role } from '../../../types/chat';
import { Screens } from '../../../types/navigators';
import { connectFromScanOrDeepLink } from '../../../utils/helpers';
import { WorkflowType, } from '../types';
import { ActionMenuBubble } from './components/ActionMenuBubble';
import { BaseWorkflowHandler } from './BaseWorkflowHandler';
export class ActionMenuWorkflowHandler extends BaseWorkflowHandler {
    type = WorkflowType.ActionMenu;
    displayName = 'Action Menu';
    agent;
    connectionId;
    navigation;
    logger;
    t;
    /**
     * Set the agent instance for sending messages
     */
    setAgent(agent) {
        this.agent = agent;
    }
    /**
     * Set the connection ID for sending messages
     */
    setConnectionId(connectionId) {
        this.connectionId = connectionId;
    }
    /**
     * Set navigation for routing after invitation connections
     */
    setNavigation(navigation) {
        this.navigation = navigation;
    }
    /**
     * Set logger instance for error logging
     */
    setLogger(logger) {
        this.logger = logger;
    }
    /**
     * Set translation function for localized messages
     */
    setTranslation(t) {
        this.t = t;
    }
    /**
     * Configure the handler with all dependencies at once
     */
    configure(config) {
        this.agent = config.agent;
        this.connectionId = config.connectionId;
        this.navigation = config.navigation;
        this.logger = config.logger;
        this.t = config.t;
    }
    canHandle(record) {
        if (!(record instanceof BasicMessageRecord)) {
            return false;
        }
        // Check if it's an action menu message (JSON with displayData)
        const parsed = this.parseActionMenu(record);
        if (parsed) {
            // Attach parsed data to record for later use
            record._parsedActionMenu = parsed;
            return true;
        }
        return false;
    }
    getRole(record) {
        return record.role === BasicMessageRole.Sender ? Role.me : Role.them;
    }
    getLabel(record) {
        const parsed = record._parsedActionMenu ?? this.parseActionMenu(record);
        if (parsed) {
            // Find title in displayData
            const titleItem = parsed.displayData.find((item) => item.type === 'title');
            return titleItem?.text ?? 'Action Menu';
        }
        return 'Action Menu';
    }
    getCallbackType() {
        // Action menus have their own buttons, no need for callback type
        return undefined;
    }
    toMessage(record, connection, context) {
        const parsed = record._parsedActionMenu ?? this.parseActionMenu(record);
        // Capture current context values for the closure
        // These are captured fresh each time to ensure correct connection is used
        const currentAgent = context.agent ?? this.agent;
        const currentConnectionId = connection?.id ?? this.connectionId;
        const currentNavigation = context.navigation ?? this.navigation;
        const currentLogger = context.logger ?? this.logger;
        const currentT = context.t ?? this.t;
        if (!parsed) {
            // Fallback to basic text if parsing fails
            return {
                _id: record.id,
                text: record.content,
                renderEvent: () => <></>,
                createdAt: record.createdAt,
                user: { _id: this.getRole(record) },
                messageOpensCallbackType: undefined,
                onDetails: undefined,
            };
        }
        // Create handler bound with current context values
        const handlePress = async (actionId, workflowID, invitationLink) => {
            if (!currentAgent || !currentConnectionId) {
                return;
            }
            if (invitationLink) {
                await this.handleConnectToInvitationWithContext(invitationLink, currentAgent, currentNavigation, currentLogger, currentT);
            }
            else {
                const actionJSON = {
                    workflowID,
                    actionID: actionId,
                    data: {},
                };
                await currentAgent.basicMessages.sendMessage(currentConnectionId, JSON.stringify(actionJSON));
            }
        };
        const renderEvent = () => (<ActionMenuBubble content={parsed.displayData} workflowID={parsed.workflowID} onActionPress={handlePress}/>);
        return {
            _id: record.id,
            text: this.getLabel(record),
            renderEvent,
            createdAt: record.createdAt,
            user: { _id: this.getRole(record) },
            messageOpensCallbackType: undefined,
            onDetails: undefined,
        };
    }
    getDetailNavigation() {
        // Action menus handle their own navigation via buttons
        return undefined;
    }
    shouldDisplay(record) {
        // Only show action menus from the other party (them)
        const role = this.getRole(record);
        return role === Role.them;
    }
    /**
     * Handle action button press in the action menu
     */
    async handleActionButtonPress(actionId, workflowID, invitationLink) {
        if (!this.agent || !this.connectionId) {
            return;
        }
        if (invitationLink) {
            await this.handleConnectToInvitation(invitationLink);
        }
        else {
            const actionJSON = {
                workflowID,
                actionID: actionId,
                data: {},
            };
            await this.agent.basicMessages.sendMessage(this.connectionId, JSON.stringify(actionJSON));
        }
    }
    /**
     * Handle connecting to an invitation from an action menu button with context values
     * This version uses passed-in context to avoid stale closure issues
     */
    async handleConnectToInvitationWithContext(invitationLink, agent, navigation, logger, t) {
        const errorTitle = t?.('Global.Error') ?? 'Error';
        if (!agent) {
            logger?.error('Agent is not initialized');
            Alert.alert(errorTitle, t?.('Global.UnableToConnect') ?? 'Unable to connect. Please try again later.');
            return;
        }
        try {
            // Parse the invitation first
            const parsedInvitation = await agent.oob.parseInvitation(invitationLink);
            const invitationId = parsedInvitation.id;
            // Check if we already have an existing connection via this invitation
            const existingOutOfBandRecord = await agent.oob.findByReceivedInvitationId(invitationId);
            if (existingOutOfBandRecord) {
                const existingConnections = await agent.connections.findAllByOutOfBandId(existingOutOfBandRecord.id);
                if (existingConnections && existingConnections.length > 0) {
                    const existingConnection = existingConnections[0];
                    logger?.info('Already connected via this invitation, navigating to existing chat');
                    // Navigate to the existing connection's chat
                    if (navigation) {
                        navigation.reset({
                            index: 0,
                            routes: [
                                {
                                    name: Screens.Chat,
                                    params: { connectionId: existingConnection.id },
                                },
                            ],
                        });
                    }
                    return;
                }
            }
            // Use the connectFromScanOrDeepLink helper which handles all the connection logic
            // and navigates to the Connection screen to show progress
            if (navigation && logger) {
                await connectFromScanOrDeepLink(invitationLink, agent, logger, navigation, false, // isDeepLink
                false, // implicitInvitations
                true // reuseConnection
                );
            }
            else {
                // Fallback: receive invitation directly without navigation
                const receivedInvitation = await agent.oob.receiveInvitation(parsedInvitation);
                logger?.info(`Invitation received, oob record id: ${receivedInvitation.outOfBandRecord.id}`);
            }
        }
        catch (error) {
            logger?.error('Error processing the invitation:', error);
            Alert.alert(errorTitle, t?.('Global.ConnectionError') ?? 'An error occurred while connecting. Please try again.');
        }
    }
    /**
     * Handle connecting to an invitation from an action menu button
     * @deprecated Use handleConnectToInvitationWithContext instead
     */
    async handleConnectToInvitation(invitationLink) {
        return this.handleConnectToInvitationWithContext(invitationLink, this.agent, this.navigation, this.logger, this.t);
    }
    /**
     * Parse an action menu from a BasicMessageRecord
     */
    parseActionMenu(record) {
        try {
            const parsed = JSON.parse(record.content);
            if (parsed && Array.isArray(parsed.displayData)) {
                return {
                    displayData: parsed.displayData,
                    workflowID: parsed.workflowID ?? '',
                };
            }
        }
        catch {
            // Not an action menu message
        }
        return undefined;
    }
}
/**
 * Factory function to create an ActionMenuWorkflowHandler
 */
export function createActionMenuHandler() {
    return new ActionMenuWorkflowHandler();
}
