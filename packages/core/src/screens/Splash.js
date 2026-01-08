import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DeviceEventEmitter, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EventTypes } from '../constants';
import { TOKENS, useServices } from '../container-api';
import { useAnimatedComponents } from '../contexts/animated-components';
import { BifoldError } from '../types/error';
import { useAuth } from '../contexts/auth';
import { useStore } from '../contexts/store';
/**
 * This Splash screen is shown in two scenarios: initial load of the app,
 * and during agent initialization after login
 */
const Splash = ({ initializeAgent }) => {
    const { walletSecret } = useAuth();
    const { t } = useTranslation();
    const [store] = useStore();
    const { LoadingIndicator } = useAnimatedComponents();
    const initializing = useRef(false);
    const [logger, ocaBundleResolver, GradientBackground] = useServices([
        TOKENS.UTIL_LOGGER,
        TOKENS.UTIL_OCA_RESOLVER,
        TOKENS.COMPONENT_GRADIENT_BACKGROUND,
    ]);
    const styles = StyleSheet.create({
        container: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
    });
    useEffect(() => {
        if (initializing.current || !store.authentication.didAuthenticate) {
            return;
        }
        if (!walletSecret) {
            throw new Error('Wallet secret is missing');
        }
        initializing.current = true;
        const initAgentAsyncEffect = async () => {
            try {
                await ocaBundleResolver.checkForUpdates?.();
                await initializeAgent(walletSecret);
            }
            catch (err) {
                const error = new BifoldError(t('Error.Title1045'), t('Error.Message1045'), err?.message ?? err, 1045);
                DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error);
                logger.error(err?.message ?? err);
            }
        };
        initAgentAsyncEffect();
    }, [initializeAgent, ocaBundleResolver, logger, walletSecret, t, store.authentication.didAuthenticate]);
    return (<GradientBackground>
      <SafeAreaView style={styles.container}>
        <LoadingIndicator />
      </SafeAreaView>
    </GradientBackground>);
};
export default Splash;
