import { ProofMetadata } from '@bifold/verifier';
import { useAgent, useProofByState } from '@credo-ts/react-hooks';
import { ProofState } from '@credo-ts/core';
import { CardStyleInterpolators, createStackNavigator } from '@react-navigation/stack';
import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import IconButton, { ButtonLocation } from '../components/buttons/IconButton';
import { TOKENS, useServices } from '../container-api';
import { useTheme } from '../contexts/theme';
import { Screens, Stacks, TabStacks } from '../types/navigators';
import { testIdWithKey } from '../utils/testable';
import { useStore } from '../contexts/store';
import { useTour } from '../contexts/tour/tour-context';
import { useDeepLinks } from '../hooks/deep-links';
import { useDefaultStackOptions } from './defaultStackOptions';
import VideoCall from '../screens/VideoCall';
import IncomingCall from '../screens/IncomingCall';
const MainStack = () => {
    const { t } = useTranslation();
    const theme = useTheme();
    const { currentStep } = useTour();
    const [store] = useStore();
    const { agent } = useAgent();
    const defaultStackOptions = useDefaultStackOptions(theme);
    const [CustomNavStack1, ScreenOptionsDictionary, 
    // Stacks from container
    TabStack, ConnectStack, SettingStack, ContactStack, NotificationStack, DeliveryStack, ProofRequestStack, HistoryStack, 
    // Screens from container
    Chat, CredentialDetails, OpenIDCredentialDetails, WorkflowDetails, HomeNoChannels,] = useServices([
        TOKENS.CUSTOM_NAV_STACK_1,
        TOKENS.OBJECT_SCREEN_CONFIG,
        // Stacks from container
        TOKENS.STACK_TAB,
        TOKENS.STACK_CONNECT,
        TOKENS.STACK_SETTINGS,
        TOKENS.STACK_CONTACT,
        TOKENS.STACK_NOTIFICATION,
        TOKENS.STACK_DELIVERY,
        TOKENS.STACK_PROOF_REQUEST,
        TOKENS.STACK_HISTORY,
        // Screens from container
        TOKENS.SCREEN_CHAT,
        TOKENS.SCREEN_CREDENTIAL_DETAILS,
        TOKENS.SCREEN_OPENID_CREDENTIAL_DETAILS,
        TOKENS.SCREEN_WORKFLOW_DETAILS,
        TOKENS.SCREEN_HOME_NO_CHANNELS,
    ]);
    const declinedProofs = useProofByState([ProofState.Declined, ProofState.Abandoned]);
    useDeepLinks();
    // remove connection on mobile verifier proofs if proof is rejected
    useEffect(() => {
        declinedProofs.forEach((proof) => {
            const meta = proof?.metadata?.get(ProofMetadata.customMetadata);
            if (meta?.delete_conn_after_seen) {
                agent?.connections.deleteById(proof?.connectionId ?? '').catch(() => null);
                proof?.metadata.set(ProofMetadata.customMetadata, { ...meta, delete_conn_after_seen: false });
            }
        });
    }, [declinedProofs, agent, store.preferences.useDataRetention]);
    const Stack = createStackNavigator();
    // This function is to make the fade in behavior of both iOS and
    // Android consistent for the settings menu
    const forFade = ({ current }) => ({
        cardStyle: {
            opacity: current.progress,
        },
    });
    const hideElements = useMemo(() => (currentStep === undefined ? 'auto' : 'no-hide-descendants'), [currentStep]);
    return (<View style={{ flex: 1 }} importantForAccessibility={hideElements}>
      <Stack.Navigator initialRouteName={Stacks.HomeNoChannelStack} screenOptions={{
            ...defaultStackOptions,
            headerShown: false,
        }}>
        <Stack.Screen name={Stacks.HomeNoChannelStack} component={HomeNoChannels} options={{
            headerShown: false,
        }}/>
        <Stack.Screen name={Stacks.TabStack} component={TabStack}/>
        <Stack.Screen name={Screens.CredentialDetails} component={CredentialDetails} options={{
            title: t('Screens.CredentialDetails'),
            headerShown: true,
            ...ScreenOptionsDictionary[Screens.CredentialDetails],
        }}/>
        <Stack.Screen name={Screens.OpenIDCredentialDetails} component={OpenIDCredentialDetails} options={{
            title: t('Screens.CredentialDetails'),
            ...ScreenOptionsDictionary[Screens.OpenIDCredentialDetails],
        }}/>
        <Stack.Screen name={Screens.Chat} component={Chat} options={({ navigation }) => ({
            headerShown: true,
            title: t('Screens.CredentialOffer'),
            headerLeft: () => (<IconButton buttonLocation={ButtonLocation.Left} accessibilityLabel={t('Global.Back')} testID={testIdWithKey('BackButton')} onPress={() => {
                    navigation.navigate(TabStacks.HomeStack, { screen: Screens.Home });
                }} icon="arrow-left"/>),
        })}/>
        <Stack.Screen name={Stacks.ConnectStack} component={ConnectStack}/>
        <Stack.Screen name={Stacks.SettingStack} component={SettingStack} options={{
            cardStyleInterpolator: forFade,
        }}/>
        <Stack.Screen name={Stacks.ContactStack} component={ContactStack}/>
        <Stack.Screen name={Stacks.NotificationStack} component={NotificationStack}/>
        <Stack.Screen name={Stacks.ConnectionStack} component={DeliveryStack} options={{
            gestureEnabled: false,
            cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
            presentation: 'modal',
        }}/>
        <Stack.Screen name={Stacks.ProofRequestsStack} component={ProofRequestStack}/>
        <Stack.Screen name={Stacks.HistoryStack} component={HistoryStack} options={{
            cardStyleInterpolator: forFade,
        }}/>
        {CustomNavStack1 ? <Stack.Screen name={Stacks.CustomNavStack1} component={CustomNavStack1}/> : null}
        <Stack.Screen name={Screens.VideoCall} component={VideoCall} options={{
            headerShown: false,
            gestureEnabled: false,
            cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
            presentation: 'modal',
        }}/>
        <Stack.Screen name={Screens.IncomingCall} component={IncomingCall} options={{
            headerShown: false,
            gestureEnabled: false,
            cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
            presentation: 'modal',
        }}/>
        <Stack.Screen name={Screens.WorkflowDetails} component={WorkflowDetails} options={{
            headerShown: true,
            title: t('Screens.WorkflowDetails') || 'Workflow Details',
        }}/>
      </Stack.Navigator>
    </View>);
};
export default MainStack;
