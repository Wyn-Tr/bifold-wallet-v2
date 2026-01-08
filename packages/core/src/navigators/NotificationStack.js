import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TOKENS, useServices } from '../container-api';
import { useTheme } from '../contexts/theme';
import { Screens } from '../types/navigators';
import { useDefaultStackOptions } from './defaultStackOptions';
const NotificationStack = () => {
    const Stack = createStackNavigator();
    const theme = useTheme();
    const { t } = useTranslation();
    const defaultStackOptions = useDefaultStackOptions(theme);
    const [{ customNotificationConfig: customNotification }, ScreenOptionsDictionary, 
    // Injectable screens
    CredentialDetails,] = useServices([
        TOKENS.NOTIFICATIONS,
        TOKENS.OBJECT_SCREEN_CONFIG,
        // Injectable screens
        TOKENS.SCREEN_CREDENTIAL_DETAILS,
    ]);
    return (<Stack.Navigator screenOptions={{ ...defaultStackOptions }}>
      <Stack.Screen name={Screens.CredentialDetails} component={CredentialDetails} options={{
            title: t('Screens.CredentialDetails'),
            ...ScreenOptionsDictionary[Screens.CredentialDetails],
        }}/>
      {customNotification && (<Stack.Screen name={Screens.CustomNotification} component={customNotification.component} options={{
                title: t(customNotification.pageTitle),
                ...ScreenOptionsDictionary[Screens.CustomNotification],
            }}/>)}
      {customNotification &&
            customNotification.additionalStackItems?.length &&
            customNotification.additionalStackItems.map((item, i) => (<Stack.Screen key={i + 1} name={item.name} component={item.component} options={item.stackOptions}></Stack.Screen>))}
    </Stack.Navigator>);
};
export default NotificationStack;
