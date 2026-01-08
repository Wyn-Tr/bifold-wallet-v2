import { TOKENS, defaultConfig, WorkflowRegistry, createCredentialHandler, createProofHandler, createBasicMessageHandler, createActionMenuHandler, createDIDCommWorkflowHandler, createVDCredentialRenderer, ChatHeaderRenderer, DefaultScreenOptionsDictionary, Screens, } from '@bifold/core';
import Config from 'react-native-config';
// DigiCred custom screens and components
import { DigiCredPINCreate, DigiCredPINEnter, DigiCredTerms, TermsVersion, DigiCredBiometrics, DigiCredPushNotifications, DigiCredHome, DigiCredHomeNoChannels, DigiCredTabStack, DigiCredHomeStack, DigiCredChatBackgroundRenderer, DigiCredCredentials, DigiCredSettings, DigiCredHomeNoChannelModal, GradientBackground, AboutInstitution, CredentialButtons, } from './digicred';
// Import screens directly to avoid barrel file circular dependency
import DigiCredExportWalletIntro from './digicred/screens/ExportWalletIntro';
import DigiCredExportWallet from './digicred/screens/ExportWallet';
import DigiCredImportWallet from './digicred/screens/ImportWallet';
import DigiCredImportWalletScan from './digicred/screens/ImportWalletScan';
import DigiCredImportWalletResult from './digicred/screens/ImportWalletResult';
import DigiCredContacts from './digicred/screens/Contacts';
import DigiCredScan from './digicred/screens/Scan';
// DigiCred icons for chat header
import BellIcon from './digicred/assets/bell-icon.svg';
import InfoIcon from './digicred/assets/info-icon.svg';
import VideoIcon from './digicred/assets/video-icon.svg';
const generateDigiCredOnboardingWorkflow = (state, config, termsVersion, agent) => {
    const { didSeePreface, didAgreeToTerms, didCreatePIN, didConsiderBiometry, didConsiderPushNotifications, didNameWallet, } = state.onboarding;
    const { servedPenalty } = state.loginAttempt;
    const { didAuthenticate } = state.authentication;
    const { enableWalletNaming } = state.preferences;
    const { showPreface } = config;
    // DigiCred onboarding workflow - skips the tutorial/carousel step
    // Using actual screen name values from Screens enum
    return [
        // Preface screen (disabled in config)
        { name: Screens.Preface, completed: (didSeePreface && (showPreface ?? false)) || !(showPreface ?? false) },
        // Update check
        { name: Screens.UpdateAvailable, completed: true },
        // SKIP TUTORIAL - always mark as completed
        { name: Screens.Onboarding, completed: true },
        // Terms
        { name: Screens.Terms, completed: Number(didAgreeToTerms) === termsVersion },
        // PIN creation
        { name: Screens.CreatePIN, completed: didCreatePIN },
        // Biometry
        { name: Screens.Biometry, completed: didConsiderBiometry },
        // Push notifications
        { name: Screens.PushNotifications, completed: (didConsiderPushNotifications) },
        // Name wallet
        { name: Screens.NameWallet, completed: didNameWallet || !enableWalletNaming },
        // Attempt lockout
        { name: Screens.AttemptLockout, completed: servedPenalty },
        // Authentication
        { name: Screens.EnterPIN, completed: didAuthenticate || !didCreatePIN },
        // Agent initialization
        { name: Screens.Splash, completed: !!agent },
    ];
};
export class AppContainer {
    _container;
    log;
    constructor(bifoldContainer, log) {
        this._container = bifoldContainer.container.createChildContainer();
        this.log = log;
    }
    get container() {
        return this._container;
    }
    init() {
        this.log?.info(`Initializing DigiCred App container`);
        // Override config with DigiCred-specific settings
        this._container.registerInstance(TOKENS.CONFIG, {
            ...defaultConfig,
            // Disable preface screen
            showPreface: false,
        });
        // ==========================================
        // Register DigiCred custom screens
        // ==========================================
        // Onboarding screens
        this._container.registerInstance(TOKENS.SCREEN_PIN_CREATE, DigiCredPINCreate);
        this._container.registerInstance(TOKENS.SCREEN_PIN_ENTER, DigiCredPINEnter);
        this._container.registerInstance(TOKENS.SCREEN_TERMS, {
            screen: DigiCredTerms,
            version: TermsVersion,
        });
        this._container.registerInstance(TOKENS.SCREEN_BIOMETRY, DigiCredBiometrics);
        this._container.registerInstance(TOKENS.SCREEN_PUSH_NOTIFICATIONS, DigiCredPushNotifications);
        // Skip the onboarding tutorial carousel entirely
        this._container.registerInstance(TOKENS.ONBOARDING, generateDigiCredOnboardingWorkflow);
        // Main app screens
        this._container.registerInstance(TOKENS.SCREEN_HOME_NO_CHANNELS, DigiCredHomeNoChannels);
        this._container.registerInstance(TOKENS.SCREEN_HOME_NO_CHANNEL_MODAL, DigiCredHomeNoChannelModal);
        this._container.registerInstance(TOKENS.SCREEN_HOME, DigiCredHome);
        this._container.registerInstance(TOKENS.SCREEN_LIST_CREDENTIALS, DigiCredCredentials);
        this._container.registerInstance(TOKENS.SCREEN_SETTINGS, DigiCredSettings);
        this._container.registerInstance(TOKENS.SCREEN_LIST_CONTACTS, DigiCredContacts);
        this._container.registerInstance(TOKENS.SCREEN_SCAN, DigiCredScan);
        //Component
        this._container.registerInstance(TOKENS.COMPONENT_GRADIENT_BACKGROUND, GradientBackground);
        this._container.registerInstance(TOKENS.COMPONENT_ABOUT_INSTITUTION, AboutInstitution);
        this._container.registerInstance(TOKENS.COMPONENT_CREDENTIAL_BUTTONS, CredentialButtons);
        // Wallet transfer screens
        this._container.registerInstance(TOKENS.SCREEN_EXPORT_WALLET_INTRO, DigiCredExportWalletIntro);
        this._container.registerInstance(TOKENS.SCREEN_EXPORT_WALLET, DigiCredExportWallet);
        this._container.registerInstance(TOKENS.SCREEN_IMPORT_WALLET, DigiCredImportWallet);
        this._container.registerInstance(TOKENS.SCREEN_IMPORT_WALLET_SCAN, DigiCredImportWalletScan);
        this._container.registerInstance(TOKENS.SCREEN_IMPORT_WALLET_RESULT, DigiCredImportWalletResult);
        // Custom Tab Stack with floating tab bar
        this._container.registerInstance(TOKENS.STACK_TAB, DigiCredTabStack);
        // Custom Home Stack without header
        this._container.registerInstance(TOKENS.STACK_HOME, DigiCredHomeStack);
        // Override screen options for screens with custom gradient headers
        this._container.registerInstance(TOKENS.OBJECT_SCREEN_CONFIG, {
            ...DefaultScreenOptionsDictionary,
            [Screens.Chat]: {
                headerTransparent: true,
                headerStyle: {
                    backgroundColor: 'transparent',
                    elevation: 0,
                    shadowOpacity: 0,
                },
            },
            // Hide headers for screens that render their own gradient headers
            [Screens.Credentials]: {
                headerShown: false,
            },
            [Screens.Settings]: {
                headerShown: false,
            },
            [Screens.ExportWalletIntro]: {
                headerShown: false,
            },
            [Screens.ExportWallet]: {
                headerShown: false,
            },
            [Screens.ImportWallet]: {
                headerShown: false,
            },
            [Screens.ImportWalletScan]: {
                headerShown: false,
            },
            [Screens.ImportWalletResult]: {
                headerShown: false,
            },
            [Screens.Contacts]: {
                headerShown: false,
            },
            [Screens.Scan]: {
                headerShown: false,
            },
        });
        // Configure DigiCred Workflow Registry
        const workflowRegistry = new WorkflowRegistry();
        workflowRegistry.register(createCredentialHandler());
        workflowRegistry.register(createProofHandler());
        workflowRegistry.register(createBasicMessageHandler());
        workflowRegistry.register(createActionMenuHandler());
        workflowRegistry.register(createDIDCommWorkflowHandler());
        // Configure chat screen with DigiCred gradient background and custom header
        workflowRegistry.setChatScreenConfig({
            // Custom header with transparent background for gradient visibility
            headerRenderer: new ChatHeaderRenderer({
                BellIconComponent: BellIcon,
                InfoIconComponent: InfoIcon,
                VideoIconComponent: VideoIcon,
                backgroundColor: 'transparent',
                titleColor: '#FFFFFF',
                iconColor: '#FFFFFF',
            }),
            // DigiCred gradient background
            backgroundRenderer: new DigiCredChatBackgroundRenderer(),
            // VD-style credential cards
            credentialRenderer: createVDCredentialRenderer(),
            // Feature flags
            showMenuButton: true,
            showInfoButton: true,
            showVideoButton: true,
            // Render header inside the gradient background for seamless appearance
            headerInsideBackground: true,
        });
        this._container.registerInstance(TOKENS.UTIL_WORKFLOW_REGISTRY, workflowRegistry);
        // Configure WebRTC ICE servers from environment variables
        // TURN servers require credentials - these should NOT be committed to git
        const iceServers = [
            // Free STUN servers (no credentials needed)
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
        ];
        // Add TURN server if configured in environment
        if (Config.TURN_SERVER_URL && Config.TURN_SERVER_USERNAME && Config.TURN_SERVER_PASSWORD) {
            iceServers.push({
                urls: Config.TURN_SERVER_URL,
                username: Config.TURN_SERVER_USERNAME,
                credential: Config.TURN_SERVER_PASSWORD,
            });
            // Also add TCP transport if available
            if (Config.TURN_SERVER_URL_TCP) {
                iceServers.push({
                    urls: Config.TURN_SERVER_URL_TCP,
                    username: Config.TURN_SERVER_USERNAME,
                    credential: Config.TURN_SERVER_PASSWORD,
                });
            }
        }
        this._container.registerInstance(TOKENS.UTIL_WEBRTC_ICE_SERVERS, iceServers);
        return this;
    }
    resolve(token) {
        return this._container.resolve(token);
    }
    resolveAll(tokens) {
        return tokens.map((key) => this.resolve(key));
    }
}
