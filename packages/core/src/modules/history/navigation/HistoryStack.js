import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TOKENS, useServices } from '../../../container-api';
import { useTheme } from '../../../contexts/theme';
import { useDefaultStackOptions } from '../../../navigators/defaultStackOptions';
import { Screens } from '../../../types/navigators';
import { testIdWithKey } from '../../../utils/testable';
const HistoryStack = () => {
    const Stack = createStackNavigator();
    const theme = useTheme();
    const { t } = useTranslation();
    const defaultStackOptions = useDefaultStackOptions(theme);
    const [HistoryPage] = useServices([TOKENS.SCREEN_HISTORY_PAGE]);
    return (<Stack.Navigator screenOptions={{ ...defaultStackOptions }}>
      <Stack.Screen name={Screens.HistoryPage} component={HistoryPage} options={{ title: t('Screens.History'), headerBackTestID: testIdWithKey('Back') }}/>
    </Stack.Navigator>);
};
export default HistoryStack;
