import { Agent } from '@credo-ts/core'
import { IndyVdrPoolConfig } from '@credo-ts/indy-vdr'
import { ProofRequestTemplate } from '@bifold/verifier'
import { OCABundleResolverType } from '@bifold/oca/build/legacy'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { createContext, useContext } from 'react'
import { DependencyContainer } from 'tsyringe'

import { Button } from './components/buttons/Button-api'
import { ReducerAction } from './contexts/reducers/store'
import { IHistoryManager } from './modules/history'
import Onboarding from './screens/Onboarding'
import { SplashProps } from './screens/Splash'
import UpdateAvailable from './screens/UpdateAvailable'
import { AttestationMonitor } from './types/attestation'
import { IVersionCheckService } from './types/version-check'
import { GenericFn } from './types/fn'
import { OnboardingStackParams, ScreenLayoutConfig, ScreenOptionsType, OnboardingTask } from './types/navigators'
import { CustomNotification } from './types/notification'
import { Config, HistoryEventsLoggerConfig } from './types/config'
import { State } from './types/state'
import { NotificationReturnType, NotificationsInputProps } from './hooks/notifications'
import { NotificationListItemProps } from './components/listItems/NotificationListItem'
import { PINHeaderProps } from './components/misc/PINHeader'
import { PINExplainerProps } from './screens/PINExplainer'
import { CredentialListFooterProps } from './types/credential-list-footer'
import { ContactListItemProps } from './components/listItems/ContactListItem'
import { ContactCredentialListItemProps } from './components/listItems/ContactCredentialListItem'
import { InlineErrorConfig } from './types/error'
import { BifoldLogger } from './services/logger'
import { AgentSetupReturnType } from './hooks/useBifoldAgentSetup'
import { OnboardingStackProps } from './navigators/OnboardingStack'
import { AgentBridge } from './services/AgentBridge'
import { IRefreshOrchestrator } from './modules/openid/refresh/types'
import { IWorkflowRegistry } from './modules/workflow/types'
import { IThemeRegistry } from './modules/theme/registries/ThemeRegistry'
import { ImageSourcePropType } from 'react-native'

export type FN_ONBOARDING_DONE = (
  dispatch: React.Dispatch<ReducerAction<unknown>>,
  navigation: StackNavigationProp<OnboardingStackParams>
) => GenericFn

type LoadStateFn = (dispatch: React.Dispatch<ReducerAction<unknown>>) => Promise<void>

type GenerateOnboardingWorkflowStepsFn = (
  state: State,
  config: Config,
  termsVersion: number,
  agent: Agent | null
) => Array<OnboardingTask>

interface GradientBackgroundProps {
  children: React.ReactNode
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>
  colors?: string[]
  locations?: number[]
  start?: { x: number; y: number }
  end?: { x: number; y: number }
  buttonPurple?: boolean
}

type ProofRequestTemplateFn = (useDevTemplates: boolean) => Array<ProofRequestTemplate>

export const PROOF_TOKENS = {
  GROUP_BY_REFERENT: 'proof.groupByReferant',
  CRED_HELP_ACTION_OVERRIDES: 'proof.credHelpActionOverride',
} as const

export const SCREEN_TOKENS = {
  // Onboarding Screens
  SCREEN_PREFACE: 'screen.preface',
  SCREEN_UPDATE_AVAILABLE: 'screen.update-available',
  SCREEN_TERMS: 'screen.terms',
  SCREEN_ONBOARDING: 'screen.onboarding',
  SCREEN_DEVELOPER: 'screen.developer',
  SCREEN_ONBOARDING_ITEM: 'screen.onboarding.item',
  SCREEN_ONBOARDING_PAGES: 'screen.onboarding.pages',
  SCREEN_SPLASH: 'screen.splash',
  SCREEN_SCAN: 'screen.scan',
  SCREEN_BIOMETRY: 'screen.biometry',
  SCREEN_TOGGLE_BIOMETRY: 'screen.toggle-biometry',
  SCREEN_PIN_EXPLAINER: 'screen.pin-explainer',
  SCREEN_PIN_CREATE: 'screen.pin-create',
  SCREEN_PIN_ENTER: 'screen.pin-enter',
  SCREEN_NAME_WALLET: 'screen.name-wallet',
  SCREEN_PUSH_NOTIFICATIONS: 'screen.push-notifications',
  SCREEN_ATTEMPT_LOCKOUT: 'screen.attempt-lockout',

  // Main Screens
  SCREEN_HOME_NO_CHANNELS: 'screen.home-no-channels',
  SCREEN_HOME_NO_CHANNEL_MODAL: 'screen.home-no-channel-modal',
  SCREEN_HOME: 'screen.home',
  SCREEN_CHAT: 'screen.chat',
  SCREEN_CONNECTION: 'screen.connection',
  SCREEN_CREDENTIAL_DETAILS: 'screen.credential-details',
  SCREEN_CREDENTIAL_OFFER: 'screen.credential-offer',
  SCREEN_PROOF_REQUEST: 'screen.proof-request',

  // Settings Screens
  SCREEN_SETTINGS: 'screen.settings',
  SCREEN_LANGUAGE: 'screen.language',
  SCREEN_DATA_RETENTION: 'screen.data-retention',
  SCREEN_PIN_CHANGE: 'screen.pin-change',
  SCREEN_PIN_CHANGE_SUCCESS: 'screen.pin-change-success',
  SCREEN_RENAME_WALLET: 'screen.rename-wallet',
  SCREEN_TOURS: 'screen.tours',
  SCREEN_AUTO_LOCK: 'screen.auto-lock',
  SCREEN_CONFIGURE_MEDIATOR: 'screen.configure-mediator',
  SCREEN_TOGGLE_PUSH_NOTIFICATIONS: 'screen.toggle-push-notifications',
  SCREEN_HISTORY_SETTINGS: 'screen.history-settings',
  SCREEN_MY_PROFILE: 'screen.my-profile',

  // Contact Screens
  SCREEN_LIST_CONTACTS: 'screen.list-contacts',
  SCREEN_CONTACT_DETAILS: 'screen.contact-details',
  SCREEN_RENAME_CONTACT: 'screen.rename-contact',
  SCREEN_WHAT_ARE_CONTACTS: 'screen.what-are-contacts',
  SCREEN_WORKFLOW_DETAILS: 'screen.workflow-details',
  SCREEN_WORKFLOW_TEMPLATE_PICKER: 'screen.workflow-template-picker',

  // Credential Screens
  SCREEN_LIST_CREDENTIALS: 'screen.list-credentials',
  SCREEN_JSON_DETAILS: 'screen.json-details',
  SCREEN_OPENID_CREDENTIAL_DETAILS: 'screen.openid-credential-details',
  SCREEN_OPENID_CREDENTIAL_OFFER: 'screen.openid-credential-offer',

  // Proof Screens
  SCREEN_LIST_PROOF_REQUESTS: 'screen.list-proof-requests',
  SCREEN_PROOF_REQUEST_DETAILS: 'screen.proof-request-details',
  SCREEN_PROOF_DETAILS: 'screen.proof-details',
  SCREEN_PROOF_CHANGE_CREDENTIAL: 'screen.proof-change-credential',
  SCREEN_PROOF_REQUESTING: 'screen.proof-requesting',
  SCREEN_PROOF_REQUEST_USAGE_HISTORY: 'screen.proof-request-usage-history',
  SCREEN_MOBILE_VERIFIER_LOADING: 'screen.mobile-verifier-loading',
  SCREEN_OPENID_PROOF_PRESENTATION: 'screen.openid-proof-presentation',
  SCREEN_OPENID_PROOF_CREDENTIAL_SELECT: 'screen.openid-proof-credential-select',

  // Scan/Connect Screens
  SCREEN_PASTE_URL: 'screen.paste-url',
  SCREEN_SCAN_HELP: 'screen.scan-help',

  // History Screens
  SCREEN_HISTORY_PAGE: 'screen.history-page',

  // Wallet Backup/Restore Screens
  SCREEN_EXPORT_WALLET_INTRO: 'screen.export-wallet-intro',
  SCREEN_EXPORT_WALLET: 'screen.export-wallet',
  SCREEN_IMPORT_WALLET: 'screen.import-wallet',
  SCREEN_IMPORT_WALLET_SCAN: 'screen.import-wallet-scan',
  SCREEN_IMPORT_WALLET_RESULT: 'screen.import-wallet-result',
} as const

export const NAV_TOKENS = {
  CUSTOM_NAV_STACK_1: 'nav.slot1',
} as const

export const HOOK_TOKENS = {
  HOOK_USE_AGENT_SETUP: 'hook.useAgentSetup',
} as const

export const COMPONENT_TOKENS = {
  COMPONENT_HOME_HEADER: 'component.home.header',
  COMPONENT_NOTIFICATION_BANNER: 'component.notification.banner',
  COMPONENT_HOME_NOTIFICATIONS_EMPTY_LIST: 'component.home.notifications-empty-list',
  COMPONENT_HOME_FOOTER: 'component.home.footer',
  COMPONENT_CRED_EMPTY_LIST: 'component.cred.empty-list',
  COMPONENT_RECORD: 'component.record',
  COMPONENT_PIN_HEADER: 'component.pin-create-header',
  COMPONENT_CONTACT_LIST_ITEM: 'component.contact-list-item',
  COMPONENT_CONTACT_DETAILS_CRED_LIST_ITEM: 'component.contact-details-cred-list-item',
  COMPONENT_CONNECTION_ALERT: 'component.connection-alert',
  COMPONENT_GRADIENT_BACKGROUND: 'component.gradient-background',
  COMPONENT_ABOUT_INSTITUTION: 'component.about-institution',
  COMPONENT_CREDENTIAL_BUTTONS: 'component.credential-buttons',
  COMPONENT_SNACK_BAR_MESSAGE: 'component.snackbar-message',
  COMPONENT_CREDENTIAL_CARD: 'component.credential-card',
  COMPONENT_ZOOMABLE_VIEW: 'component.zoomable-view',
} as const

export const NOTIFICATION_TOKENS = {
  NOTIFICATIONS: 'notification.list',
  NOTIFICATIONS_LIST_ITEM: 'notification.list-item',
} as const

export const STACK_TOKENS = {
  STACK_ONBOARDING: 'stack.onboarding',
  STACK_TAB: 'stack.tab',
  STACK_HOME: 'stack.home',
  STACK_SETTINGS: 'stack.settings',
  STACK_CONTACT: 'stack.contact',
  STACK_CREDENTIAL: 'stack.credential',
  STACK_CONNECT: 'stack.connect',
  STACK_DELIVERY: 'stack.delivery',
  STACK_PROOF_REQUEST: 'stack.proof-request',
  STACK_NOTIFICATION: 'stack.notification',
  STACK_HISTORY: 'stack.history',
} as const

export const FN_TOKENS = {
  FN_ONBOARDING_DONE: 'fn.onboardingDone',
  COMPONENT_CRED_LIST_HEADER_RIGHT: 'fn.credListHeaderRight',
  COMPONENT_CRED_LIST_OPTIONS: 'fn.credListOptions',
  COMPONENT_CRED_LIST_FOOTER: 'fn.credListFooter',
} as const

export const HISTORY_TOKENS = {
  FN_LOAD_HISTORY: 'fn.loadHistory',
  HISTORY_ENABLED: 'history.enabled',
  HISTORY_EVENTS_LOGGER: 'history.eventsLogger',
} as const

export const COMP_TOKENS = {
  COMP_BUTTON: 'comp.button',
} as const

export const SERVICE_TOKENS = {
  SERVICE_TERMS: 'screen.terms',
} as const

export const LOAD_STATE_TOKENS = {
  LOAD_STATE: 'state.load',
} as const

export const OBJECT_TOKENS = {
  OBJECT_SCREEN_CONFIG: 'object.screen-config',
  OBJECT_LAYOUT_CONFIG: 'object.screenlayout-config',
} as const

export const CACHE_TOKENS = {
  CACHE_CRED_DEFS: 'cache.cred-defs',
  CACHE_SCHEMAS: 'cache.schemas',
} as const

export const UTILITY_TOKENS = {
  UTIL_LOGGER: 'utility.logger',
  UTIL_OCA_RESOLVER: 'utility.oca-resolver',
  UTIL_LEDGERS: 'utility.ledgers',
  UTIL_PROOF_TEMPLATE: 'utility.proof-template',
  UTIL_ATTESTATION_MONITOR: 'utility.attestation-monitor',
  UTIL_APP_VERSION_MONITOR: 'utility.app-version-monitor',
  UTIL_AGENT_BRIDGE: 'utility.agent-bridge',
  UTIL_REFRESH_ORCHESTRATOR: 'utility.refresh-orchestrator',
  UTIL_WORKFLOW_REGISTRY: 'utility.workflow-registry',
  UTIL_THEME_REGISTRY: 'utility.theme-registry',
  UTIL_WEBRTC_ICE_SERVERS: 'utility.webrtc-ice-servers',
} as const

export const CONFIG_TOKENS = {
  CONFIG: 'config',
  INLINE_ERRORS: 'errors.inline',
  ONBOARDING: 'utility.onboarding',
} as const

export const TOKENS = {
  ...PROOF_TOKENS,
  ...COMPONENT_TOKENS,
  ...SCREEN_TOKENS,
  ...HOOK_TOKENS,
  ...NAV_TOKENS,
  ...SERVICE_TOKENS,
  ...STACK_TOKENS,
  ...NOTIFICATION_TOKENS,
  ...FN_TOKENS,
  ...COMP_TOKENS,
  ...LOAD_STATE_TOKENS,
  ...OBJECT_TOKENS,
  ...CACHE_TOKENS,
  ...UTILITY_TOKENS,
  ...CONFIG_TOKENS,
  ...HISTORY_TOKENS,
} as const

export type FN_HISTORY_MANAGER = (agent: Agent<any>) => IHistoryManager

export type TokenMapping = {
  [TOKENS.CRED_HELP_ACTION_OVERRIDES]: {
    credDefIds: string[]
    schemaIds: string[]
    action: (navigation: any) => void
  }[]
  [TOKENS.GROUP_BY_REFERENT]: boolean
  [TOKENS.SCREEN_PREFACE]: React.FC
  [TOKENS.SCREEN_UPDATE_AVAILABLE]: typeof UpdateAvailable
  [TOKENS.STACK_ONBOARDING]: React.FC<OnboardingStackProps>
  [TOKENS.SCREEN_TERMS]: { screen: React.FC; version: boolean | string }
  [TOKENS.SCREEN_DEVELOPER]: React.FC
  [TOKENS.SCREEN_ONBOARDING_PAGES]: (onTutorialCompleted: GenericFn, OnboardingTheme: any) => Array<Element>
  [TOKENS.SCREEN_SPLASH]: React.FC<SplashProps>
  [TOKENS.SCREEN_SCAN]: React.FC
  [TOKENS.SCREEN_BIOMETRY]: React.FC
  [TOKENS.SCREEN_TOGGLE_BIOMETRY]: React.FC
  [TOKENS.SCREEN_ONBOARDING]: typeof Onboarding
  [TOKENS.SCREEN_PIN_EXPLAINER]: React.FC<PINExplainerProps>
  [TOKENS.HOOK_USE_AGENT_SETUP]: () => AgentSetupReturnType
  [TOKENS.FN_ONBOARDING_DONE]: FN_ONBOARDING_DONE
  [TOKENS.LOAD_STATE]: LoadStateFn
  [TOKENS.COMP_BUTTON]: Button
  [TOKENS.NOTIFICATIONS]: {
    useNotifications: ({ openIDUri }: NotificationsInputProps) => NotificationReturnType
    customNotificationConfig?: CustomNotification
  }
  [TOKENS.NOTIFICATIONS_LIST_ITEM]: React.FC<NotificationListItemProps>
  [TOKENS.OBJECT_SCREEN_CONFIG]: ScreenOptionsType
  [TOKENS.OBJECT_LAYOUT_CONFIG]: ScreenLayoutConfig
  [TOKENS.COMPONENT_PIN_HEADER]: React.FC<PINHeaderProps>
  [TOKENS.CACHE_CRED_DEFS]: { did: string; id: string }[]
  [TOKENS.CACHE_SCHEMAS]: { did: string; id: string }[]
  [TOKENS.UTIL_LOGGER]: BifoldLogger
  [TOKENS.UTIL_OCA_RESOLVER]: OCABundleResolverType
  [TOKENS.UTIL_LEDGERS]: IndyVdrPoolConfig[]
  [TOKENS.UTIL_PROOF_TEMPLATE]: ProofRequestTemplateFn | undefined
  [TOKENS.UTIL_ATTESTATION_MONITOR]: AttestationMonitor
  [TOKENS.UTIL_APP_VERSION_MONITOR]: IVersionCheckService
  [TOKENS.FN_LOAD_HISTORY]: FN_HISTORY_MANAGER
  [TOKENS.HISTORY_ENABLED]: boolean
  [TOKENS.HISTORY_EVENTS_LOGGER]: HistoryEventsLoggerConfig
  [TOKENS.CONFIG]: Config
  [TOKENS.ONBOARDING]: GenerateOnboardingWorkflowStepsFn
  [TOKENS.COMPONENT_CRED_LIST_HEADER_RIGHT]: React.FC
  [TOKENS.COMPONENT_CRED_LIST_OPTIONS]: React.FC
  [TOKENS.COMPONENT_CRED_LIST_FOOTER]: React.FC<CredentialListFooterProps>
  [TOKENS.COMPONENT_HOME_HEADER]: React.FC
  [TOKENS.COMPONENT_NOTIFICATION_BANNER]: React.FC
  [TOKENS.COMPONENT_HOME_NOTIFICATIONS_EMPTY_LIST]: React.FC
  [TOKENS.COMPONENT_HOME_FOOTER]: React.FC
  [TOKENS.COMPONENT_CRED_EMPTY_LIST]: React.FC
  [TOKENS.COMPONENT_RECORD]: React.FC
  [TOKENS.COMPONENT_CONTACT_LIST_ITEM]: React.FC<ContactListItemProps>
  [TOKENS.COMPONENT_CONTACT_DETAILS_CRED_LIST_ITEM]: React.FC<ContactCredentialListItemProps>
  [COMPONENT_TOKENS.COMPONENT_GRADIENT_BACKGROUND]: React.FC<GradientBackgroundProps>
  [COMPONENT_TOKENS.COMPONENT_ABOUT_INSTITUTION]: React.FC<{
    title: string
    content: string
  }>
  [COMPONENT_TOKENS.COMPONENT_CREDENTIAL_BUTTONS]: React.FC<{
    isProcessing: boolean
    onAccept: () => void
    onDecline: () => void
    isDisabled: boolean
    isShare?: boolean
    isShareDisabled?: boolean
  }>
  [COMPONENT_TOKENS.COMPONENT_SNACK_BAR_MESSAGE]: React.FC<{
    message: string
    type: any
    showIcon?: boolean
  }>
  [COMPONENT_TOKENS.COMPONENT_CREDENTIAL_CARD]: React.FC<{
    title: string
    subtitle?: string
    date?: string
    notificationText?: string
    logoSource?: ImageSourcePropType | string
    onPress?: () => void
    testID?: string
  }>
  [TOKENS.COMPONENT_ZOOMABLE_VIEW]: React.FC<{
    children: React.ReactNode
    onClose?: () => void
    isVisible?: boolean
    backgroundColor?: string
  }>
  [TOKENS.INLINE_ERRORS]: InlineErrorConfig
  [TOKENS.CUSTOM_NAV_STACK_1]: React.FC
  [TOKENS.COMPONENT_CONNECTION_ALERT]: React.FC<{ connectionLabel?: string }>
  [TOKENS.UTIL_AGENT_BRIDGE]: AgentBridge
  [TOKENS.UTIL_REFRESH_ORCHESTRATOR]: IRefreshOrchestrator
  [TOKENS.UTIL_WORKFLOW_REGISTRY]: IWorkflowRegistry
  [TOKENS.UTIL_THEME_REGISTRY]: IThemeRegistry
  [TOKENS.UTIL_WEBRTC_ICE_SERVERS]: Array<{ urls: string | string[]; username?: string; credential?: string }>

  // New Screen Tokens
  [TOKENS.SCREEN_PIN_CREATE]: React.FC<any>
  [TOKENS.SCREEN_PIN_ENTER]: React.FC<any>
  [TOKENS.SCREEN_NAME_WALLET]: React.FC
  [TOKENS.SCREEN_PUSH_NOTIFICATIONS]: React.FC
  [TOKENS.SCREEN_ATTEMPT_LOCKOUT]: React.FC
  [TOKENS.SCREEN_HOME_NO_CHANNELS]: React.FC
  [TOKENS.SCREEN_HOME_NO_CHANNEL_MODAL]: React.FC
  [TOKENS.SCREEN_HOME]: React.FC
  [TOKENS.SCREEN_CHAT]: React.FC<any>
  [TOKENS.SCREEN_CONNECTION]: React.FC<any>
  [TOKENS.SCREEN_CREDENTIAL_DETAILS]: React.FC<any>
  [TOKENS.SCREEN_CREDENTIAL_OFFER]: React.FC<any>
  [TOKENS.SCREEN_PROOF_REQUEST]: React.FC<any>
  [TOKENS.SCREEN_SETTINGS]: React.FC
  [TOKENS.SCREEN_LANGUAGE]: React.FC
  [TOKENS.SCREEN_DATA_RETENTION]: React.FC
  [TOKENS.SCREEN_PIN_CHANGE]: React.FC
  [TOKENS.SCREEN_PIN_CHANGE_SUCCESS]: React.FC
  [TOKENS.SCREEN_RENAME_WALLET]: React.FC
  [TOKENS.SCREEN_TOURS]: React.FC
  [TOKENS.SCREEN_AUTO_LOCK]: React.FC
  [TOKENS.SCREEN_CONFIGURE_MEDIATOR]: React.FC
  [TOKENS.SCREEN_TOGGLE_PUSH_NOTIFICATIONS]: React.FC
  [TOKENS.SCREEN_HISTORY_SETTINGS]: React.FC
  [TOKENS.SCREEN_MY_PROFILE]: React.FC
  [TOKENS.SCREEN_LIST_CONTACTS]: React.FC
  [TOKENS.SCREEN_CONTACT_DETAILS]: React.FC<any>
  [TOKENS.SCREEN_RENAME_CONTACT]: React.FC<any>
  [TOKENS.SCREEN_WHAT_ARE_CONTACTS]: React.FC
  [TOKENS.SCREEN_WORKFLOW_DETAILS]: React.FC<any>
  [TOKENS.SCREEN_WORKFLOW_TEMPLATE_PICKER]: React.FC<any>
  [TOKENS.SCREEN_LIST_CREDENTIALS]: React.FC
  [TOKENS.SCREEN_JSON_DETAILS]: React.FC<any>
  [TOKENS.SCREEN_OPENID_CREDENTIAL_DETAILS]: React.FC<any>
  [TOKENS.SCREEN_OPENID_CREDENTIAL_OFFER]: React.FC<any>
  [TOKENS.SCREEN_LIST_PROOF_REQUESTS]: React.FC
  [TOKENS.SCREEN_PROOF_REQUEST_DETAILS]: React.FC<any>
  [TOKENS.SCREEN_PROOF_DETAILS]: React.FC<any>
  [TOKENS.SCREEN_PROOF_CHANGE_CREDENTIAL]: React.FC<any>
  [TOKENS.SCREEN_PROOF_REQUESTING]: React.FC<any>
  [TOKENS.SCREEN_PROOF_REQUEST_USAGE_HISTORY]: React.FC<any>
  [TOKENS.SCREEN_MOBILE_VERIFIER_LOADING]: React.FC<any>
  [TOKENS.SCREEN_OPENID_PROOF_PRESENTATION]: React.FC<any>
  [TOKENS.SCREEN_OPENID_PROOF_CREDENTIAL_SELECT]: React.FC<any>
  [TOKENS.SCREEN_PASTE_URL]: React.FC
  [TOKENS.SCREEN_SCAN_HELP]: React.FC

  // History Screens
  [TOKENS.SCREEN_HISTORY_PAGE]: React.FC

  // Wallet Backup/Restore Screens
  [TOKENS.SCREEN_EXPORT_WALLET_INTRO]: React.FC
  [TOKENS.SCREEN_EXPORT_WALLET]: React.FC
  [TOKENS.SCREEN_IMPORT_WALLET]: React.FC
  [TOKENS.SCREEN_IMPORT_WALLET_SCAN]: React.FC<any>
  [TOKENS.SCREEN_IMPORT_WALLET_RESULT]: React.FC<any>

  // New Stack Tokens
  [TOKENS.STACK_TAB]: React.FC
  [TOKENS.STACK_HOME]: React.FC
  [TOKENS.STACK_SETTINGS]: React.FC
  [TOKENS.STACK_CONTACT]: React.FC
  [TOKENS.STACK_CREDENTIAL]: React.FC
  [TOKENS.STACK_CONNECT]: React.FC
  [TOKENS.STACK_DELIVERY]: React.FC
  [TOKENS.STACK_PROOF_REQUEST]: React.FC
  [TOKENS.STACK_NOTIFICATION]: React.FC
  [TOKENS.STACK_HISTORY]: React.FC
}

export interface Container {
  init(): Container
  resolve<K extends keyof TokenMapping>(token: K): TokenMapping[K]
  resolveAll<K extends keyof TokenMapping, T extends K[]>(tokens: [...T]): { [I in keyof T]: TokenMapping[T[I]] }
  get container(): DependencyContainer
}

export const ContainerContext = createContext<Container | undefined>(undefined)

export const ContainerProvider = ContainerContext.Provider

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const useContainer = () => useContext(ContainerContext)!

export const useServices = <K extends keyof TokenMapping, T extends K[]>(tokens: [...T]) => {
  return useContainer().resolveAll(tokens)
}
