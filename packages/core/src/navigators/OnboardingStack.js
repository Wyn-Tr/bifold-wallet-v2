import { StackActions, useNavigation, useNavigationState } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DeviceEventEmitter } from 'react-native';
import { EventTypes } from '../constants';
import { TOKENS, useServices } from '../container-api';
import { DispatchAction } from '../contexts/reducers/store';
import { useStore } from '../contexts/store';
import { useTheme } from '../contexts/theme';
import { useOnboardingState } from '../hooks/useOnboardingState';
import { createCarouselStyle } from '../screens/OnboardingPages';
import { useDefaultStackOptions } from './defaultStackOptions';
import { getOnboardingScreens } from './OnboardingScreens';
const OnboardingStack = ({ initializeAgent, agent }) => {
    const [store, dispatch] = useStore();
    const { t } = useTranslation();
    const Stack = createStackNavigator();
    const theme = useTheme();
    const OnboardingTheme = theme.OnboardingTheme;
    const carousel = createCarouselStyle(OnboardingTheme);
    const [config, Splash, pages, Biometry, Onboarding, { screen: Terms, version: termsVersion }, onTutorialCompletedCurried, ScreenOptionsDictionary, Preface, UpdateAvailable, versionMonitor, generateOnboardingWorkflowSteps, 
    // New injectable screens
    PINCreate, PINEnter, NameWallet, PushNotifications, AttemptLockout,] = useServices([
        TOKENS.CONFIG,
        TOKENS.SCREEN_SPLASH,
        TOKENS.SCREEN_ONBOARDING_PAGES,
        TOKENS.SCREEN_BIOMETRY,
        TOKENS.SCREEN_ONBOARDING,
        TOKENS.SCREEN_TERMS,
        TOKENS.FN_ONBOARDING_DONE,
        TOKENS.OBJECT_SCREEN_CONFIG,
        TOKENS.SCREEN_PREFACE,
        TOKENS.SCREEN_UPDATE_AVAILABLE,
        TOKENS.UTIL_APP_VERSION_MONITOR,
        TOKENS.ONBOARDING,
        // New injectable screens
        TOKENS.SCREEN_PIN_CREATE,
        TOKENS.SCREEN_PIN_ENTER,
        TOKENS.SCREEN_NAME_WALLET,
        TOKENS.SCREEN_PUSH_NOTIFICATIONS,
        TOKENS.SCREEN_ATTEMPT_LOCKOUT,
    ]);
    const defaultStackOptions = useDefaultStackOptions(theme);
    const navigation = useNavigation();
    const onTutorialCompleted = onTutorialCompletedCurried(dispatch, navigation);
    const currentRoute = useNavigationState((state) => state?.routes[state?.index]);
    const { disableOnboardingSkip } = config;
    const { onboardingState, activeScreen } = useOnboardingState(store, config, Number(termsVersion), agent, generateOnboardingWorkflowSteps);
    useEffect(() => {
        versionMonitor?.checkForUpdate?.().then((versionInfo) => {
            dispatch({
                type: DispatchAction.SET_VERSION_INFO,
                payload: [versionInfo],
            });
        });
    }, [versionMonitor, dispatch]);
    const onAuthenticated = useCallback((status) => {
        if (!status) {
            return;
        }
        dispatch({
            type: DispatchAction.DID_AUTHENTICATE,
        });
    }, [dispatch]);
    const SplashScreen = useCallback(() => {
        return <Splash initializeAgent={initializeAgent}/>;
    }, [Splash, initializeAgent]);
    const UpdateAvailableScreen = useCallback(() => {
        return (<UpdateAvailable appleAppStoreUrl={config.appUpdateConfig?.appleAppStoreUrl} googlePlayStoreUrl={config.appUpdateConfig?.googlePlayStoreUrl}/>);
    }, [UpdateAvailable, config.appUpdateConfig]);
    const OnboardingScreen = useCallback(() => {
        return (<Onboarding nextButtonText={t('Global.Next')} previousButtonText={t('Global.Back')} disableSkip={disableOnboardingSkip} pages={pages(onTutorialCompleted, OnboardingTheme)} style={carousel}/>);
    }, [Onboarding, OnboardingTheme, carousel, disableOnboardingSkip, onTutorialCompleted, pages, t]);
    // These need to be in the children of the stack screen otherwise they
    // will unmount/remount which resets the component state in memory and causes
    // issues
    const CreatePINScreen = useCallback((props) => {
        return <PINCreate setAuthenticated={onAuthenticated} {...props}/>;
    }, 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onAuthenticated, PINCreate]);
    const EnterPINScreen = useCallback((props) => {
        return <PINEnter setAuthenticated={onAuthenticated} {...props}/>;
    }, 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onAuthenticated, PINEnter]);
    useEffect(() => {
        // If the active screen is the same as the current route, then we don't
        // need to do anything.
        if (activeScreen && activeScreen === currentRoute?.name) {
            return;
        }
        // If the active screen is different from the current route, then we need
        // to navigate to the active screen.
        if (activeScreen) {
            navigation.dispatch(StackActions.replace(activeScreen));
            return;
        }
        // Nothing to do here, we are done with onboarding.
        DeviceEventEmitter.emit(EventTypes.DID_COMPLETE_ONBOARDING);
    }, [activeScreen, currentRoute, onboardingState, navigation]);
    const screens = useMemo(() => getOnboardingScreens(t, ScreenOptionsDictionary, {
        SplashScreen,
        Preface,
        UpdateAvailableScreen,
        Terms,
        NameWallet,
        Biometry,
        PushNotifications,
        AttemptLockout,
        OnboardingScreen,
        CreatePINScreen,
        EnterPINScreen,
    }), 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
        SplashScreen,
        CreatePINScreen,
        EnterPINScreen,
        OnboardingScreen,
        Preface,
        Terms,
        Biometry,
        NameWallet,
        PushNotifications,
        AttemptLockout,
        t,
        ScreenOptionsDictionary,
        UpdateAvailableScreen,
    ]);
    return (<Stack.Navigator initialRouteName={activeScreen} screenOptions={{
            ...defaultStackOptions,
        }}>
      {screens.map((item) => {
            return <Stack.Screen key={item.name} {...item}/>;
        })}
    </Stack.Navigator>);
};
export default OnboardingStack;
