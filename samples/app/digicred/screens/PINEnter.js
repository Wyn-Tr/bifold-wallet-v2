import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Modal, DeviceEventEmitter, Keyboard, Dimensions, } from 'react-native';
import { useAuth, useStore, DispatchAction, testIdWithKey } from '@bifold/core';
import { EventTypes } from '../../../../packages/core/src/constants';
import { GradientBackground, DigiCredButton, CardModal, DigiCredInput } from '../components';
import { DigiCredColors } from '../theme';
import { isTablet } from '../utils/devices';
import DigicredLogoWallet from '../assets/SplashLogo.svg';
import LinearGradient from 'react-native-linear-gradient';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PINEnter = ({ setAuthenticated }) => {
    const { t } = useTranslation();
    const { checkWalletPIN, getWalletSecret, isBiometricsActive } = useAuth();
    const [store, dispatch] = useStore();
    const [showPINModal, setShowPINModal] = useState(false);
    const [PIN, setPIN] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [biometricsAvailable, setBiometricsAvailable] = useState(false);
    const isSubmittingRef = useRef(false);
    const minPINLength = 6;
    const buttonWidth = isTablet() ? SCREEN_WIDTH * 0.6 : SCREEN_WIDTH * 0.8;
    const orTextWidth = 36;
    const totalGap = buttonWidth - orTextWidth;
    const leftLineWidth = totalGap / 2.3;
    const rightLineWidth = totalGap / 2.3;
    useEffect(() => {
        const checkBiometrics = async () => {
            if (store.preferences.useBiometry) {
                try {
                    const active = await isBiometricsActive();
                    setBiometricsAvailable(active);
                }
                catch {
                    setBiometricsAvailable(false);
                }
            }
        };
        checkBiometrics();
    }, [store.preferences.useBiometry, isBiometricsActive]);
    const unlockWithBiometrics = useCallback(async () => {
        try {
            setIsLoading(true);
            const walletSecret = await getWalletSecret();
            if (walletSecret) {
                dispatch({
                    type: DispatchAction.LOCKOUT_UPDATED,
                    payload: [{ displayNotification: false }],
                });
                dispatch({
                    type: DispatchAction.ATTEMPT_UPDATED,
                    payload: [{ loginAttempts: 0 }],
                });
                setAuthenticated(true);
            }
        }
        catch (err) {
            DeviceEventEmitter.emit(EventTypes.BIOMETRY_ERROR, true);
        }
        finally {
            setIsLoading(false);
        }
    }, [getWalletSecret, dispatch, setAuthenticated]);
    const unlockWithPIN = useCallback(async (pinValue) => {
        const pinToCheck = pinValue || PIN;
        if (isSubmittingRef.current || pinToCheck.length < minPINLength) {
            return;
        }
        isSubmittingRef.current = true;
        Keyboard.dismiss();
        setError(null);
        try {
            setIsLoading(true);
            const result = await checkWalletPIN(pinToCheck);
            if (!result) {
                const newAttempt = store.loginAttempt.loginAttempts + 1;
                dispatch({
                    type: DispatchAction.ATTEMPT_UPDATED,
                    payload: [{ loginAttempts: newAttempt }],
                });
                setError(t('PINEnter.IncorrectPIN'));
                setPIN('');
                setIsLoading(false);
                isSubmittingRef.current = false;
                return;
            }
            dispatch({
                type: DispatchAction.ATTEMPT_UPDATED,
                payload: [{ loginAttempts: 0 }],
            });
            dispatch({
                type: DispatchAction.LOCKOUT_UPDATED,
                payload: [{ displayNotification: false }],
            });
            setShowPINModal(false);
            setAuthenticated(true);
        }
        catch (err) {
            setError(t('PINEnter.IncorrectPIN'));
            isSubmittingRef.current = false;
        }
        finally {
            setIsLoading(false);
        }
    }, [PIN, checkWalletPIN, dispatch, setAuthenticated, store.loginAttempt.loginAttempts, t]);
    const handlePINChange = useCallback((value) => {
        setPIN(value);
        if (value.length === minPINLength) {
            unlockWithPIN(value);
        }
    }, [unlockWithPIN]);
    const handleOpenPINModal = () => {
        setPIN('');
        setError(null);
        setShowPINModal(true);
    };
    return (<GradientBackground>
      <View style={styles.container}>
        <View style={[styles.logoContainer, { marginTop: 150 }]}>
          <DigicredLogoWallet width={'85%'}/>
        </View>

        <View style={styles.buttonsContainer}>
          <DigiCredButton title={t('PINEnter.UnlockWithPIN') || 'UNLOCK WITH PIN'} onPress={handleOpenPINModal} variant="secondary" customStyle={[styles.figmaButton, { width: buttonWidth, height: 55 }]} customTextStyle={styles.figmaButtonText} testID={testIdWithKey('UnlockWithPIN')} accessibilityLabel={t('PINEnter.UnlockWithPIN')}/>

          {store.preferences.useBiometry && biometricsAvailable && (<>
              <View style={[styles.orContainer, { width: buttonWidth }]}>
                <View style={[styles.orLine, { width: leftLineWidth }]}/>
                <Text style={styles.orText}>{t('PINEnter.Or') || 'OR'}</Text>
                <View style={[styles.orLine, { width: rightLineWidth }]}/>
              </View>
              <LinearGradient colors={DigiCredColors.homeNoChannels.buttonGradient} locations={DigiCredColors.homeNoChannels.buttonGradientLocations} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.figmaButton, { width: buttonWidth, height: 55 }]}>
                <DigiCredButton title={t('PINEnter.UnlockWithBiometrics') || 'UNLOCK WITH BIOMETRICS'} onPress={unlockWithBiometrics} variant="primary" customStyle={styles.figmaButtonTextWrapper} customTextStyle={styles.figmaButtonText} loading={isLoading && !showPINModal} testID={testIdWithKey('UnlockWithBiometrics')} accessibilityLabel={t('PINEnter.UnlockWithBiometrics')}/>
              </LinearGradient>
            </>)}
        </View>
      </View>

      <Modal visible={showPINModal} animationType="slide" transparent onRequestClose={() => setShowPINModal(false)}>
        <GradientBackground>
          <View style={styles.modalContainer}>
            <CardModal centered>
              <Text style={styles.modalTitle}>{t('PINEnter.EnterPIN') || 'Enter Your PIN'}</Text>
              <Text style={styles.modalSubtitle}>
                {t('PINEnter.EnterPINDescription') || 'Enter your 6 digit PIN to unlock your wallet'}
              </Text>

              <DigiCredInput placeholder={t('PINEnter.PINPlaceholder') || 'Enter PIN'} value={PIN} onChangeText={handlePINChange} secureTextEntry keyboardType="numeric" maxLength={6} autoFocus testID={testIdWithKey('EnterPIN')} accessibilityLabel={t('PINEnter.EnterPIN')}/>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <View style={styles.modalButtons}>
                <DigiCredButton title={t('Global.Cancel') || 'CANCEL'} onPress={() => setShowPINModal(false)} variant="secondary" customStyle={[styles.figmaButtonCancel, { height: 50 }]} customTextStyle={styles.figmaButtonText}/>

                <LinearGradient colors={DigiCredColors.homeNoChannels.buttonGradient} locations={DigiCredColors.homeNoChannels.buttonGradientLocations} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.figmaButton, { height: 50 }]}>
                  <DigiCredButton title={t('PINEnter.Unlock') || 'UNLOCK'} onPress={unlockWithPIN} disabled={PIN.length < minPINLength} loading={isLoading} variant="primary" customStyle={{
            backgroundColor: 'transparent',
            borderWidth: 0,
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
        }} customTextStyle={styles.figmaButtonText}/>
                </LinearGradient>
              </View>
            </CardModal>
          </View>
        </GradientBackground>
      </Modal>

    </GradientBackground>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        paddingTop: 0,
        paddingHorizontal: 24,
    },
    logoContainer: {
        alignItems: 'center',
        width: '100%',
    },
    buttonsContainer: {
        marginTop: 60,
        alignItems: 'center',
    },
    figmaButtonCancel: {
        borderRadius: 25,
        borderWidth: 1.5,
        borderColor: DigiCredColors.text.homePrimary,
        paddingTop: 5,
        paddingBottom: 5,
        marginLeft: -5,
        paddingHorizontal: 15,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'stretch',
        backgroundColor: 'transparent',
    },
    figmaButton: {
        marginLeft: 10,
        borderRadius: 25,
        borderWidth: 1.5,
        borderColor: DigiCredColors.toggle.thumb,
        paddingTop: 5,
        paddingBottom: 5,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'stretch',
        backgroundColor: 'transparent',
    },
    figmaButtonTextWrapper: {
        backgroundColor: 'transparent',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    figmaButtonText: {
        color: DigiCredColors.toggle.thumb,
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 20,
    },
    orContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
    },
    orLine: {
        height: 1,
        backgroundColor: DigiCredColors.text.homePrimary,
    },
    orText: {
        marginHorizontal: 12,
        color: DigiCredColors.text.homePrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '600',
        color: DigiCredColors.text.homePrimary,
        marginBottom: 12,
    },
    modalSubtitle: {
        fontSize: 14,
        color: DigiCredColors.homeNoChannels.itemDescription,
        lineHeight: 20,
        marginBottom: 24,
    },
    errorText: {
        color: DigiCredColors.text.error,
        fontSize: 14,
        marginBottom: 16,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
});
export default PINEnter;
