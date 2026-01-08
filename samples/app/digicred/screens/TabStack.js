import { useAgent } from '@credo-ts/react-hooks';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DeviceEventEmitter, View, StyleSheet } from 'react-native';
import { useNetwork, useStore, DispatchAction, BifoldError, connectFromScanOrDeepLink, testIdWithKey, } from '@bifold/core';
import { TOKENS, useServices } from '../../../../packages/core/src/container-api';
import { TabStacks } from '../../../../packages/core/src/types/navigators';
import { EventTypes } from '../../../../packages/core/src/constants';
import { DigiCredTabBar } from '../components';
import { GradientBackground } from '../components';
const Tab = createBottomTabNavigator();
const DigiCredTabStack = () => {
    const { t } = useTranslation();
    const [notificationsConfig, config, logger, HomeStack, CredentialStack, SettingStack,] = useServices([
        TOKENS.NOTIFICATIONS,
        TOKENS.CONFIG,
        TOKENS.UTIL_LOGGER,
        TOKENS.STACK_HOME,
        TOKENS.STACK_CREDENTIAL,
        TOKENS.STACK_SETTINGS,
    ]);
    const useNotifications = notificationsConfig?.useNotifications ?? (() => []);
    const enableImplicitInvitations = config?.enableImplicitInvitations ?? false;
    const enableReuseConnections = config?.enableReuseConnections ?? false;
    const notifications = useNotifications({});
    const { assertNetworkConnected } = useNetwork();
    const [store, dispatch] = useStore();
    const { agent } = useAgent();
    const navigation = useNavigation();
    const handleDeepLink = useCallback(async (deepLink) => {
        try {
            const isNetworkConnected = await assertNetworkConnected();
            if (!isNetworkConnected) {
                return;
            }
            await connectFromScanOrDeepLink(deepLink, agent, logger, navigation, false, enableImplicitInvitations, enableReuseConnections);
        }
        catch (err) {
            const error = new BifoldError(t('Error.Title1039'), t('Error.Message1039'), err?.message ?? err, 1039);
            DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error);
        }
        dispatch({
            type: DispatchAction.DEEP_LINK_PROCESSED,
        });
    }, [agent, enableImplicitInvitations, enableReuseConnections, logger, navigation, t, dispatch, assertNetworkConnected]);
    useEffect(() => {
        if (store.deepLink && agent && store.authentication.didAuthenticate) {
            handleDeepLink(store.deepLink);
        }
    }, [store.deepLink, agent, store.authentication.didAuthenticate, handleDeepLink]);
    // Calculate badge count for home
    const homeBadgeCount = useMemo(() => notifications?.length || 0, [notifications]);
    return (<GradientBackground>
      <View style={styles.container}>
        <Tab.Navigator initialRouteName={TabStacks.HomeStack} tabBar={(props) => <DigiCredTabBar {...props} badges={{ [TabStacks.HomeStack]: homeBadgeCount }}/>} screenOptions={{
            headerShown: false,
        }}>
          <Tab.Screen name={TabStacks.HomeStack} component={HomeStack} options={{
            headerShown: false,
            tabBarAccessibilityLabel: t('TabStack.Home'),
            tabBarTestID: testIdWithKey(t('TabStack.Home')),
        }}/>
          <Tab.Screen name={TabStacks.CredentialStack} component={CredentialStack} options={{
            headerShown: false,
            tabBarAccessibilityLabel: t('TabStack.Credentials'),
            tabBarTestID: testIdWithKey(t('TabStack.Credentials')),
        }}/>
          <Tab.Screen name={TabStacks.ConnectStack} component={SettingStack} options={{
            headerShown: false,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            tabBarAccessibilityLabel: t('TabStack.Settings'),
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            tabBarTestID: testIdWithKey(t('TabStack.Settings')),
        }}/>
        </Tab.Navigator>
      </View>
    </GradientBackground>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
export default DigiCredTabStack;
