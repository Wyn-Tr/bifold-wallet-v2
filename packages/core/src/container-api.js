import { createContext, useContext } from 'react';
export const PROOF_TOKENS = {
    GROUP_BY_REFERENT: 'proof.groupByReferant',
    CRED_HELP_ACTION_OVERRIDES: 'proof.credHelpActionOverride',
};
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
    // Contact Screens
    SCREEN_LIST_CONTACTS: 'screen.list-contacts',
    SCREEN_CONTACT_DETAILS: 'screen.contact-details',
    SCREEN_RENAME_CONTACT: 'screen.rename-contact',
    SCREEN_WHAT_ARE_CONTACTS: 'screen.what-are-contacts',
    SCREEN_WORKFLOW_DETAILS: 'screen.workflow-details',
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
};
export const NAV_TOKENS = {
    CUSTOM_NAV_STACK_1: 'nav.slot1',
};
export const HOOK_TOKENS = {
    HOOK_USE_AGENT_SETUP: 'hook.useAgentSetup',
};
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
};
export const NOTIFICATION_TOKENS = {
    NOTIFICATIONS: 'notification.list',
    NOTIFICATIONS_LIST_ITEM: 'notification.list-item',
};
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
};
export const FN_TOKENS = {
    FN_ONBOARDING_DONE: 'fn.onboardingDone',
    COMPONENT_CRED_LIST_HEADER_RIGHT: 'fn.credListHeaderRight',
    COMPONENT_CRED_LIST_OPTIONS: 'fn.credListOptions',
    COMPONENT_CRED_LIST_FOOTER: 'fn.credListFooter',
};
export const HISTORY_TOKENS = {
    FN_LOAD_HISTORY: 'fn.loadHistory',
    HISTORY_ENABLED: 'history.enabled',
    HISTORY_EVENTS_LOGGER: 'history.eventsLogger',
};
export const COMP_TOKENS = {
    COMP_BUTTON: 'comp.button',
};
export const SERVICE_TOKENS = {
    SERVICE_TERMS: 'screen.terms',
};
export const LOAD_STATE_TOKENS = {
    LOAD_STATE: 'state.load',
};
export const OBJECT_TOKENS = {
    OBJECT_SCREEN_CONFIG: 'object.screen-config',
    OBJECT_LAYOUT_CONFIG: 'object.screenlayout-config',
};
export const CACHE_TOKENS = {
    CACHE_CRED_DEFS: 'cache.cred-defs',
    CACHE_SCHEMAS: 'cache.schemas',
};
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
};
export const CONFIG_TOKENS = {
    CONFIG: 'config',
    INLINE_ERRORS: 'errors.inline',
    ONBOARDING: 'utility.onboarding',
};
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
};
export const ContainerContext = createContext(undefined);
export const ContainerProvider = ContainerContext.Provider;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const useContainer = () => useContext(ContainerContext);
export const useServices = (tokens) => {
    return useContainer().resolveAll(tokens);
};
