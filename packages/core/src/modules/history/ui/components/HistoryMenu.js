import { useNavigation } from '@react-navigation/core';
import React from 'react';
import { useTranslation } from 'react-i18next';
import IconButton, { ButtonLocation } from '../../../../components/buttons/IconButton';
import { Screens, Stacks } from '../../../../types/navigators';
import { testIdWithKey } from '../../../../utils/testable';
const HistoryMenu = () => {
    const navigation = useNavigation();
    const { t } = useTranslation();
    return (<IconButton buttonLocation={ButtonLocation.Right} accessibilityLabel={t('Screens.Settings')} testID={testIdWithKey('Settings')} onPress={() => navigation.navigate(Stacks.HistoryStack, { screen: Screens.HistoryPage })} icon="history"/>);
};
export default HistoryMenu;
