/**
 * Workflow Module Types
 *
 * This module provides a modular, pluggable architecture for handling different
 * workflow types in the chat interface. It allows switching between different
 * backends (Credo DIDComm, Manual workflows, OpenID, etc.) without changing the UI.
 */

import { Agent, ConnectionRecord, CredentialExchangeRecord, ProofExchangeRecord } from '@credo-ts/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { TFunction } from 'react-i18next'
import { SvgProps } from 'react-native-svg'

import { CallbackType, ExtendedChatMessage } from '../../components/chat/ChatMessage'
import { IColorPalette, ISettingsTheme } from '../../theme'
import { IChatTheme } from '../../theme.interface'
import { Role } from '../../types/chat'

/**
 * Supported workflow types
 */
export enum WorkflowType {
  Credential = 'credential',
  Proof = 'proof',
  BasicMessage = 'basic-message',
  ActionMenu = 'action-menu',
  Manual = 'manual',
  DIDComm = 'didcomm',
  OpenID = 'openid',
}

/**
 * Base interface for all workflow records
 */
export interface WorkflowRecord {
  id: string
  type: string
  connectionId?: string
  state?: string
  createdAt: Date
  updatedAt?: Date
  metadata?: Record<string, unknown>
}

/**
 * Action that can be performed in chat (shown in ActionSlider)
 */
export interface WorkflowAction {
  id: string
  text: string
  icon: React.FC
  onPress: () => void | Promise<void>
  disabled?: boolean
}

/**
 * Notification item for the notifications list
 */
export interface NotificationItem {
  id: string
  type: WorkflowType
  record: unknown
  title: string
  description?: string
  createdAt: Date
  onPress?: () => void
}

/**
 * Context provided to handlers when creating chat messages
 */
export interface MessageContext {
  t: TFunction
  theme: IChatTheme
  theirLabel: string
  colorPalette: IColorPalette
  /** Optional agent for handlers that need to send messages or interact with the wallet */
  agent?: Agent
  /** Optional navigation for handlers that need to navigate to other screens */
  navigation?: StackNavigationProp<any>
  /** Optional logger for handlers that need logging */
  logger?: any
}

/**
 * Context provided to handlers when performing actions
 */
export interface ActionContext {
  agent: Agent
  connectionId: string
  navigation: StackNavigationProp<any>
  t: TFunction
}

/**
 * Navigation result from a handler
 */
export interface NavigationResult {
  stack?: string
  screen: string
  params: Record<string, unknown>
}

/**
 * Action menu content item types (from bifold-wallet-1)
 */
export type ActionMenuContentType = // Content types

    | 'image'
    | 'title'
    | 'text'
    | 'button'
    | 'form'
    | 'video'
    | 'warning'
    | 'information'
    | 'quote'
    | 'HR'
    | 'SPACE'
    | 'dial'
    // Form field types
    | 'text-field'
    | 'text-area'
    | 'check-box'
    | 'radio-button'
    | 'drop-down'
    | 'submit-button'
    | 'date-field'
    | 'slider-field'
    | 'mcq'
    // Layout container types
    | 'row'
    | 'section'
    | 'spacer'
    | 'divider'

export interface ActionMenuContentItem {
  type: ActionMenuContentType
  text?: string
  url?: string
  label?: string
  actionID?: string
  invitationLink?: string
  // Form-specific properties
  'form-id'?: string // Form field identifier
  form?: string // Form name/group
  value?: string | boolean // Field value
  values?: string[] // Options for dropdowns
  options?: string[] // Alternative naming for options
  placeholder?: string
  required?: boolean
  default?: boolean // For radio buttons
  lines?: number // For text-area
  min?: string | number
  max?: string | number

  // Video properties
  'video-url'?: string
  'auto-play'?: boolean
  orientation?: 'landscape' | 'portrait'

  // Dial/phone properties
  number?: string
  fields?: ActionMenuFormField[]

  // Multiple-choice specific properties
  question?: string
  answers?: Array<{
    value: string
    option: string
  }>

  // Calendar properties
  start?: string
  end?: string
  location?: string
  notes?: string
  title?: string

  // Grid layout properties
  /** Column span in 12-column grid (1-12). Defaults to 12 (full width). */
  col?: number
  /** Nested children for container types ('row', 'section', 'card') */
  children?: ActionMenuContentItem[]
  /** Display mode: 'bubble' (chat bubble, default) | 'screen' (full-screen app view) */
  displayMode?: 'bubble' | 'screen'
  /** Horizontal alignment within grid cell */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /** Vertical alignment within grid cell */
  valign?: 'top' | 'center' | 'bottom'
  /** Padding within item's grid cell (dp) */
  padding?: number
  /** Background color (hex string) */
  bgColor?: string
  /** Pin item to bottom of screen (full-screen mode only) */
  sticky?: 'bottom'
  /** Screen title (used when displayMode is 'screen') */
  screenTitle?: string
  /** Gap between children in dp (for container types) */
  gap?: number
}

/**
 * Form field definition for structured forms
 */
export interface ActionMenuFormField {
  type: 'text' | 'radio' | 'date' | 'dropdown' | 'checkbox' | 'mcq' | 'slider' | 'textarea'
  name: string
  label: string
  options?: string[]
  placeholder?: string
  required?: boolean
  min?: number
  max?: number
  value?: any
}

/**
 * Action menu message structure
 */
export interface ActionMenuMessage {
  displayData: ActionMenuContentItem[]
  workflowID: string
  /** Display mode for the entire message: 'screen' renders as full-screen app view */
  displayMode?: 'bubble' | 'screen'
  /** Screen title when displayMode is 'screen' */
  screenTitle?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENDERER INTERFACES - For custom UI components in chat
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Context provided to renderers when rendering records
 */
export interface RenderContext {
  /** Translation function */
  t: TFunction
  /** Navigation prop for navigating to detail screens */
  navigation: StackNavigationProp<any>
  /** Connection label (their name) */
  theirLabel: string
  /** Settings theme with colors */
  settingsTheme: ISettingsTheme
  /** Chat theme */
  chatTheme: IChatTheme
  /** Color palette */
  colorPalette: IColorPalette
  /** Logo URL for the connection */
  logoUrl?: string
  /** Whether this is being rendered in chat (vs modal) */
  isInChat?: boolean
  /** Modal width percentage when in modal */
  modalWidthPercent?: number
}

/**
 * Generic renderer interface for rendering records in chat
 * @template T - The type of record being rendered
 */
export interface IRecordRenderer<T> {
  /**
   * Render the record as a React element
   * @param record - The record to render
   * @param context - Render context with theme, navigation, etc.
   * @returns React element to display in chat
   */
  render(record: T, context: RenderContext): React.ReactElement
}

/**
 * Credential renderer interface - for custom credential card rendering
 */
export type ICredentialRenderer = IRecordRenderer<CredentialExchangeRecord>

/**
 * Proof renderer interface - for custom proof card rendering
 */
export type IProofRenderer = IRecordRenderer<ProofExchangeRecord>

/**
 * Header icon button configuration
 */
export interface ChatHeaderIconButton {
  /** SVG icon component */
  IconComponent: React.FC<SvgProps>
  /** Press handler (can be sync or async) */
  onPress: () => void | Promise<void>
  /** Accessibility label */
  accessibilityLabel?: string
}

/**
 * Chat header props for custom header rendering
 */
export interface ChatHeaderProps {
  /** Title to display (connection name) */
  title: string
  /** Connection ID */
  connectionId?: string
  /** Navigation prop (optional - use onBack/onInfo callbacks instead if not needed) */
  navigation?: StackNavigationProp<any>
  /** Right side icon buttons */
  rightIcons?: ChatHeaderIconButton[]
  /** Function to trigger menu (send :menu message) */
  onShowMenu?: () => Promise<void>
  /** Callback when back button is pressed */
  onBack?: () => void
  /** Callback when info button is pressed */
  onInfo?: () => void
  /** Callback when video call button is pressed */
  onVideoCall?: () => void
  /** Whether to show menu button (bell icon) */
  showMenuButton?: boolean
  /** Whether to show info button */
  showInfoButton?: boolean
  /** Whether to show video call button */
  showVideoButton?: boolean
  /** Whether capability discovery is still loading */
  isLoadingCapabilities?: boolean
  /** Callback when menu button is pressed (sends :menu message to connection) */
  onMenuPress?: () => void | Promise<void>
}

/**
 * Chat header renderer interface
 */
export interface IChatHeaderRenderer {
  render(props: ChatHeaderProps): React.ReactElement
}

/**
 * Chat background renderer interface
 */
export interface IChatBackgroundRenderer {
  render(children: React.ReactNode): React.ReactElement
}

/**
 * Chat screen configuration - for customizing chat UI
 * This allows modular replacement of chat screen components
 */
export interface IChatScreenConfig {
  /** Custom header renderer (with logo, bell icon, etc.) */
  headerRenderer?: IChatHeaderRenderer
  /** Custom background renderer (gradient, etc.) */
  backgroundRenderer?: IChatBackgroundRenderer
  /** Custom credential renderer (visual cards instead of text) */
  credentialRenderer?: ICredentialRenderer
  /** Custom proof renderer (visual cards instead of text) */
  proofRenderer?: IProofRenderer
  /** Show bell icon in header to trigger menu */
  showMenuButton?: boolean
  /** Show info icon in header */
  showInfoButton?: boolean
  /** Show video call button in header */
  showVideoButton?: boolean
  /**
   * When true, renders the header inside the background renderer
   * instead of as a separate navigation header. This allows gradients
   * to flow through the entire screen including the header area.
   */
  headerInsideBackground?: boolean
}

/**
 * Core interface for workflow handlers
 *
 * Each handler is responsible for a specific type of workflow (credentials, proofs, etc.)
 * and knows how to:
 * - Detect if it can handle a given record
 * - Convert records to chat messages
 * - Handle navigation when user taps on a message
 * - Provide actions for the action slider
 */
export interface IWorkflowHandler<T = unknown> {
  /** Unique identifier for this handler type */
  readonly type: WorkflowType

  /** Human-readable name for this handler */
  readonly displayName: string

  // ═══════════════════════════════════════════════════════════════════════════
  // DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if this handler can process the given record
   * @param record - Any record from the agent
   * @returns Type guard indicating if this handler can process the record
   */
  canHandle(record: unknown): record is T

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAT MESSAGE TRANSFORMATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Convert a record to a chat message for display
   * @param record - The workflow record
   * @param connection - The connection this record belongs to
   * @param context - Message context with translation, theme, etc.
   * @returns An ExtendedChatMessage for GiftedChat
   */
  toMessage(record: T, connection: ConnectionRecord, context: MessageContext): ExtendedChatMessage

  /**
   * Get the callback type for the action button (View Offer, View Request, etc.)
   * @param record - The workflow record
   * @returns The callback type or undefined if no action button should be shown
   */
  getCallbackType(record: T): CallbackType | undefined

  /**
   * Get the role (me/them) for this record to determine message alignment
   * @param record - The workflow record
   * @returns Role indicating who initiated this workflow event
   */
  getRole(record: T): Role

  /**
   * Get the display label for this record (e.g., "Credential Offer Received")
   * @param record - The workflow record
   * @param t - Translation function
   * @returns Translated label string
   */
  getLabel(record: T, t: TFunction): string

  // ═══════════════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get navigation params when user taps the "View" button on a message
   * @param record - The workflow record
   * @param navigation - Stack navigation prop
   * @returns Navigation result with screen and params, or undefined if no navigation
   */
  getDetailNavigation(record: T, navigation: StackNavigationProp<any>): NavigationResult | undefined

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS (optional)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get available actions for this record (shown in context menus, etc.)
   * @param record - The workflow record
   * @param context - Action context with agent, navigation, etc.
   * @returns Array of workflow actions
   */
  getActions?(record: T, context: ActionContext): WorkflowAction[]

  /**
   * Handle a workflow action (e.g., button press in action menu)
   * @param record - The workflow record
   * @param actionId - ID of the action to perform
   * @param data - Optional data for the action
   */
  handleAction?(record: T, actionId: string, data?: Record<string, unknown>): Promise<void>

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS (optional)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if this record should appear in the notifications list
   * @param record - The workflow record
   * @returns True if this record is a notification
   */
  isNotification?(record: T): boolean

  /**
   * Convert record to a notification item
   * @param record - The workflow record
   * @returns Notification item for display
   */
  toNotification?(record: T): NotificationItem

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTERING (optional)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Should this record be shown in chat?
   * @param record - The workflow record
   * @returns True if the record should be displayed
   */
  shouldDisplay?(record: T): boolean

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOM RENDERING (optional)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Set a custom renderer for this handler
   * When set, the handler will use this renderer in toMessage() instead of default rendering
   * @param renderer - Custom renderer for this record type
   */
  setRenderer?(renderer: IRecordRenderer<T>): void

  /**
   * Get the current renderer (custom or default)
   * @returns The current renderer or undefined if using default
   */
  getRenderer?(): IRecordRenderer<T> | undefined

  /**
   * Check if handler has a custom renderer set
   * @returns True if a custom renderer is configured
   */
  hasCustomRenderer?(): boolean
}

/**
 * Interface for the workflow registry
 *
 * The registry manages all registered handlers and routes records to the
 * appropriate handler for processing.
 */
export interface IWorkflowRegistry {
  // ═══════════════════════════════════════════════════════════════════════════
  // REGISTRATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Register a workflow handler
   * @param handler - The handler to register
   */
  register(handler: IWorkflowHandler): void

  /**
   * Unregister a handler by type
   * @param type - The workflow type to unregister
   */
  unregister(type: WorkflowType): void

  /**
   * Get all registered handlers
   * @returns Array of registered handlers
   */
  getHandlers(): IWorkflowHandler[]

  /**
   * Get a handler by type
   * @param type - The workflow type
   * @returns The handler or undefined
   */
  getHandlerByType(type: WorkflowType): IWorkflowHandler | undefined

  // ═══════════════════════════════════════════════════════════════════════════
  // RESOLUTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Find the handler that can process a given record
   * @param record - Any record
   * @returns The matching handler or undefined
   */
  getHandler(record: unknown): IWorkflowHandler | undefined

  /**
   * Check if any handler can process this record
   * @param record - Any record
   * @returns True if a handler exists for this record
   */
  canHandle(record: unknown): boolean

  // ═══════════════════════════════════════════════════════════════════════════
  // BULK OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Transform multiple records to chat messages
   * @param records - Array of records
   * @param connection - The connection these records belong to
   * @param context - Message context
   * @returns Array of chat messages
   */
  toMessages(records: unknown[], connection: ConnectionRecord, context: MessageContext): ExtendedChatMessage[]

  /**
   * Get all notifications from all handlers
   * @param records - Array of records
   * @returns Array of notification items
   */
  getNotifications(records: unknown[]): NotificationItem[]

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAT ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get global chat actions (Send Proof Request, Share Transcript, etc.)
   * @param context - Action context
   * @returns Array of workflow actions for the action slider
   */
  getChatActions(context: ActionContext): WorkflowAction[]

  /**
   * Register a global chat action
   * @param action - The action to register
   */
  registerChatAction(action: WorkflowAction | ((context: ActionContext) => WorkflowAction | undefined)): void

  /**
   * Unregister a chat action by ID
   * @param actionId - The action ID to unregister
   */
  unregisterChatAction(actionId: string): void

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAT SCREEN CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Set chat screen configuration
   * @param config - Chat screen configuration with custom renderers
   */
  setChatScreenConfig(config: IChatScreenConfig): void

  /**
   * Get current chat screen configuration
   * @returns Current chat screen config or undefined
   */
  getChatScreenConfig(): IChatScreenConfig | undefined

  /**
   * Set custom credential renderer
   * This will be used by CredentialHandler when rendering credentials in chat
   * @param renderer - Custom credential renderer
   */
  setCredentialRenderer(renderer: ICredentialRenderer): void

  /**
   * Set custom proof renderer
   * This will be used by ProofHandler when rendering proofs in chat
   * @param renderer - Custom proof renderer
   */
  setProofRenderer(renderer: IProofRenderer): void
}
