import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/theme';
import { Screens } from '../types/navigators';
import { testIdWithKey } from '../utils/testable';
import { useDefaultStackOptions } from './defaultStackOptions';
import { TOKENS, useServices } from '../container-api';
const ConnectStack = () => {
    const Stack = createStackNavigator();
    const theme = useTheme();
    const defaultStackOptions = useDefaultStackOptions(theme);
    const [scan, ScreenOptionsDictionary, 
    // Injectable screens
    PasteUrl, ScanHelp, RenameWallet,] = useServices([
        TOKENS.SCREEN_SCAN,
        TOKENS.OBJECT_SCREEN_CONFIG,
        // Injectable screens
        TOKENS.SCREEN_PASTE_URL,
        TOKENS.SCREEN_SCAN_HELP,
        TOKENS.SCREEN_RENAME_WALLET,
    ]);
    const { t } = useTranslation();
    return (<Stack.Navigator screenOptions={{
            ...defaultStackOptions,
        }}>
      <Stack.Screen name={Screens.Scan} component={scan} options={{
            title: t('Screens.Scan'),
            headerBackTestID: testIdWithKey('Back'),
            ...ScreenOptionsDictionary[Screens.Scan],
        }}/>
      <Stack.Screen name={Screens.PasteUrl} component={PasteUrl} options={() => ({
            title: t('PasteUrl.PasteUrl'),
            headerBackTestID: testIdWithKey('Back'),
            ...ScreenOptionsDictionary[Screens.PasteUrl],
        })}/>
      <Stack.Screen name={Screens.ScanHelp} component={ScanHelp} options={{
            title: t('Screens.ScanHelp'),
            ...ScreenOptionsDictionary[Screens.ScanHelp],
        }}/>

      <Stack.Screen name={Screens.RenameWallet} component={RenameWallet} options={{
            title: t('Screens.NameWallet'),
            headerBackTestID: testIdWithKey('Back'),
            ...ScreenOptionsDictionary[Screens.RenameWallet],
        }}/>
    </Stack.Navigator>);
};
export default ConnectStack;
