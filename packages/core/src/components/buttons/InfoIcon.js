import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Screens, Stacks } from '../../types/navigators';
import { testIdWithKey } from '../../utils/testable';
import IconButton, { ButtonLocation } from './IconButton';
const InfoIcon = ({ connectionId }) => {
    const navigation = useNavigation();
    const { t } = useTranslation();
    return (<IconButton buttonLocation={ButtonLocation.Right} accessibilityLabel={t('Chat.Details')} testID={testIdWithKey('Settings')} onPress={() => navigation.navigate(Stacks.ContactStack, {
            screen: Screens.ContactDetails,
            params: { connectionId: connectionId },
        })} icon="dots-vertical"/>);
};
export default InfoIcon;
