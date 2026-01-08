import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, Text, StatusBar, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screens, Stacks, TabStacks, testIdWithKey } from '@bifold/core';
import { GradientBackground } from '../components';
// Hardcoded colors to avoid circular dependency with theme
const Colors = {
    text: { primary: '#FFFFFF', secondary: '#8A9A9A' },
    button: { primary: '#1A7A7A' },
};
const ImportWalletResult = ({ navigation, route }) => {
    const { status, errorMessage } = route.params;
    useTranslation(); // Hook available for future i18n
    const isSuccess = status === 'success';
    const handleViewCredentials = () => {
        navigation.getParent()?.navigate(Stacks.TabStack, {
            screen: TabStacks.CredentialStack,
        });
    };
    const handleGoToSettings = () => {
        navigation.navigate(Screens.Settings);
    };
    const handleTryAgain = () => {
        navigation.navigate(Screens.ImportWallet);
    };
    return (<GradientBackground>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent"/>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerSpacer}/>
          <Text style={styles.headerTitle}>
            {isSuccess ? 'Import Complete' : 'Import Failed'}
          </Text>
          <View style={styles.headerSpacer}/>
        </View>

        <View style={styles.centerContent}>
          <View style={[styles.iconContainer, isSuccess ? styles.successIcon : styles.errorIcon]}>
            <Icon name={isSuccess ? 'check-circle' : 'alert-circle'} size={64} color={isSuccess ? '#4CAF50' : '#F44336'}/>
          </View>

          <Text style={styles.title}>
            {isSuccess ? 'Wallet Restored' : 'Import Failed'}
          </Text>

          <Text style={styles.subtitle}>
            {isSuccess
            ? 'Your wallet has been successfully restored. All your credentials are now available.'
            : 'We were unable to restore your wallet. Please try again.'}
          </Text>

          {!isSuccess && errorMessage && (<Text style={styles.errorText}>{errorMessage}</Text>)}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={isSuccess ? handleViewCredentials : handleTryAgain} testID={testIdWithKey(isSuccess ? 'ViewCredentials' : 'TryAgain')}>
            <Text style={styles.primaryButtonText}>
              {isSuccess ? 'View Credentials' : 'Try Again'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleGoToSettings} testID={testIdWithKey('ReturnToMenu')}>
            <Text style={styles.secondaryButtonText}>Return to Menu</Text>
          </TouchableOpacity>
        </View>
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
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text.primary,
    },
    headerSpacer: {
        width: 40,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    successIcon: {
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
    },
    errorIcon: {
        backgroundColor: 'rgba(244, 67, 54, 0.2)',
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
        lineHeight: 22,
        paddingHorizontal: 20,
    },
    errorText: {
        fontSize: 14,
        color: '#F44336',
        textAlign: 'center',
        marginTop: 16,
        paddingHorizontal: 20,
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
export default ImportWalletResult;
