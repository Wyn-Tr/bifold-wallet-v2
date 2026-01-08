import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Text, StatusBar, TouchableOpacity, } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screens, minPINLength, testIdWithKey, PINInput } from '@bifold/core';
import { GradientBackground } from '../components';
// Hardcoded colors to avoid circular dependency with theme
const Colors = {
    text: { primary: '#FFFFFF', secondary: '#8A9A9A' },
    button: { primary: '#1A7A7A' },
};
const ImportWallet = ({ navigation }) => {
    const { t } = useTranslation();
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState(null);
    const confirmPinRef = useRef(null);
    const handlePinChange = (value) => {
        setPin(value);
        setError(null);
    };
    const handleConfirmPinChange = (value) => {
        setConfirmPin(value);
        setError(null);
    };
    const validatePins = () => {
        if (pin.length < minPINLength) {
            setError(t('PINCreate.PINTooShort'));
            return false;
        }
        if (pin !== confirmPin) {
            setError(t('PINCreate.PINsDoNotMatch'));
            return false;
        }
        return true;
    };
    const handleContinue = () => {
        if (validatePins()) {
            navigation.navigate(Screens.ImportWalletScan, { pin });
        }
    };
    return (<GradientBackground>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent"/>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} testID={testIdWithKey('Back')}>
            <Icon name="arrow-left" size={24} color={Colors.text.primary}/>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Restore Wallet</Text>
          <View style={styles.headerSpacer}/>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <Icon name="download" size={48} color={Colors.button.primary}/>
            </View>

            {/* Title */}
            <Text style={styles.title}>Enter your PIN</Text>
            <Text style={styles.subtitle}>
              Enter the PIN of the wallet you are restoring.
            </Text>
            <Text style={styles.warningText}>
              Importing will overwrite any existing wallet. This action is{' '}
              <Text style={styles.warningBold}>permanent and cannot be undone.</Text>
            </Text>

            {/* Error */}
            {error && (<View style={styles.errorContainer}>
                <Icon name="alert-circle" size={20} color="#F44336"/>
                <Text style={styles.errorText}>{error}</Text>
              </View>)}

            {/* PIN Inputs */}
            <View style={styles.inputContainer}>
              <PINInput label={t('PINCreate.EnterPIN')} onPINChanged={handlePinChange} testID={testIdWithKey('EnterPIN')} accessibilityLabel={t('PINCreate.EnterPIN')} autoFocus onSubmitEditing={() => confirmPinRef.current?.focus()}/>

              <PINInput ref={confirmPinRef} label={t('PINCreate.ReenterPIN')} onPINChanged={handleConfirmPinChange} testID={testIdWithKey('ReenterPIN')} accessibilityLabel={t('PINCreate.ReenterPIN')} onSubmitEditing={handleContinue}/>
            </View>
          </ScrollView>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[
            styles.primaryButton,
            (pin.length < minPINLength || confirmPin.length < minPINLength) && styles.disabledButton,
        ]} onPress={handleContinue} disabled={pin.length < minPINLength || confirmPin.length < minPINLength} testID={testIdWithKey('Continue')}>
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()} testID={testIdWithKey('Cancel')}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </GradientBackground>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text.primary,
    },
    headerSpacer: {
        width: 40,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(30, 50, 50, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text.primary,
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 15,
        color: Colors.text.secondary,
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 22,
    },
    warningText: {
        fontSize: 14,
        color: Colors.button.primary,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    warningBold: {
        fontWeight: '600',
    },
    errorContainer: {
        backgroundColor: 'rgba(244, 67, 54, 0.2)',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    errorText: {
        color: '#F44336',
        marginLeft: 12,
        flex: 1,
        fontSize: 14,
    },
    inputContainer: {
        marginTop: 8,
    },
    buttonContainer: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    primaryButton: {
        backgroundColor: Colors.button.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 12,
    },
    disabledButton: {
        opacity: 0.5,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: 'rgba(30, 50, 50, 0.6)',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: Colors.text.primary,
        fontSize: 16,
        fontWeight: '600',
    },
});
export default ImportWallet;
