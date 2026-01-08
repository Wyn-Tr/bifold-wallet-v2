import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet } from 'react-native';
import { useStore, DispatchAction, testIdWithKey } from '@bifold/core';
import { GradientBackground, CardModal, DigiCredButton, DigiCredToggle } from '../components';
import { DigiCredColors } from '../theme';
const PushNotifications = () => {
    const { t } = useTranslation();
    const [store, dispatch] = useStore();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    useEffect(() => {
        if (store.onboarding?.didConsiderPushNotifications) {
            setNotificationsEnabled(!!store.preferences?.usePushNotifications);
        }
    }, [store.onboarding?.didConsiderPushNotifications, store.preferences?.usePushNotifications]);
    const handleToggle = useCallback((value) => {
        setNotificationsEnabled(value);
    }, []);
    const onContinue = useCallback(async () => {
        setIsLoading(true);
        try {
            dispatch({
                type: DispatchAction.USE_PUSH_NOTIFICATIONS,
                payload: [notificationsEnabled],
            });
        }
        finally {
            setIsLoading(false);
        }
    }, [notificationsEnabled, dispatch]);
    return (<GradientBackground>
      <View style={styles.container}>
        <CardModal centered style={styles.cardModal}>
          <Text style={styles.title}>{t('PushNotifications.Title') || 'Use Push Notifications'}</Text>

          <Text style={styles.subtitle}>{t('PushNotifications.Subtitle') || 'Be notified when you receive:'}</Text>

          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• {t('PushNotifications.BulletOne') || 'New credential offers'}</Text>
            <Text style={styles.listItem}>• {t('PushNotifications.BulletTwo') || 'New proof requests'}</Text>
            <Text style={styles.listItem}>• {t('PushNotifications.BulletThree') || 'Updates to your credentials'}</Text>
            <Text style={styles.listItem}>• {t('PushNotifications.BulletFour') || 'New messages'}</Text>
          </View>

          <DigiCredToggle label={t('PushNotifications.Enable') || 'Enable'} value={notificationsEnabled} onValueChange={handleToggle} testID={testIdWithKey('PushNotificationToggle')}/>

          <DigiCredButton title={'CONTINUE'} onPress={onContinue} loading={isLoading} testID={testIdWithKey('Continue')} accessibilityLabel={t('Global.Continue')} variant="primary" customStyle={styles.buttonCustomStyle} customTextStyle={styles.buttonTextCustomStyle}/>
        </CardModal>
      </View>
    </GradientBackground>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    cardModal: {
        backgroundColor: DigiCredColors.homeNoChannels.itemBackground,
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 0.48,
        shadowRadius: 12,
        elevation: 8,
        width: '98%',
    },
    title: {
        fontSize: 22,
        fontWeight: '400',
        color: DigiCredColors.text.primary,
        marginBottom: 10,
        lineHeight: 24,
        fontFamily: 'Open Sans',
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Open Sans',
        color: DigiCredColors.text.onboardingSubtitle,
        lineHeight: 24,
        marginBottom: 16,
    },
    listContainer: {
        marginBottom: 20,
    },
    listItem: {
        fontSize: 16,
        fontFamily: 'Open Sans',
        color: DigiCredColors.text.onboardingSubtitle,
        lineHeight: 24,
        marginBottom: 4,
    },
    buttonCustomStyle: {
        display: 'flex',
        paddingVertical: 12,
        paddingHorizontal: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 25,
        backgroundColor: DigiCredColors.button.continueButton,
        minWidth: 154,
        height: 48,
        opacity: 1,
        alignSelf: 'flex-start',
        marginTop: 10,
    },
    buttonTextCustomStyle: {
        fontFamily: 'Open Sans',
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 24,
        color: DigiCredColors.text.primary,
        textTransform: 'none',
        letterSpacing: 0,
    },
});
export default PushNotifications;
