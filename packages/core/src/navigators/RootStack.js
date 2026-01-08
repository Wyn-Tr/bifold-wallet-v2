import AgentProvider from '@credo-ts/react-hooks';
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DeviceEventEmitter, Linking } from 'react-native';
import { OpenIDCredentialRecordProvider } from '../modules/openid/context/OpenIDCredentialRecordProvider';
import { EventTypes } from '../constants';
import { TOKENS, useServices } from '../container-api';
import { ActivityProvider } from '../contexts/activity';
import { DispatchAction } from '../contexts/reducers/store';
import { useStore } from '../contexts/store';
import { BifoldError } from '../types/error';
import MainStack from './MainStack';
const RootStack = () => {
    const [store, dispatch] = useStore();
    const { t } = useTranslation();
    const [useAgentSetup, OnboardingStack, loadState, logger] = useServices([
        TOKENS.HOOK_USE_AGENT_SETUP,
        TOKENS.STACK_ONBOARDING,
        TOKENS.LOAD_STATE,
        TOKENS.UTIL_LOGGER,
    ]);
    const { agent, initializeAgent, shutdownAndClearAgentIfExists } = useAgentSetup();
    const [onboardingComplete, setOnboardingComplete] = useState(false);
    const [stashedDeepLink, setStashedDeepLink] = useState(null);
    const shouldRenderMainStack = useMemo(() => onboardingComplete && store.authentication.didAuthenticate, [onboardingComplete, store.authentication.didAuthenticate]);
    // Capture deep link on cold start - this runs at app launch regardless of auth state
    useEffect(() => {
        const getInitialUrl = async () => {
            try {
                const initialUrl = await Linking.getInitialURL();
                if (initialUrl) {
                    logger.info(`[RootStack] Captured cold start deep link: ${initialUrl}`);
                    setStashedDeepLink(initialUrl);
                }
            }
            catch (error) {
                logger.error(`[RootStack] Error getting initial URL: ${error}`);
            }
        };
        getInitialUrl();
    }, [logger]);
    // Listen for deep links while app is running
    useEffect(() => {
        const listener = Linking.addListener('url', ({ url }) => {
            if (url) {
                logger.info(`[RootStack] Received deep link while running: ${url}`);
                setStashedDeepLink(url);
            }
        });
        return () => listener.remove();
    }, [logger]);
    // Dispatch stashed deep link to store when authenticated
    useEffect(() => {
        if (stashedDeepLink && store.authentication.didAuthenticate && agent) {
            logger.info(`[RootStack] Dispatching stashed deep link after authentication: ${stashedDeepLink}`);
            dispatch({
                type: DispatchAction.ACTIVE_DEEP_LINK,
                payload: [stashedDeepLink],
            });
            setStashedDeepLink(null);
        }
    }, [stashedDeepLink, store.authentication.didAuthenticate, agent, dispatch, logger]);
    useEffect(() => {
        // if user gets locked out, erase agent
        if (!store.authentication.didAuthenticate) {
            shutdownAndClearAgentIfExists();
        }
    }, [store.authentication.didAuthenticate, shutdownAndClearAgentIfExists]);
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener(EventTypes.DID_COMPLETE_ONBOARDING, () => {
            setOnboardingComplete(true);
        });
        return sub.remove;
    }, []);
    useEffect(() => {
        // Load state only if it hasn't been loaded yet
        if (store.stateLoaded)
            return;
        loadState(dispatch).catch((err) => {
            const error = new BifoldError(t('Error.Title1044'), t('Error.Message1044'), err.message, 1001);
            DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error);
        });
    }, [dispatch, loadState, t, store.stateLoaded]);
    if (shouldRenderMainStack && agent) {
        return (<AgentProvider agent={agent}>
        <OpenIDCredentialRecordProvider>
          <ActivityProvider>
            <MainStack />
          </ActivityProvider>
        </OpenIDCredentialRecordProvider>
      </AgentProvider>);
    }
    return <OnboardingStack agent={agent} initializeAgent={initializeAgent}/>;
};
export default RootStack;
