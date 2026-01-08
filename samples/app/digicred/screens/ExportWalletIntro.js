import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, ScrollView, Text, StatusBar, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screens, testIdWithKey } from '@bifold/core';
import { GradientBackground } from '../components';
// Hardcoded colors to avoid circular dependency with theme
const Colors = {
    text: { primary: '#FFFFFF', secondary: '#8A9A9A' },
    button: { primary: '#1A7A7A' },
};
const ExportWalletIntro = ({ navigation }) => {
    useTranslation(); // Hook available for future i18n
    const steps = [
        'Connect both devices to the same WiFi network',
        'Open this app on your new device and select "Restore Wallet"',
        'Enter your PIN on the new device',
        'Scan the QR code shown on this device',
    ];
    return (<GradientBackground>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent"/>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} testID={testIdWithKey('Back')}>
            <Icon name="arrow-left" size={24} color={Colors.text.primary}/>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transfer Wallet</Text>
          <View style={styles.headerSpacer}/>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Icon name="swap-horizontal" size={48} color={Colors.button.primary}/>
          </View>

          {/* Title */}
          <Text style={styles.title}>Transfer your wallet to a new device</Text>
          <Text style={styles.subtitle}>
            Follow these steps to securely transfer your wallet credentials to a new device:
          </Text>

          {/* Steps */}
          <View style={styles.stepsContainer}>
            {steps.map((step, index) => (<View key={index} style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>))}
          </View>

          {/* Warning */}
          <View style={styles.warningContainer}>
            <Icon name="alert-circle-outline" size={24} color={Colors.button.primary}/>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Warning</Text>
              <Text style={styles.warningText}>
                After successful transfer, your wallet data on this device will be ready for deletion.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate(Screens.ExportWallet)} testID={testIdWithKey('BeginTransfer')}>
            <Text style={styles.primaryButtonText}>Begin Transfer</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()} testID={testIdWithKey('Cancel')}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
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
        marginBottom: 32,
        lineHeight: 22,
    },
    stepsContainer: {
        marginBottom: 24,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.button.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    stepNumberText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    stepText: {
        flex: 1,
        fontSize: 15,
        color: Colors.text.primary,
        lineHeight: 22,
        paddingTop: 3,
    },
    warningContainer: {
        backgroundColor: 'rgba(30, 50, 50, 0.6)',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    warningContent: {
        flex: 1,
        marginLeft: 12,
    },
    warningTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text.primary,
        marginBottom: 4,
    },
    warningText: {
        fontSize: 14,
        color: Colors.text.secondary,
        lineHeight: 20,
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
export default ExportWalletIntro;
