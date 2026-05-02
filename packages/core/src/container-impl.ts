import { KanonOCABundleResolver } from './utils/KanonOCAResolver'
import { getProofRequestTemplates } from '@bifold/verifier'
import { Agent } from '@credo-ts/core'
import { createContext, useContext } from 'react'
import { DependencyContainer } from 'tsyringe'

import * as bundle from './assets/oca-bundles.json'
import Button from './components/buttons/Button'
import ContactCredentialListItem from './components/listItems/ContactCredentialListItem'
import ContactListItem from './components/listItems/ContactListItem'
import NotificationListItem from './components/listItems/NotificationListItem'
import ConnectionAlert from './components/misc/ConnectionAlert'
import EmptyList from './components/misc/EmptyList'
import NoNewUpdates from './components/misc/NoNewUpdates'
import PINHeader from './components/misc/PINHeader'
import Record from './components/record/Record'
import { Banner } from './components/views/Banner'
import HomeFooterView from './components/views/HomeFooterView'
import HomeHeaderView from './components/views/HomeHeaderView'
import defaultIndyLedgers from './configs/ledgers/indy'
import { LocalStorageKeys, PINRules } from './constants'
import { Container, TokenMapping, TOKENS } from './container-api'
import { DispatchAction, ReducerAction } from './contexts/reducers/store'
import { defaultState } from './contexts/store'
import { useNotifications } from './hooks/notifications'
import useBifoldAgentSetup from './hooks/useBifoldAgentSetup'
import { Locales } from './localization'
import { IHistoryManager } from './modules/history'
import HistoryManager from './modules/history/context/historyManager'
import { RefreshOrchestrator } from './modules/openid/refresh/refreshOrchestrator'
import { IRefreshOrchestrator } from './modules/openid/refresh/types'
import {
  createActionMenuHandler,
  createBasicMessageHandler,
  createChatScreenConfig,
  createCredentialHandler,
  createDIDCommWorkflowHandler,
  createProofHandler,
  WorkflowRegistry,
} from './modules/workflow'
import { ThemeRegistry } from './modules/theme'
import BellIcon from './assets/img/bell-icon.svg'
import InfoIcon from './assets/img/info-icon.svg'
import Logomark from './assets/img/Logomark.svg'
import OnboardingStack from './navigators/OnboardingStack'
import { DefaultScreenLayoutOptions } from './navigators/defaultLayoutOptions'
import { DefaultScreenOptionsDictionary } from './navigators/defaultStackOptions'
import { generateOnboardingWorkflowSteps } from './onboarding'
import Biometry from './screens/Biometry'
import Developer from './screens/Developer'
import Onboarding from './screens/Onboarding'
import OnboardingPages from './screens/OnboardingPages'
import PINExplainer from './screens/PINExplainer'
import Preface from './screens/Preface'
import Scan from './screens/Scan'
import Splash from './screens/Splash'
import ScreenTerms, { TermsVersion } from './screens/Terms'
import ToggleBiometry from './screens/ToggleBiometry'
import UpdateAvailable from './screens/UpdateAvailable'

// New Screen Imports for Modular Injection
import PINCreate from './screens/PINCreate'
import PINEnter from './screens/PINEnter'
import NameWallet from './screens/NameWallet'
import PushNotifications from './screens/PushNotifications'
import AttemptLockout from './screens/AttemptLockout'
import Home from './screens/Home'
import Chat from './screens/Chat'
import Connection from './screens/Connection'
import CredentialDetails from './screens/CredentialDetails'
import CredentialOffer from './screens/CredentialOffer'
import ProofRequest from './screens/ProofRequest'
import Settings from './screens/Settings'
import Language from './screens/Language'
import DataRetention from './screens/DataRetention'
import PINChange from './screens/PINChange'
import PINChangeSuccess from './screens/PINChangeSuccess'
import RenameWallet from './screens/RenameWallet'
import MyProfile from './screens/MyProfile'
import Tours from './screens/Tours'
import AutoLock from './screens/AutoLock'
import ConfigureMediator from './screens/ConfigureMediator'
import TogglePushNotifications from './screens/TogglePushNotifications'
import ListContacts from './screens/ListContacts'
import ContactDetails from './screens/ContactDetails'
import RenameContact from './screens/RenameContact'
import WhatAreContacts from './screens/WhatAreContacts'
import WorkflowDetails from './screens/WorkflowDetails'
import WorkflowTemplatePicker from './screens/WorkflowTemplatePicker'
import WorkflowAppScreen from './screens/WorkflowAppScreen'
import ListCredentials from './screens/ListCredentials'
import JSONDetails from './screens/JSONDetails'
import ListProofRequests from './screens/ListProofRequests'
import ProofRequestDetails from './screens/ProofRequestDetails'
import ProofDetails from './screens/ProofDetails'
import ProofChangeCredential from './screens/ProofChangeCredential'
import ProofRequesting from './screens/ProofRequesting'
import ProofRequestUsageHistory from './screens/ProofRequestUsageHistory'
import MobileVerifierLoading from './screens/MobileVerifierLoading'
import PasteUrl from './screens/PasteUrl'
import ScanHelp from './screens/ScanHelp'

// OpenID Screens
import OpenIDCredentialDetails from './modules/openid/screens/OpenIDCredentialDetails'
import OpenIDCredentialOffer from './modules/openid/screens/OpenIDCredentialOffer'
import OpenIDProofPresentation from './modules/openid/screens/OpenIDProofPresentation'
import OpenIDProofCredentialSelect from './modules/openid/screens/OpenIDProofChangeCredential'

// History Settings
import HistorySettings from './modules/history/ui/HistorySettings'
import HistoryPage from './modules/history/ui/HistoryPage'

// Stack Navigators
import TabStack from './navigators/TabStack'
import HomeStack from './navigators/HomeStack'
import SettingStack from './navigators/SettingStack'
import ContactStack from './navigators/ContactStack'
import CredentialStack from './navigators/CredentialStack'
import ConnectStack from './navigators/ConnectStack'
import DeliveryStack from './navigators/DeliveryStack'
import ProofRequestStack from './navigators/ProofRequestStack'
import NotificationStack from './navigators/NotificationStack'
import HistoryStack from './modules/history/navigation/HistoryStack'
import { AgentBridge } from './services/AgentBridge'
import { bifoldLoggerInstance } from './services/bifoldLogger'
import { loadLoginAttempt } from './services/keychain'
import { BifoldLogger } from './services/logger'
import { PersistentStorage } from './services/storage'
import { Config, HistoryEventsLoggerConfig } from './types/config'
import { InlineErrorPosition } from './types/error'
import {
  Migration as MigrationState,
  Onboarding as StoreOnboardingState,
  PersistentState,
  Preferences as PreferencesState,
  State,
  Tours as ToursState,
} from './types/state'

export const defaultConfig: Config = {
  PINSecurity: {
    rules: PINRules,
    displayHelper: false,
  },
  settings: [],
  enableChat: true,
  enableTours: false,
  enableImplicitInvitations: true,
  enableReuseConnections: true,
  preventScreenCapture: false,
  supportedLanguages: [Locales.en, Locales.fr, Locales.ptBr, Locales.sp],
  showPreface: false,
  disableOnboardingSkip: false,
  disableContactsInSettings: false,
  internetReachabilityUrls: ['https://clients3.google.com/generate_204'],
  whereToUseWalletUrl: 'https://example.com',
  showScanHelp: true,
  showScanButton: true,
  showDetailsInfo: true,
  contactDetailsOptions: {
    showConnectedTime: true,
    enableEditContactName: true,
    enableCredentialList: false,
  },
  appUpdateConfig: {
    appleAppStoreUrl: 'https://example.com',
    googlePlayStoreUrl: 'https://example.com',
  },
  PINScreensConfig: {
    useNewPINDesign: false,
  },
  showGenericErrors: false,
  enableFullScreenErrorModal: false,
}

export const defaultHistoryEventsLogger: HistoryEventsLoggerConfig = {
  logAttestationAccepted: true,
  logAttestationRefused: true,
  logAttestationRemoved: true,
  logInformationSent: true,
  logInformationNotSent: true,
  logConnection: true,
  logConnectionRemoved: true,
  logAttestationRevoked: true,
  logPinChanged: true,
  logToggleBiometry: true,
}

export class MainContainer implements Container {
  public static readonly TOKENS = TOKENS
  private _container: DependencyContainer
  private log?: BifoldLogger
  private storage: PersistentStorage<PersistentState>

  public constructor(container: DependencyContainer, log?: BifoldLogger) {
    this._container = container
    this.log = log
    this.storage = new PersistentStorage(log)
  }

  public get container(): DependencyContainer {
    return this._container
  }

  public init(): Container {
    this.log?.info(`Initializing Bifold container`)

    this._container.registerInstance(TOKENS.SCREEN_PREFACE, Preface)
    this._container.registerInstance(TOKENS.SCREEN_DEVELOPER, Developer)
    this._container.registerInstance(TOKENS.SCREEN_TERMS, { screen: ScreenTerms, version: TermsVersion })
    this._container.registerInstance(TOKENS.SCREEN_SPLASH, Splash)
    this._container.registerInstance(TOKENS.SCREEN_UPDATE_AVAILABLE, UpdateAvailable)
    this._container.registerInstance(TOKENS.SCREEN_ONBOARDING_PAGES, OnboardingPages)
    this._container.registerInstance(TOKENS.COMPONENT_PIN_HEADER, PINHeader)
    this._container.registerInstance(TOKENS.SCREEN_BIOMETRY, Biometry)
    this._container.registerInstance(TOKENS.SCREEN_TOGGLE_BIOMETRY, ToggleBiometry)
    this._container.registerInstance(TOKENS.SCREEN_SCAN, Scan)
    this._container.registerInstance(TOKENS.SCREEN_ONBOARDING_ITEM, Onboarding)
    this._container.registerInstance(TOKENS.SCREEN_ONBOARDING, Onboarding)
    this._container.registerInstance(TOKENS.SCREEN_PIN_EXPLAINER, PINExplainer)
    this._container.registerInstance(TOKENS.HOOK_USE_AGENT_SETUP, useBifoldAgentSetup)
    this._container.registerInstance(TOKENS.STACK_ONBOARDING, OnboardingStack)

    // ============ NEW SCREEN REGISTRATIONS ============

    // Onboarding Screens
    this._container.registerInstance(TOKENS.SCREEN_PIN_CREATE, PINCreate)
    this._container.registerInstance(TOKENS.SCREEN_PIN_ENTER, PINEnter)
    this._container.registerInstance(TOKENS.SCREEN_NAME_WALLET, NameWallet)
    this._container.registerInstance(TOKENS.SCREEN_PUSH_NOTIFICATIONS, PushNotifications)
    this._container.registerInstance(TOKENS.SCREEN_ATTEMPT_LOCKOUT, AttemptLockout)

    // Main Screens
    this._container.registerInstance(TOKENS.SCREEN_HOME, Home)
    this._container.registerInstance(TOKENS.SCREEN_CHAT, Chat)
    this._container.registerInstance(TOKENS.SCREEN_CONNECTION, Connection)
    this._container.registerInstance(TOKENS.SCREEN_CREDENTIAL_DETAILS, CredentialDetails)
    this._container.registerInstance(TOKENS.SCREEN_CREDENTIAL_OFFER, CredentialOffer)
    this._container.registerInstance(TOKENS.SCREEN_PROOF_REQUEST, ProofRequest)

    // Settings Screens
    this._container.registerInstance(TOKENS.SCREEN_SETTINGS, Settings)
    this._container.registerInstance(TOKENS.SCREEN_LANGUAGE, Language)
    this._container.registerInstance(TOKENS.SCREEN_DATA_RETENTION, DataRetention)
    this._container.registerInstance(TOKENS.SCREEN_PIN_CHANGE, PINChange)
    this._container.registerInstance(TOKENS.SCREEN_PIN_CHANGE_SUCCESS, PINChangeSuccess)
    this._container.registerInstance(TOKENS.SCREEN_RENAME_WALLET, RenameWallet)
    this._container.registerInstance(TOKENS.SCREEN_TOURS, Tours)
    this._container.registerInstance(TOKENS.SCREEN_AUTO_LOCK, AutoLock)
    this._container.registerInstance(TOKENS.SCREEN_CONFIGURE_MEDIATOR, ConfigureMediator)
    this._container.registerInstance(TOKENS.SCREEN_TOGGLE_PUSH_NOTIFICATIONS, TogglePushNotifications)
    this._container.registerInstance(TOKENS.SCREEN_HISTORY_SETTINGS, HistorySettings)
    this._container.registerInstance(TOKENS.SCREEN_MY_PROFILE, MyProfile)
    this._container.registerInstance(TOKENS.SCREEN_HISTORY_PAGE, HistoryPage)

    // Contact Screens
    this._container.registerInstance(TOKENS.SCREEN_LIST_CONTACTS, ListContacts)
    this._container.registerInstance(TOKENS.SCREEN_CONTACT_DETAILS, ContactDetails)
    this._container.registerInstance(TOKENS.SCREEN_RENAME_CONTACT, RenameContact)
    this._container.registerInstance(TOKENS.SCREEN_WHAT_ARE_CONTACTS, WhatAreContacts)
    this._container.registerInstance(TOKENS.SCREEN_WORKFLOW_DETAILS, WorkflowDetails)
    this._container.registerInstance(TOKENS.SCREEN_WORKFLOW_TEMPLATE_PICKER, WorkflowTemplatePicker)
    this._container.registerInstance(TOKENS.SCREEN_WORKFLOW_APP, WorkflowAppScreen)

    // Credential Screens
    this._container.registerInstance(TOKENS.SCREEN_LIST_CREDENTIALS, ListCredentials)
    this._container.registerInstance(TOKENS.SCREEN_JSON_DETAILS, JSONDetails)
    this._container.registerInstance(TOKENS.SCREEN_OPENID_CREDENTIAL_DETAILS, OpenIDCredentialDetails)
    this._container.registerInstance(TOKENS.SCREEN_OPENID_CREDENTIAL_OFFER, OpenIDCredentialOffer)

    // Proof Screens
    this._container.registerInstance(TOKENS.SCREEN_LIST_PROOF_REQUESTS, ListProofRequests)
    this._container.registerInstance(TOKENS.SCREEN_PROOF_REQUEST_DETAILS, ProofRequestDetails)
    this._container.registerInstance(TOKENS.SCREEN_PROOF_DETAILS, ProofDetails)
    this._container.registerInstance(TOKENS.SCREEN_PROOF_CHANGE_CREDENTIAL, ProofChangeCredential)
    this._container.registerInstance(TOKENS.SCREEN_PROOF_REQUESTING, ProofRequesting)
    this._container.registerInstance(TOKENS.SCREEN_PROOF_REQUEST_USAGE_HISTORY, ProofRequestUsageHistory)
    this._container.registerInstance(TOKENS.SCREEN_MOBILE_VERIFIER_LOADING, MobileVerifierLoading)
    this._container.registerInstance(TOKENS.SCREEN_OPENID_PROOF_PRESENTATION, OpenIDProofPresentation)
    this._container.registerInstance(TOKENS.SCREEN_OPENID_PROOF_CREDENTIAL_SELECT, OpenIDProofCredentialSelect)

    // Scan/Connect Screens
    this._container.registerInstance(TOKENS.SCREEN_PASTE_URL, PasteUrl)
    this._container.registerInstance(TOKENS.SCREEN_SCAN_HELP, ScanHelp)

    // ============ STACK NAVIGATOR REGISTRATIONS ============
    this._container.registerInstance(TOKENS.STACK_TAB, TabStack)
    this._container.registerInstance(TOKENS.STACK_HOME, HomeStack)
    this._container.registerInstance(TOKENS.STACK_SETTINGS, SettingStack)
    this._container.registerInstance(TOKENS.STACK_CONTACT, ContactStack)
    this._container.registerInstance(TOKENS.STACK_CREDENTIAL, CredentialStack)
    this._container.registerInstance(TOKENS.STACK_CONNECT, ConnectStack)
    this._container.registerInstance(TOKENS.STACK_DELIVERY, DeliveryStack)
    this._container.registerInstance(TOKENS.STACK_PROOF_REQUEST, ProofRequestStack)
    this._container.registerInstance(TOKENS.STACK_NOTIFICATION, NotificationStack)
    this._container.registerInstance(TOKENS.STACK_HISTORY, HistoryStack)
    this._container.registerInstance(TOKENS.COMP_BUTTON, Button)
    this._container.registerInstance(TOKENS.GROUP_BY_REFERENT, false)
    this._container.registerInstance(TOKENS.HISTORY_ENABLED, false)
    this._container.registerInstance(TOKENS.HISTORY_EVENTS_LOGGER, defaultHistoryEventsLogger)
    this._container.registerInstance(TOKENS.CRED_HELP_ACTION_OVERRIDES, [])
    this._container.registerInstance(TOKENS.OBJECT_SCREEN_CONFIG, DefaultScreenOptionsDictionary)
    this._container.registerInstance(TOKENS.OBJECT_LAYOUT_CONFIG, DefaultScreenLayoutOptions)
    this._container.registerInstance(TOKENS.UTIL_LOGGER, bifoldLoggerInstance)
    // Use KanonOCABundleResolver which extends DefaultOCABundleResolver
    // and can fetch OCA overlays from Kanon credential definitions
    this._container.registerInstance(TOKENS.UTIL_OCA_RESOLVER, new KanonOCABundleResolver(bundle))
    this._container.registerInstance(TOKENS.UTIL_LEDGERS, defaultIndyLedgers)
    this._container.registerInstance(TOKENS.UTIL_PROOF_TEMPLATE, getProofRequestTemplates)
    this._container.registerInstance(TOKENS.UTIL_ATTESTATION_MONITOR, { useValue: undefined })
    this._container.registerInstance(TOKENS.UTIL_APP_VERSION_MONITOR, { useValue: undefined })
    this._container.registerInstance(TOKENS.NOTIFICATIONS, {
      useNotifications,
    })
    this._container.registerInstance(TOKENS.NOTIFICATIONS_LIST_ITEM, NotificationListItem)
    this._container.registerInstance(TOKENS.CONFIG, defaultConfig)
    this._container.registerInstance(TOKENS.COMPONENT_CRED_LIST_HEADER_RIGHT, () => null)
    this._container.registerInstance(TOKENS.COMPONENT_CRED_LIST_OPTIONS, () => null)
    this._container.registerInstance(TOKENS.COMPONENT_CRED_LIST_FOOTER, () => null)
    this._container.registerInstance(TOKENS.COMPONENT_ABOUT_INSTITUTION, () => null)
    this._container.registerInstance(TOKENS.COMPONENT_GRADIENT_BACKGROUND, () => null)
    this._container.registerInstance(TOKENS.COMPONENT_HOME_HEADER, HomeHeaderView)
    this._container.registerInstance(TOKENS.COMPONENT_NOTIFICATION_BANNER, Banner)
    this._container.registerInstance(TOKENS.COMPONENT_HOME_NOTIFICATIONS_EMPTY_LIST, NoNewUpdates)
    this._container.registerInstance(TOKENS.COMPONENT_HOME_FOOTER, HomeFooterView)
    this._container.registerInstance(TOKENS.COMPONENT_CRED_EMPTY_LIST, EmptyList)
    this._container.registerInstance(TOKENS.COMPONENT_RECORD, Record)
    this._container.registerInstance(TOKENS.COMPONENT_CONTACT_LIST_ITEM, ContactListItem)
    this._container.registerInstance(TOKENS.COMPONENT_CONTACT_DETAILS_CRED_LIST_ITEM, ContactCredentialListItem)
    this._container.registerInstance(TOKENS.COMPONENT_CONNECTION_ALERT, ConnectionAlert)
    this._container.registerInstance(TOKENS.CACHE_CRED_DEFS, [])
    this._container.registerInstance(TOKENS.CACHE_SCHEMAS, [])
    this._container.registerInstance(TOKENS.INLINE_ERRORS, {
      enabled: true,
      hasErrorIcon: true,
      position: InlineErrorPosition.Above,
    })
    this._container.registerInstance(TOKENS.FN_ONBOARDING_DONE, (dispatch: React.Dispatch<ReducerAction<unknown>>) => {
      return () => {
        dispatch({
          type: DispatchAction.DID_COMPLETE_TUTORIAL,
        })
      }
    })
    this._container.registerInstance(TOKENS.FN_LOAD_HISTORY, (agent: Agent<any>): IHistoryManager => {
      return new HistoryManager(agent)
    })
    this._container.registerInstance(TOKENS.CUSTOM_NAV_STACK_1, false)
    this._container.registerInstance(TOKENS.LOAD_STATE, async (dispatch: React.Dispatch<ReducerAction<unknown>>) => {
      const loadState = async <Type>(key: LocalStorageKeys, updateVal: (newVal: Type) => void) => {
        const data = await this.storage.getValueForKey(key)
        if (data) {
          updateVal(data as Type)
        }
      }

      let loginAttempt = defaultState.loginAttempt
      let preferences = defaultState.preferences
      let migration = defaultState.migration
      let tours = defaultState.tours
      let onboarding = defaultState.onboarding

      await Promise.all([
        loadLoginAttempt().then((data) => {
          if (data) {
            loginAttempt = data
          }
        }),
        loadState<PreferencesState>(LocalStorageKeys.Preferences, (val) => (preferences = val)),
        loadState<MigrationState>(LocalStorageKeys.Migration, (val) => (migration = val)),
        loadState<ToursState>(LocalStorageKeys.Tours, (val) => (tours = val)),
        loadState<StoreOnboardingState>(LocalStorageKeys.Onboarding, (val) => (onboarding = val)),
      ])

      const state = {
        loginAttempt: { ...defaultState.loginAttempt, ...loginAttempt },
        preferences: { ...defaultState.preferences, ...preferences },
        migration: { ...defaultState.migration, ...migration },
        tours: { ...defaultState.tours, ...tours },
        onboarding: { ...defaultState.onboarding, ...onboarding },
      } as State

      dispatch({ type: DispatchAction.STATE_DISPATCH, payload: [state] })
    })

    this._container.registerInstance(TOKENS.ONBOARDING, generateOnboardingWorkflowSteps)

    this._container.registerInstance(TOKENS.UTIL_AGENT_BRIDGE, new AgentBridge())

    // Register OpenID ListCredentials Refresh Orchestrator
    const orchestrator: IRefreshOrchestrator = new RefreshOrchestrator(
      this._container.resolve(TOKENS.UTIL_LOGGER),
      this._container.resolve(TOKENS.UTIL_AGENT_BRIDGE) as AgentBridge,
      {
        autoStart: false,
        intervalMs: undefined,
        listRecords: async () => {
          const agent = (this._container.resolve(TOKENS.UTIL_AGENT_BRIDGE) as AgentBridge).current
          if (!agent) return []
          const [w3c, sdjwt] = await Promise.all([
            agent.w3cCredentials.getAllCredentialRecords(),
            agent.sdJwtVc.getAll(),
          ])
          return [...w3c, ...sdjwt]
        },
      }
    )

    this._container.registerInstance(TOKENS.UTIL_REFRESH_ORCHESTRATOR, orchestrator)

    // Register Workflow Registry with default handlers
    const workflowRegistry = new WorkflowRegistry()
    workflowRegistry.register(createCredentialHandler())
    workflowRegistry.register(createProofHandler())
    workflowRegistry.register(createBasicMessageHandler())
    workflowRegistry.register(createActionMenuHandler())
    // DIDComm Workflow handler for @ajna-inc/workflow WorkflowInstanceRecords
    workflowRegistry.register(createDIDCommWorkflowHandler())

    // Configure default chat screen with bell icon, info icon, and VD-style credentials
    workflowRegistry.setChatScreenConfig(
      createChatScreenConfig({
        header: {
          LogoComponent: Logomark,
          BellIconComponent: BellIcon,
          InfoIconComponent: InfoIcon,
        },
        useVDCredentialRenderer: true,
        features: {
          showMenuButton: true,
          showInfoButton: true,
        },
      })
    )

    this._container.registerInstance(TOKENS.UTIL_WORKFLOW_REGISTRY, workflowRegistry)

    // Register Theme Registry for modular theming support
    const themeRegistry = new ThemeRegistry()
    this._container.registerInstance(TOKENS.UTIL_THEME_REGISTRY, themeRegistry)

    // Register default WebRTC ICE servers (STUN only)
    // Apps should override this with TURN servers from environment variables
    this._container.registerInstance(TOKENS.UTIL_WEBRTC_ICE_SERVERS, [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ])

    return this
  }

  public resolve<K extends keyof TokenMapping>(token: K): TokenMapping[K] {
    return this._container.resolve(token)
  }

  public resolveAll<K extends keyof TokenMapping, T extends K[]>(
    tokens: [...T]
  ): { [I in keyof T]: TokenMapping[T[I]] } {
    return tokens.map((key) => this.resolve(key)!) as { [I in keyof T]: TokenMapping[T[I]] }
  }
}

export const SystemContext = createContext<Container | undefined>(undefined)

export const SystemProvider = SystemContext.Provider

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const useSystem = () => useContext(SystemContext)!
