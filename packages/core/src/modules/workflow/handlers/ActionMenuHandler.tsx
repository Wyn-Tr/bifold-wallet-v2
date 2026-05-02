/**
 * ActionMenuWorkflowHandler
 *
 * Handles action menu messages (JSON with displayData) in the chat interface.
 * Ported from bifold-wallet-1.
 */

import { Agent, BasicMessageRecord, ConnectionRecord } from '@credo-ts/core'
import { BasicMessageRole } from '@credo-ts/core/build/modules/basic-messages/BasicMessageRole'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { Alert, Text, TouchableOpacity, View, StyleSheet } from 'react-native'
import { TFunction } from 'react-i18next'

import { CallbackType, ExtendedChatMessage } from '../../../components/chat/ChatMessage'
import { Role } from '../../../types/chat'
import { Screens, RootStackParams, ContactStackParams } from '../../../types/navigators'
import { connectFromScanOrDeepLink } from '../../../utils/helpers'
import { BifoldLogger } from '../../../services/logger'
import { ActionMenuContentItem, ActionMenuMessage, MessageContext, NavigationResult, WorkflowType } from '../types'

import { ActionMenuBubble } from './components/ActionMenuBubble'
import { BaseWorkflowHandler } from './BaseWorkflowHandler'

/**
 * Extended BasicMessageRecord with parsed action menu data
 */
interface ActionMenuRecord extends BasicMessageRecord {
  _parsedActionMenu?: ActionMenuMessage
}

export class ActionMenuWorkflowHandler extends BaseWorkflowHandler<ActionMenuRecord> {
  readonly type = WorkflowType.ActionMenu
  readonly displayName = 'Action Menu'

  private agent?: Agent
  private connectionId?: string
  private navigation?: StackNavigationProp<RootStackParams | ContactStackParams>
  private logger?: BifoldLogger
  private t?: TFunction

  /**
   * Set the agent instance for sending messages
   */
  setAgent(agent: Agent): void {
    this.agent = agent
  }

  /**
   * Set the connection ID for sending messages
   */
  setConnectionId(connectionId: string): void {
    this.connectionId = connectionId
  }

  /**
   * Set navigation for routing after invitation connections
   */
  setNavigation(navigation: StackNavigationProp<RootStackParams | ContactStackParams>): void {
    this.navigation = navigation
  }

  /**
   * Set logger instance for error logging
   */
  setLogger(logger: BifoldLogger): void {
    this.logger = logger
  }

  /**
   * Set translation function for localized messages
   */
  setTranslation(t: TFunction): void {
    this.t = t
  }

  /**
   * Configure the handler with all dependencies at once
   */
  configure(config: {
    agent: Agent
    connectionId: string
    navigation?: StackNavigationProp<RootStackParams | ContactStackParams>
    logger?: BifoldLogger
    t?: TFunction
  }): void {
    this.agent = config.agent
    this.connectionId = config.connectionId
    this.navigation = config.navigation
    this.logger = config.logger
    this.t = config.t
  }

  canHandle(record: unknown): record is ActionMenuRecord {
    if (!(record instanceof BasicMessageRecord)) {
      return false
    }

    // Check if it's an action menu message (JSON with displayData)
    const parsed = this.parseActionMenu(record)
    if (parsed) {
      // Attach parsed data to record for later use
      // eslint-disable-next-line no-extra-semi
      ;(record as ActionMenuRecord)._parsedActionMenu = parsed
      return true
    }

    return false
  }

  getRole(record: ActionMenuRecord): Role {
    return record.role === BasicMessageRole.Sender ? Role.me : Role.them
  }

  getLabel(record: ActionMenuRecord): string {
    const parsed = record._parsedActionMenu ?? this.parseActionMenu(record)
    if (parsed) {
      // Find title in displayData
      const titleItem = parsed.displayData.find((item) => item.type === 'title')
      return titleItem?.text ?? 'Action Menu'
    }
    return 'Action Menu'
  }

  getCallbackType(): CallbackType | undefined {
    // Action menus have their own buttons, no need for callback type
    return undefined
  }

  toMessage(record: ActionMenuRecord, connection: ConnectionRecord, context: MessageContext): ExtendedChatMessage {
    const parsed = record._parsedActionMenu ?? this.parseActionMenu(record)

    // Capture current context values for the closure
    // These are captured fresh each time to ensure correct connection is used
    const currentAgent = context.agent ?? this.agent
    const currentConnectionId = connection?.id ?? this.connectionId
    const currentNavigation =
      (context.navigation as StackNavigationProp<RootStackParams | ContactStackParams>) ?? this.navigation
    const currentLogger = context.logger ?? this.logger
    const currentT = context.t ?? this.t

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
      }
    }

    // Create handler bound with current context values
    const handlePress = async (actionId: string, workflowID: string, dataOrLink?: string | any) => {
      if (!currentAgent || !currentConnectionId) {
        return
      }

      // Check if it's an invitation link (string starting with http)
      if (typeof dataOrLink === 'string' && (dataOrLink.startsWith('http://') || dataOrLink.startsWith('https://'))) {
        await this.handleConnectToInvitationWithContext(
          dataOrLink,
          currentAgent,
          currentNavigation,
          currentLogger,
          currentT
        )
      } else {
        // It's form data or no data
        const actionJSON = {
          workflowID,
          actionID: actionId,
          data: dataOrLink || {},
        }
        await currentAgent.basicMessages.sendMessage(currentConnectionId, JSON.stringify(actionJSON))
      }
    }

    // Check if this should be rendered as full-screen
    const isScreenMode = parsed.displayMode === 'screen'

    const renderEvent = () => {
      if (isScreenMode && currentNavigation) {
        // Render a compact card that navigates to WorkflowAppScreen
        const screenTitle = parsed.screenTitle || this.getLabel(record)
        const cardStyles = StyleSheet.create({
          card: {
            backgroundColor: '#F0F9F9',
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: '#00807F',
            maxWidth: 280,
          },
          title: {
            fontSize: 16,
            fontWeight: '700',
            color: '#005F5F',
            marginBottom: 4,
          },
          hint: {
            fontSize: 13,
            color: '#6B7280',
          },
        })

        return (
          <TouchableOpacity
            style={cardStyles.card}
            activeOpacity={0.7}
            onPress={() => {
              currentNavigation.navigate(Screens.WorkflowAppScreen as any, {
                content: parsed.displayData,
                workflowID: parsed.workflowID,
                connectionId: currentConnectionId,
                screenTitle,
                onActionPress: handlePress,
              })
            }}
          >
            <Text style={cardStyles.title}>{screenTitle}</Text>
            <Text style={cardStyles.hint}>Tap to open</Text>
          </TouchableOpacity>
        )
      }

      return (
        <ActionMenuBubble content={parsed.displayData} workflowID={parsed.workflowID} onActionPress={handlePress} />
      )
    }

    return {
      _id: record.id,
      text: this.getLabel(record),
      renderEvent,
      createdAt: record.createdAt,
      user: { _id: this.getRole(record) },
      messageOpensCallbackType: undefined,
      onDetails: undefined,
    }
  }

  getDetailNavigation(): NavigationResult | undefined {
    // Action menus handle their own navigation via buttons
    return undefined
  }

  shouldDisplay(record: ActionMenuRecord): boolean {
    // Only show action menus from the other party (them)
    const role = this.getRole(record)
    return role === Role.them
  }

  /**
   * Handle action button press in the action menu
   */
  async handleActionButtonPress(actionId: string, workflowID: string, invitationLink?: string): Promise<void> {
    if (!this.agent || !this.connectionId) {
      return
    }

    if (invitationLink) {
      await this.handleConnectToInvitation(invitationLink)
    } else {
      const actionJSON = {
        workflowID,
        actionID: actionId,
        data: {},
      }
      await this.agent.basicMessages.sendMessage(this.connectionId, JSON.stringify(actionJSON))
    }
  }

  /**
   * Handle connecting to an invitation from an action menu button with context values
   * This version uses passed-in context to avoid stale closure issues
   */
  private async handleConnectToInvitationWithContext(
    invitationLink: string,
    agent: Agent,
    navigation?: StackNavigationProp<RootStackParams | ContactStackParams>,
    logger?: BifoldLogger,
    t?: TFunction
  ): Promise<void> {
    const errorTitle = (t?.('Global.Error' as any) as string) ?? 'Error'

    if (!agent) {
      logger?.error('Agent is not initialized')
      Alert.alert(
        errorTitle,
        (t?.('Global.UnableToConnect' as any) as string) ?? 'Unable to connect. Please try again later.'
      )
      return
    }

    try {
      // Parse the invitation first
      const parsedInvitation = await agent.oob.parseInvitation(invitationLink)
      const invitationId = parsedInvitation.id

      // Check if we already have an existing connection via this invitation
      const existingOutOfBandRecord = await agent.oob.findByReceivedInvitationId(invitationId)
      if (existingOutOfBandRecord) {
        const existingConnections = await agent.connections.findAllByOutOfBandId(existingOutOfBandRecord.id)

        if (existingConnections && existingConnections.length > 0) {
          const existingConnection = existingConnections[0]
          logger?.info('Already connected via this invitation, navigating to existing chat')

          // Navigate to the existing connection's chat
          if (navigation) {
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: Screens.Chat as any,
                  params: { connectionId: existingConnection.id },
                },
              ],
            })
          }
          return
        }
      }

      // Use the connectFromScanOrDeepLink helper which handles all the connection logic
      // and navigates to the Connection screen to show progress
      if (navigation && logger) {
        await connectFromScanOrDeepLink(
          invitationLink,
          agent,
          logger,
          navigation,
          false, // isDeepLink
          false, // implicitInvitations
          true // reuseConnection
        )
      } else {
        // Fallback: receive invitation directly without navigation
        const receivedInvitation = await agent.oob.receiveInvitation(parsedInvitation)
        logger?.info(`Invitation received, oob record id: ${receivedInvitation.outOfBandRecord.id}`)
      }
    } catch (error) {
      logger?.error('Error processing the invitation:', error as Error)
      Alert.alert(
        errorTitle,
        (t?.('Global.ConnectionError' as any) as string) ?? 'An error occurred while connecting. Please try again.'
      )
    }
  }

  /**
   * Handle connecting to an invitation from an action menu button
   * @deprecated Use handleConnectToInvitationWithContext instead
   */
  private async handleConnectToInvitation(invitationLink: string): Promise<void> {
    return this.handleConnectToInvitationWithContext(invitationLink, this.agent!, this.navigation, this.logger, this.t)
  }

  /**
   * Parse an action menu from a BasicMessageRecord
   */
  private parseActionMenu(record: BasicMessageRecord): ActionMenuMessage | undefined {
    try {
      const parsed = JSON.parse(record.content)
      if (parsed && Array.isArray(parsed.displayData)) {
        return {
          displayData: parsed.displayData as ActionMenuContentItem[],
          workflowID: parsed.workflowID ?? '',
          displayMode: parsed.displayMode,
          screenTitle: parsed.screenTitle,
        }
      }
    } catch {
      // Not an action menu message
    }
    return undefined
  }
}

/**
 * Factory function to create an ActionMenuWorkflowHandler
 */
export function createActionMenuHandler(): ActionMenuWorkflowHandler {
  return new ActionMenuWorkflowHandler()
}
