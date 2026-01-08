import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, StyleSheet, Keyboard, KeyboardAvoidingView, Platform, ScrollView, DeviceEventEmitter, } from 'react-native';
import { useAuth, useStore, DispatchAction, BifoldError, testIdWithKey, } from '@bifold/core';
import { EventTypes } from '../../../../packages/core/src/constants';
import { GradientBackground, CardModal, DigiCredButton, DigiCredInput } from '../components';
import { DigiCredColors } from '../theme';
const PINCreate = ({ setAuthenticated }) => {
    const { t } = useTranslation();
    const [, dispatch] = useStore();
    const { setPIN: setWalletPIN } = useAuth();
    const [PIN, setPIN] = useState('');
    const [PINConfirm, setPINConfirm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const confirmInputRef = useRef(null);
    const isSubmittingRef = useRef(false);
    const minPINLength = 6;
    const passcodeCreate = useCallback(async (pin) => {
        if (isSubmittingRef.current)
            return;
        isSubmittingRef.current = true;
        try {
            setIsLoading(true);
            Keyboard.dismiss();
            await setWalletPIN(pin);
            setAuthenticated(true);
            dispatch({
                type: DispatchAction.DID_CREATE_PIN,
            });
        }
        catch (err) {
            const error = new BifoldError(t('Error.Title1040'), t('Error.Message1040'), err?.message ?? err, 1040);
            DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error);
            isSubmittingRef.current = false;
        }
        finally {
            setIsLoading(false);
        }
    }, [setWalletPIN, setAuthenticated, dispatch, t]);
    const handlePINChange = useCallback((value) => {
        setPIN(value);
        setError(null);
        if (value.length === minPINLength) {
            setTimeout(() => {
                confirmInputRef.current?.focus();
            }, 100);
        }
    }, []);
    const handlePINConfirmChange = useCallback((value) => {
        setPINConfirm(value);
        setError(null);
        if (value.length === minPINLength && PIN.length === minPINLength) {
            if (value === PIN) {
                passcodeCreate(PIN);
            }
            else {
                setError(t('PINCreate.PINsDoNotMatch'));
            }
        }
    }, [PIN, passcodeCreate, t]);
    const handleContinue = useCallback(async () => {
        Keyboard.dismiss();
        setError(null);
        if (PIN.length < minPINLength) {
            setError(t('PINCreate.PINTooShort'));
            return;
        }
        if (PIN !== PINConfirm) {
            setError(t('PINCreate.PINsDoNotMatch'));
            return;
        }
        await passcodeCreate(PIN);
    }, [PIN, PINConfirm, passcodeCreate, t]);
    return (<GradientBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <CardModal centered style={styles.cardModal}>
            <Text style={styles.title}>
              {t('PINCreate.CardTitle')}
            </Text>
            <Text style={styles.subtitle}>
              {t('PINCreate.CardSubtitle')}
            </Text>

            <DigiCredInput placeholder={t('PINCreate.EnterPINPlaceholder')} value={PIN} onChangeText={handlePINChange} secureTextEntry keyboardType="numeric" maxLength={6} autoFocus testID={testIdWithKey('EnterPIN')} accessibilityLabel={t('PINCreate.EnterPIN')} customStyle={styles.inputCustomStyle}/>

            <DigiCredInput ref={confirmInputRef} placeholder={t('PINCreate.ReenterPINPlaceholder')} value={PINConfirm} onChangeText={handlePINConfirmChange} secureTextEntry keyboardType="numeric" maxLength={6} testID={testIdWithKey('ReenterPIN')} accessibilityLabel={t('PINCreate.ReenterPIN')} customStyle={styles.inputCustomStyle}/>

            {error && (<Text style={styles.errorText}>{error}</Text>)}

            <DigiCredButton title={'CONTINUE'} onPress={handleContinue} loading={isLoading} testID={testIdWithKey('Continue')} accessibilityLabel={t('Global.Continue')} variant="primary" customStyle={styles.buttonCustomStyle} customTextStyle={styles.buttonTextCustomStyle}/>
          </CardModal>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    cardModal: {
        backgroundColor: DigiCredColors.homeNoChannels.itemBackground,
        justifyContent: 'center',
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
        fontSize: 18,
        fontWeight: '400',
        color: DigiCredColors.toggle.thumb,
        marginBottom: 12,
        lineHeight: 24,
        fontFamily: 'Open Sans',
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Open Sans',
        color: DigiCredColors.text.onboardingSubtitle,
        lineHeight: 24,
        marginBottom: 15,
    },
    errorText: {
        color: DigiCredColors.text.error,
        fontSize: 14,
        marginBottom: 16,
        textAlign: 'center',
    },
    inputCustomStyle: {
        width: '93%',
        height: 45,
        borderRadius: 25,
        borderWidth: 1.5,
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
        marginVertical: 10,
        fontSize: 16,
        borderColor: DigiCredColors.toggle.thumb,
        alignSelf: 'center',
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
        marginTop: 20,
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
export default PINCreate;
