import { CardStyleInterpolators, createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import HeaderRightHome from '../components/buttons/HeaderHome';
import IconButton, { ButtonLocation } from '../components/buttons/IconButton';
import { useTheme } from '../contexts/theme';
import { Screens } from '../types/navigators';
import { testIdWithKey } from '../utils/testable';
import { useDefaultStackOptions } from './defaultStackOptions';
import { TOKENS, useServices } from '../container-api';
const DeliveryStack = () => {
    const Stack = createStackNavigator();
    const { t } = useTranslation();
    const theme = useTheme();
    const defaultStackOptions = useDefaultStackOptions(theme);
    const [ScreenOptionsDictionary, 
    // Injectable screens
    Connection, OpenIDCredentialOffer, OpenIDProofPresentation, OpenIDProofCredentialSelect,] = useServices([
        TOKENS.OBJECT_SCREEN_CONFIG,
        // Injectable screens
        TOKENS.SCREEN_CONNECTION,
        TOKENS.SCREEN_OPENID_CREDENTIAL_OFFER,
        TOKENS.SCREEN_OPENID_PROOF_PRESENTATION,
        TOKENS.SCREEN_OPENID_PROOF_CREDENTIAL_SELECT,
    ]);
    return (<Stack.Navigator initialRouteName={Screens.Connection} screenOptions={{
            ...defaultStackOptions,
            cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
            headerShown: true,
            presentation: 'modal',
            headerLeft: () => null,
            headerRight: () => <HeaderRightHome />,
            ...ScreenOptionsDictionary[Screens.Connection],
        }}>
      <Stack.Screen name={Screens.Connection} component={Connection} options={{ ...defaultStackOptions }}/>
      <Stack.Screen name={Screens.OpenIDCredentialOffer} component={OpenIDCredentialOffer} options={{
            title: t('Screens.CredentialOffer'),
            ...ScreenOptionsDictionary[Screens.OpenIDCredentialOffer],
        }}/>
      <Stack.Screen name={Screens.OpenIDProofPresentation} component={OpenIDProofPresentation} options={{
            title: t('Screens.ProofRequest'),
            ...ScreenOptionsDictionary[Screens.OpenIDProofPresentation],
        }}/>
      <Stack.Screen name={Screens.OpenIDProofCredentialSelect} component={OpenIDProofCredentialSelect} options={({ navigation }) => ({
            title: t('Screens.ChangeCard'),
            headerLeft: () => (<IconButton buttonLocation={ButtonLocation.Left} accessibilityLabel={t('Global.Back')} testID={testIdWithKey('BackButton')} onPress={() => navigation.goBack()} icon="arrow-left"/>),
            ...ScreenOptionsDictionary[Screens.OpenIDProofCredentialSelect],
        })}/>
    </Stack.Navigator>);
};
export default DeliveryStack;
