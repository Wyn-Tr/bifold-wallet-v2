import { Screens } from './types/navigators';
export const isPrefaceComplete = (didSeePreface, showPreface) => {
    return { name: Screens.Preface, completed: (didSeePreface && showPreface) || !showPreface };
};
export const isUpdateCheckComplete = () => {
    return { name: Screens.UpdateAvailable, completed: true };
};
export const isOnboardingTutorialComplete = (didCompleteTutorial) => {
    return { name: Screens.Onboarding, completed: didCompleteTutorial };
};
export const isTermsComplete = (didAgreeToTerms, termsVersion) => {
    return { name: Screens.Terms, completed: didAgreeToTerms === termsVersion };
};
export const isPINCreationComplete = (didCreatePIN) => {
    return { name: Screens.CreatePIN, completed: didCreatePIN };
};
export const isBiometryComplete = (didConsiderBiometry) => {
    return { name: Screens.Biometry, completed: didConsiderBiometry };
};
export const isPushNotificationComplete = (didConsiderPushNotifications, enablePushNotifications) => {
    return {
        name: Screens.PushNotifications,
        completed: !enablePushNotifications || (didConsiderPushNotifications && enablePushNotifications),
    };
};
export const isNameWalletComplete = (didNameWallet, enableWalletNaming) => {
    return { name: Screens.NameWallet, completed: didNameWallet || !enableWalletNaming };
};
export const isAuthenticationComplete = (didCreatePIN, didAuthenticate) => {
    return { name: Screens.EnterPIN, completed: didAuthenticate || !didCreatePIN };
};
export const isAttemptLockoutComplete = (servedPenalty) => {
    return { name: Screens.AttemptLockout, completed: servedPenalty !== false };
};
export const isAgentInitializationComplete = (agent) => {
    return { name: Screens.Splash, completed: !!agent };
};
export const generateOnboardingWorkflowSteps = (state, config, termsVersion, agent) => {
    const { didSeePreface, didCompleteTutorial, didAgreeToTerms, didCreatePIN, didConsiderBiometry, didConsiderPushNotifications, didNameWallet, } = state.onboarding;
    const { servedPenalty } = state.loginAttempt;
    const { didAuthenticate } = state.authentication;
    const { enableWalletNaming } = state.preferences;
    const { showPreface, enablePushNotifications } = config;
    return [
        isPrefaceComplete(didSeePreface, showPreface ?? false),
        isUpdateCheckComplete(),
        isOnboardingTutorialComplete(didCompleteTutorial),
        isTermsComplete(Number(didAgreeToTerms), termsVersion),
        isBiometryComplete(didConsiderBiometry),
        isPushNotificationComplete(didConsiderPushNotifications, enablePushNotifications),
        isPINCreationComplete(didCreatePIN),
        isNameWalletComplete(didNameWallet, enableWalletNaming),
        isAttemptLockoutComplete(servedPenalty),
        isAuthenticationComplete(didCreatePIN, didAuthenticate),
        isAgentInitializationComplete(agent),
    ];
};
