import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import SettingsMenu from '../components/buttons/SettingsMenu';
import { useTheme } from '../contexts/theme';
import HistoryMenu from '../modules/history/ui/components/HistoryMenu';
import { Screens } from '../types/navigators';
import { useDefaultStackOptions } from './defaultStackOptions';
import { TOKENS, useServices } from '../container-api';
const HomeStack = () => {
    const Stack = createStackNavigator();
    const theme = useTheme();
    const { t } = useTranslation();
    const defaultStackOptions = useDefaultStackOptions(theme);
    const [ScreenOptionsDictionary, historyEnabled, 
    // Injectable screens
    Home,] = useServices([
        TOKENS.OBJECT_SCREEN_CONFIG,
        TOKENS.HISTORY_ENABLED,
        // Injectable screens
        TOKENS.SCREEN_HOME,
    ]);
    return (<Stack.Navigator screenOptions={{ ...defaultStackOptions }}>
      <Stack.Screen name={Screens.Home} component={Home} options={() => ({
            title: t('Screens.Home'),
            headerRight: () => (historyEnabled ? <HistoryMenu /> : null),
            headerLeft: () => <SettingsMenu />,
            ...ScreenOptionsDictionary[Screens.Home],
        })}/>
    </Stack.Navigator>);
};
export default HomeStack;
