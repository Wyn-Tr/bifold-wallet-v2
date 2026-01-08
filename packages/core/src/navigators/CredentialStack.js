import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import SettingsMenu from '../components/buttons/SettingsMenu';
import { useTheme } from '../contexts/theme';
import { Screens } from '../types/navigators';
import { useDefaultStackOptions } from './defaultStackOptions';
import { TOKENS, useServices } from '../container-api';
const CredentialStack = () => {
    const Stack = createStackNavigator();
    const theme = useTheme();
    const { t } = useTranslation();
    const [CredentialListHeaderRight, ScreenOptionsDictionary, 
    // Injectable screens
    ListCredentials, JSONDetails,] = useServices([
        TOKENS.COMPONENT_CRED_LIST_HEADER_RIGHT,
        TOKENS.OBJECT_SCREEN_CONFIG,
        // Injectable screens
        TOKENS.SCREEN_LIST_CREDENTIALS,
        TOKENS.SCREEN_JSON_DETAILS,
    ]);
    const defaultStackOptions = useDefaultStackOptions(theme);
    return (<Stack.Navigator screenOptions={{ ...defaultStackOptions }}>
      <Stack.Screen name={Screens.Credentials} component={ListCredentials} options={() => ({
            title: t('Screens.Credentials'),
            headerRight: () => <CredentialListHeaderRight />,
            headerLeft: () => <SettingsMenu />,
            ...ScreenOptionsDictionary[Screens.Credentials],
        })}/>
      <Stack.Screen name={Screens.JSONDetails} component={JSONDetails} options={() => ({
            title: t('Screens.JSONDetails'),
            ...ScreenOptionsDictionary[Screens.JSONDetails],
        })}/>
    </Stack.Navigator>);
};
export default CredentialStack;
