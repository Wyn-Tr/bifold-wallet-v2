import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import IconButton, { ButtonLocation } from '../components/buttons/IconButton';
import HeaderRightHome from '../components/buttons/HeaderHome';
import { useTheme } from '../contexts/theme';
import { Screens } from '../types/navigators';
import { testIdWithKey } from '../utils/testable';
import { useDefaultStackOptions } from './defaultStackOptions';
import { TOKENS, useServices } from '../container-api';
const ProofRequestStack = () => {
    const Stack = createStackNavigator();
    const theme = useTheme();
    const { t } = useTranslation();
    const defaultStackOptions = useDefaultStackOptions(theme);
    const [ScreenOptionsDictionary, 
    // Injectable screens
    ListProofRequests, ProofRequestDetails, MobileVerifierLoading, ProofChangeCredential, ProofRequesting, ProofDetails, ProofRequestUsageHistory,] = useServices([
        TOKENS.OBJECT_SCREEN_CONFIG,
        // Injectable screens
        TOKENS.SCREEN_LIST_PROOF_REQUESTS,
        TOKENS.SCREEN_PROOF_REQUEST_DETAILS,
        TOKENS.SCREEN_MOBILE_VERIFIER_LOADING,
        TOKENS.SCREEN_PROOF_CHANGE_CREDENTIAL,
        TOKENS.SCREEN_PROOF_REQUESTING,
        TOKENS.SCREEN_PROOF_DETAILS,
        TOKENS.SCREEN_PROOF_REQUEST_USAGE_HISTORY,
    ]);
    return (<Stack.Navigator screenOptions={{ ...defaultStackOptions }}>
      <Stack.Screen name={Screens.ProofRequests} component={ListProofRequests} options={{
            title: t('Screens.ChooseProofRequest'),
            ...ScreenOptionsDictionary[Screens.ProofRequest],
        }}/>
      <Stack.Screen name={Screens.ProofRequestDetails} component={ProofRequestDetails} options={() => ({
            title: '',
            ...ScreenOptionsDictionary[Screens.ProofRequestDetails],
        })}/>
      <Stack.Screen name={Screens.MobileVerifierLoading} component={MobileVerifierLoading} options={{ ...defaultStackOptions }}/>
      <Stack.Screen name={Screens.ProofChangeCredential} component={ProofChangeCredential} options={{
            title: t('Screens.ProofChangeCredential'),
            ...ScreenOptionsDictionary[Screens.ProofChangeCredential],
        }}></Stack.Screen>
      <Stack.Screen name={Screens.ProofRequesting} component={ProofRequesting} options={({ navigation }) => ({
            title: t('ProofRequest.RequestForProof'),
            headerLeft: () => (<IconButton buttonLocation={ButtonLocation.Left} accessibilityLabel={t('Global.Back')} testID={testIdWithKey('BackButton')} onPress={() => navigation.navigate(Screens.ProofRequests, {})} icon="arrow-left"/>),
            ...ScreenOptionsDictionary[Screens.ProofRequesting],
        })}/>
      <Stack.Screen name={Screens.ProofDetails} component={ProofDetails} options={({ navigation, route }) => ({
            title: '',
            headerLeft: () => (<IconButton buttonLocation={ButtonLocation.Left} accessibilityLabel={t('Global.Back')} testID={testIdWithKey('BackButton')} onPress={() => {
                    if (route.params.isHistory) {
                        navigation.goBack();
                    }
                    else {
                        navigation.navigate(Screens.ProofRequests, {});
                    }
                }} icon="arrow-left"/>),
            headerRight: () => <HeaderRightHome />,
            ...ScreenOptionsDictionary[Screens.ProofDetails],
        })}/>
      <Stack.Screen name={Screens.ProofRequestUsageHistory} component={ProofRequestUsageHistory} options={() => ({
            title: t('Screens.ProofRequestUsageHistory'),
            headerRight: () => <HeaderRightHome />,
            ...ScreenOptionsDictionary[Screens.ProofRequestUsageHistory],
        })}/>
    </Stack.Navigator>);
};
export default ProofRequestStack;
