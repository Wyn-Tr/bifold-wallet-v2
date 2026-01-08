import { useAgent } from '@credo-ts/react-hooks';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, View, StyleSheet, Text, StatusBar, TouchableOpacity } from 'react-native';
import { PERMISSIONS, RESULTS, check, request } from 'react-native-permissions';
import Toast from 'react-native-toast-message';
import { testIdWithKey, TOKENS, useServices, BifoldError, QrCodeScanError, ToastType, ScanCamera, SVGOverlay, MaskType, connectFromScanOrDeepLink, } from '@bifold/core';
import { GradientBackground } from '../components';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// Hardcoded colors to avoid circular dependency with theme
const Colors = {
    text: { primary: '#FFFFFF', secondary: '#8A9A9A' },
    button: { primary: '#1A7A7A' },
};
const Scan = ({ navigation }) => {
    const { agent } = useAgent();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [showDisclosureModal, setShowDisclosureModal] = useState(true);
    const [qrCodeScanError, setQrCodeScanError] = useState(null);
    const [torchActive, setTorchActive] = useState(false);
    const [{ enableImplicitInvitations, enableReuseConnections }, logger] = useServices([
        TOKENS.CONFIG,
        TOKENS.UTIL_LOGGER,
    ]);
    // Note: defaultToConnect parameter available in route.params if needed
    // const defaultToConnect = route?.params?.['defaultToConnect'] ?? false
    const handleInvitation = useCallback(async (value) => {
        try {
            await connectFromScanOrDeepLink(value, agent, logger, navigation?.getParent(), false, enableImplicitInvitations, enableReuseConnections);
        }
        catch (err) {
            const error = new BifoldError(t('Error.Title1031'), t('Error.Message1031'), err?.message ?? err, 1031);
            throw error;
        }
    }, [agent, logger, navigation, enableImplicitInvitations, enableReuseConnections, t]);
    const handleCodeScan = useCallback(async (value) => {
        setQrCodeScanError(null);
        try {
            const uri = value;
            await handleInvitation(uri);
        }
        catch (e) {
            const error = new QrCodeScanError(t('Scan.InvalidQrCode'), value, e?.message);
            setQrCodeScanError(error);
        }
    }, [handleInvitation, t]);
    const permissionFlow = useCallback(async (method, permission, rationale) => {
        try {
            const permissionResult = await method(permission, rationale);
            if (permissionResult === RESULTS.GRANTED) {
                setShowDisclosureModal(false);
                return true;
            }
        }
        catch (error) {
            Toast.show({
                type: ToastType.Error,
                text1: t('Global.Failure'),
                text2: error?.message || t('Error.Unknown'),
                visibilityTime: 2000,
                position: 'bottom',
            });
        }
        return false;
    }, [t]);
    const requestCameraUse = async (rationale) => {
        if (Platform.OS === 'android') {
            return await permissionFlow(request, PERMISSIONS.ANDROID.CAMERA, rationale);
        }
        else if (Platform.OS === 'ios') {
            return await permissionFlow(request, PERMISSIONS.IOS.CAMERA, rationale);
        }
        return false;
    };
    useEffect(() => {
        const asyncEffect = async () => {
            if (Platform.OS === 'android') {
                await permissionFlow(check, PERMISSIONS.ANDROID.CAMERA);
            }
            else if (Platform.OS === 'ios') {
                await permissionFlow(check, PERMISSIONS.IOS.CAMERA);
            }
            setLoading(false);
        };
        asyncEffect();
    }, [permissionFlow]);
    // Camera disclosure modal
    if (showDisclosureModal && !loading) {
        return (<GradientBackground>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent"/>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} testID={testIdWithKey('Back')}>
              <Icon name="arrow-left" size={24} color={Colors.text.primary}/>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan QR Code</Text>
            <View style={styles.headerSpacer}/>
          </View>
          <View style={styles.centerContent}>
            <View style={styles.iconContainer}>
              <Icon name="camera" size={48} color={Colors.button.primary}/>
            </View>
            <Text style={styles.title}>Camera Access Required</Text>
            <Text style={styles.subtitle}>
              To scan QR codes and connect with contacts, we need permission to use your camera.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => requestCameraUse()} testID={testIdWithKey('AllowCamera')}>
              <Text style={styles.primaryButtonText}>Allow Camera Access</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()} testID={testIdWithKey('Cancel')}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GradientBackground>);
    }
    // Loading state
    if (loading) {
        return (<GradientBackground>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent"/>
        <View style={styles.container}>
          <View style={styles.centerContent}>
            <Text style={styles.subtitle}>Loading...</Text>
          </View>
        </View>
      </GradientBackground>);
    }
    // Scanner view
    return (<View style={styles.scanContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent"/>
      <View style={styles.cameraContainer}>
        <ScanCamera handleCodeScan={handleCodeScan} error={qrCodeScanError} enableCameraOnError={true} torchActive={torchActive}/>
        <SVGOverlay maskType={MaskType.QR_CODE}/>
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.scanHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} testID={testIdWithKey('Back')}>
              <Icon name="arrow-left" size={Platform.OS == 'ios' ? 24 : 40} color="#FFFFFF"/>
            </TouchableOpacity>
            <Text style={styles.scanHeaderTitle}>Scan QR Code</Text>
            <TouchableOpacity onPress={() => setTorchActive(!torchActive)} style={styles.torchButton} testID={testIdWithKey('Torch')}>
              <Icon name={torchActive ? 'flashlight-on' : 'flashlight-off'} size={24} color="#FFFFFF"/>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scanContainer: {
        flex: 1,
        backgroundColor: '#000000',
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
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(30, 50, 50, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
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
        lineHeight: 22,
        marginBottom: 32,
    },
    primaryButton: {
        backgroundColor: Colors.button.primary,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 32,
        alignItems: 'center',
        marginBottom: 12,
        width: '100%',
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
        width: '100%',
    },
    secondaryButtonText: {
        color: Colors.text.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    cameraContainer: {
        flex: 1,
        marginTop: 50,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },
    scanHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    scanHeaderTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    torchButton: {
        padding: 8,
    },
    statusContainer: {
        alignSelf: 'center',
        marginBottom: 100,
    },
    statusText: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        color: '#FFFFFF',
        fontSize: 16,
        textAlign: 'center',
    },
    errorText: {
        color: '#FFFFFF',
        fontSize: 14,
        marginLeft: 8,
    },
});
export default Scan;
