import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Alert, } from 'react-native';
import { useStore, DispatchAction, useAuth, testIdWithKey, } from '@bifold/core';
import { GradientBackground, CardModal, DigiCredButton, DigiCredToggle } from '../components';
import { DigiCredColors } from '../theme';
const Biometrics = () => {
    const { t } = useTranslation();
    const [, dispatch] = useStore();
    const { commitWalletToKeychain, isBiometricsActive } = useAuth();
    const [biometricsEnabled, setBiometricsEnabled] = useState(false); // Disabled by default
    const [isLoading, setIsLoading] = useState(false);
    const handleToggle = useCallback(async (value) => {
        if (value) {
            try {
                const available = await isBiometricsActive();
                if (!available) {
                    Alert.alert(t('Biometry.NotAvailableTitle') || 'Biometrics Not Available', t('Biometry.NotAvailableMessage') ||
                        'Biometrics are not available on this device. Please enable them in your device settings.', [{ text: t('Global.Okay') || 'OK' }]);
                    return;
                }
                setBiometricsEnabled(true);
            }
            catch (error) {
                setBiometricsEnabled(false);
            }
        }
        else {
            setBiometricsEnabled(false);
        }
    }, [isBiometricsActive, t]);
    const onContinue = useCallback(async () => {
        setIsLoading(true);
        try {
            await commitWalletToKeychain(biometricsEnabled);
            dispatch({
                type: DispatchAction.USE_BIOMETRY,
                payload: [biometricsEnabled],
            });
            // eslint-disable-next-line no-useless-catch
        }
        catch (error) {
            throw error;
        }
        finally {
            setIsLoading(false);
        }
    }, [biometricsEnabled, commitWalletToKeychain, dispatch]);
    return (<GradientBackground>
      <View style={styles.container}>
        <CardModal centered style={styles.cardModal}>
          <Text style={styles.title}>
            {t('Biometry.Title') || 'Biometrics'}
          </Text>

          <Text style={styles.bodyText}>
            {t('Biometry.Description') ||
            `The DigiCred wallet defaults to using your biometrics (face recognition or fingerprint) to unlock the application. We use a PIN as a backup if your biometrics are not working. You can use this control to turn off the biometric unlock.`}
          </Text>

          <DigiCredToggle label={t('Biometry.Enable') || 'Enable'} value={biometricsEnabled} onValueChange={handleToggle} testID={testIdWithKey('BiometryToggle')}/>

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
    bodyText: {
        fontSize: 16,
        fontFamily: 'Open Sans',
        color: DigiCredColors.text.onboardingSubtitle,
        lineHeight: 24,
        marginBottom: 20,
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
        marginTop: 10
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
export default Biometrics;
