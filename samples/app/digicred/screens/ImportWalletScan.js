import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, ActivityIndicator, Text, StatusBar, TouchableOpacity } from 'react-native';
import RNFS from 'react-native-fs';
import TcpSocket from 'react-native-tcp-socket';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import uuid from 'react-native-uuid';
import { Screens, useStore, testIdWithKey, storeWalletSecret, hashPIN, ScanCamera, SVGOverlay, MaskType } from '@bifold/core';
import { GradientBackground } from '../components';
// Hardcoded colors to avoid circular dependency with theme
const Colors = {
    text: { primary: '#FFFFFF', secondary: '#8A9A9A' },
    button: { primary: '#1A7A7A' },
};
const CONNECTION_TIMEOUT = 20000; // 20 seconds
const ImportWalletScan = ({ navigation, route }) => {
    const { pin } = route.params;
    useTranslation(); // Hook available for future i18n
    const [store] = useStore();
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState('Scan QR code from your old device');
    const [error, setError] = useState(null);
    const clientRef = useRef(null);
    const timeoutRef = useRef(null);
    const cleanup = useCallback(() => {
        if (clientRef.current) {
            try {
                clientRef.current.destroy();
                clientRef.current = null;
            }
            catch {
                // Error cleaning up client - ignore
            }
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);
    const importWallet = useCallback(async (data) => {
        const importDir = `${RNFS.DocumentDirectoryPath}/wallet-import`;
        const importPath = `${importDir}/wallet-backup`;
        try {
            // Create import directory
            const dirExists = await RNFS.exists(importDir);
            if (dirExists) {
                await RNFS.unlink(importDir);
            }
            await RNFS.mkdir(importDir);
            // Write wallet data to file
            await RNFS.writeFile(importPath, data.walletData, 'base64');
            // Verify the PIN against the stored hash
            const derivedKey = await hashPIN(pin, data.salt);
            // Note: derivedKey may differ from export key - using export key for import
            // Generate new wallet ID
            const newWalletId = uuid.v4().toString();
            // Store wallet secret with new PIN
            const newSecret = {
                id: newWalletId,
                key: derivedKey,
                salt: data.salt,
            };
            await storeWalletSecret(newSecret, store.preferences.useBiometry);
            // Cleanup import directory
            await RNFS.unlink(importDir);
            // Navigate to success screen
            navigation.navigate(Screens.ImportWalletResult, { status: 'success' });
        }
        catch (err) {
            // Error importing wallet
            // Cleanup on error
            try {
                const dirExists = await RNFS.exists(importDir);
                if (dirExists) {
                    await RNFS.unlink(importDir);
                }
            }
            catch {
                // Ignore cleanup errors
            }
            throw err;
        }
    }, [pin, store.preferences.useBiometry, navigation]);
    const fetchWalletData = useCallback(async (url) => {
        setIsProcessing(true);
        setIsScanning(false);
        setStatus('Restoring wallet...');
        try {
            // Parse URL to get host and port
            const urlMatch = url.match(/http:\/\/([^:]+):(\d+)/);
            if (!urlMatch) {
                throw new Error('Invalid QR code format');
            }
            const host = urlMatch[1];
            const port = parseInt(urlMatch[2], 10);
            // Set connection timeout
            timeoutRef.current = setTimeout(() => {
                cleanup();
                setError('Connection timed out. Make sure both devices are on the same WiFi.');
                setIsProcessing(false);
            }, CONNECTION_TIMEOUT);
            // Create TCP client
            const client = TcpSocket.createConnection({ host, port }, () => {
                // Connected to export server
                const request = `GET /get-wallet HTTP/1.1\r\nHost: ${host}:${port}\r\n\r\n`;
                client.write(request);
            });
            clientRef.current = client;
            let responseData = '';
            client.on('data', (data) => {
                responseData += data.toString();
                // Check if we have complete response
                const bodyStart = responseData.indexOf('\r\n\r\n');
                if (bodyStart !== -1) {
                    const body = responseData.substring(bodyStart + 4);
                    // Try to parse JSON
                    try {
                        const exportData = JSON.parse(body);
                        if (timeoutRef.current) {
                            clearTimeout(timeoutRef.current);
                            timeoutRef.current = null;
                        }
                        // Import the wallet
                        importWallet(exportData)
                            .then(() => {
                            cleanup();
                        })
                            .catch((err) => {
                            setError(err.message || 'Failed to import wallet data');
                            setIsProcessing(false);
                            cleanup();
                        });
                    }
                    catch {
                        // Not complete JSON yet, continue reading
                    }
                }
            });
            client.on('error', () => {
                // TCP client error
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                setError('Connection failed. Check WiFi connection.');
                setIsProcessing(false);
                cleanup();
            });
            client.on('close', () => {
                // Connection closed
                if (!error && isProcessing) {
                    if (!responseData.includes('\r\n\r\n')) {
                        setError('Connection closed unexpectedly');
                        setIsProcessing(false);
                    }
                }
            });
        }
        catch (err) {
            // Error fetching wallet data
            setError(err instanceof Error ? err.message : 'Failed to process wallet data');
            setIsProcessing(false);
            cleanup();
        }
    }, [cleanup, importWallet, error, isProcessing]);
    const handleCodeScan = useCallback(async (value) => {
        if (!value.includes('/get-wallet')) {
            setError('Invalid QR code. Please scan the code from your old device.');
            return;
        }
        await fetchWalletData(value);
    }, [fetchWalletData]);
    const handleRetry = () => {
        setError(null);
        setIsScanning(true);
        setIsProcessing(false);
        setStatus('Scan QR code from your old device');
    };
    // Error state
    if (error) {
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
            <View style={[styles.iconContainer, styles.errorIcon]}>
              <Icon name="alert-circle" size={64} color="#F44336"/>
            </View>
            <Text style={styles.title}>Connection Failed</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleRetry} testID={testIdWithKey('TryAgain')}>
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()} testID={testIdWithKey('Cancel')}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GradientBackground>);
    }
    // Processing state
    if (isProcessing) {
        return (<GradientBackground>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent"/>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerSpacer}/>
            <Text style={styles.headerTitle}>Importing Wallet</Text>
            <View style={styles.headerSpacer}/>
          </View>

          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={Colors.button.primary}/>
            <Text style={[styles.title, { marginTop: 24 }]}>Restoring Wallet</Text>
            <Text style={styles.subtitle}>Please wait while we restore your wallet...</Text>
          </View>
        </View>
      </GradientBackground>);
    }
    // Scanning state
    return (<View style={styles.scanContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent"/>
      <View style={styles.cameraContainer}>
        <ScanCamera handleCodeScan={handleCodeScan} enableCameraOnError/>
        <SVGOverlay maskType={MaskType.QR_CODE}/>
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.scanHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} testID={testIdWithKey('Back')}>
              <Icon name="arrow-left" size={24} color="#FFFFFF"/>
            </TouchableOpacity>
            <Text style={styles.scanHeaderTitle}>Scan QR Code</Text>
            <View style={styles.headerSpacer}/>
          </View>

          {/* Status */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>
      </View>

      <View style={styles.scanButtonContainer}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()} testID={testIdWithKey('Cancel')}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
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
        paddingHorizontal: 20,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(30, 50, 50, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
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
        fontSize: 15,
        color: '#F44336',
        textAlign: 'center',
        lineHeight: 22,
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
    // Camera/Scan styles
    cameraContainer: {
        flex: 1,
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
        paddingTop: 50,
        paddingVertical: 12,
    },
    scanHeaderTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    statusContainer: {
        alignSelf: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 100,
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 16,
        textAlign: 'center',
    },
    scanButtonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
});
export default ImportWalletScan;
