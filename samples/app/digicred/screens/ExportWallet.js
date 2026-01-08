import { useAgent } from '@credo-ts/react-hooks';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, ActivityIndicator, Alert, Text, StatusBar, TouchableOpacity } from 'react-native';
import RNFS from 'react-native-fs';
import { NetworkInfo } from 'react-native-network-info';
import QRCode from 'react-native-qrcode-svg';
import TcpSocket from 'react-native-tcp-socket';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import uuid from 'react-native-uuid';
import { Screens, useStore, testIdWithKey, loadWalletSalt } from '@bifold/core';
import { GradientBackground } from '../components';
// Hardcoded colors to avoid circular dependency with theme
const Colors = {
    text: { primary: '#FFFFFF', secondary: '#8A9A9A' },
    button: { primary: '#1A7A7A' },
};
const EXPORT_PORT = 8080;
const ExportWallet = ({ navigation }) => {
    useTranslation(); // Hook available for future i18n
    const { agent } = useAgent();
    const [store] = useStore();
    const [serverUrl, setServerUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTransferred, setIsTransferred] = useState(false);
    const [error, setError] = useState(null);
    const serverRef = useRef(null);
    const exportDataRef = useRef(null);
    const prepareExportData = useCallback(async () => {
        if (!agent) {
            setError('Agent not initialized');
            return null;
        }
        try {
            const exportDir = `${RNFS.DocumentDirectoryPath}/wallet-export`;
            const exportPath = `${exportDir}/wallet-backup`;
            const dirExists = await RNFS.exists(exportDir);
            if (dirExists) {
                await RNFS.unlink(exportDir);
            }
            await RNFS.mkdir(exportDir);
            const exportKey = uuid.v4().toString();
            await agent.wallet.export({ key: exportKey, path: exportPath });
            const walletDataExists = await RNFS.exists(exportPath);
            if (!walletDataExists) {
                throw new Error('Wallet export failed - file not created');
            }
            const walletData = await RNFS.readFile(exportPath, 'base64');
            const saltData = await loadWalletSalt();
            if (!saltData) {
                throw new Error('Could not load wallet salt');
            }
            const mediatorConfig = agent.mediationRecipient?.config;
            const mediatorInvitationUrl = mediatorConfig?.mediatorInvitationUrl;
            const exportData = {
                walletName: store.preferences.walletName,
                key: exportKey,
                salt: saltData.salt,
                walletData,
                mediatorInvitationUrl,
            };
            await RNFS.unlink(exportDir);
            return exportData;
        }
        catch (err) {
            // Error preparing export data
            setError(err instanceof Error ? err.message : 'Failed to prepare export data');
            return null;
        }
    }, [agent, store.preferences.walletName]);
    const startServer = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const ipAddress = await NetworkInfo.getIPV4Address();
            if (!ipAddress) {
                throw new Error('Could not get IP address. Make sure you are connected to WiFi.');
            }
            const data = await prepareExportData();
            if (!data) {
                setIsLoading(false);
                return;
            }
            exportDataRef.current = data;
            const server = TcpSocket.createServer((socket) => {
                socket.on('data', (receivedData) => {
                    const request = receivedData.toString();
                    if (request.includes('GET /get-wallet')) {
                        if (exportDataRef.current) {
                            const responseBody = JSON.stringify(exportDataRef.current);
                            const response = `HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${responseBody.length}\r\nConnection: close\r\n\r\n${responseBody}`;
                            socket.write(response);
                            setIsTransferred(true);
                        }
                    }
                });
                socket.on('error', () => { });
            });
            server.on('error', (err) => {
                setError(`Server error: ${err.message}`);
            });
            server.listen({ port: EXPORT_PORT, host: '0.0.0.0' }, () => {
                setServerUrl(`http://${ipAddress}:${EXPORT_PORT}/get-wallet`);
                setIsLoading(false);
            });
            serverRef.current = server;
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start server');
            setIsLoading(false);
        }
    }, [prepareExportData]);
    const stopServer = useCallback(() => {
        if (serverRef.current) {
            try {
                serverRef.current.close();
                serverRef.current = null;
            }
            catch {
                // Error stopping server - ignore
            }
        }
    }, []);
    useEffect(() => {
        startServer();
        return () => stopServer();
    }, [startServer, stopServer]);
    const handleComplete = () => {
        stopServer();
        Alert.alert('Export Successful', 'Your wallet has been transferred. You can now delete it from this device.', [{ text: 'Done', onPress: () => navigation.navigate(Screens.Settings) }]);
    };
    if (isTransferred) {
        return (<GradientBackground>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent"/>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerSpacer}/>
            <Text style={styles.headerTitle}>Transfer Complete</Text>
            <View style={styles.headerSpacer}/>
          </View>

          <View style={styles.centerContent}>
            <View style={[styles.iconContainer, styles.successIcon]}>
              <Icon name="check-circle" size={64} color="#4CAF50"/>
            </View>
            <Text style={styles.title}>Export Successful</Text>
            <Text style={styles.subtitle}>
              Your wallet has been transferred. You can now delete it from this device.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleComplete} testID={testIdWithKey('Complete')}>
              <Text style={styles.primaryButtonText}>Complete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GradientBackground>);
    }
    return (<GradientBackground>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent"/>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            stopServer();
            navigation.goBack();
        }} style={styles.backButton} testID={testIdWithKey('Back')}>
            <Icon name="arrow-left" size={24} color={Colors.text.primary}/>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transfer Wallet</Text>
          <View style={styles.headerSpacer}/>
        </View>

        <View style={styles.centerContent}>
          {isLoading ? (<>
              <ActivityIndicator size="large" color={Colors.button.primary}/>
              <Text style={[styles.subtitle, { marginTop: 16 }]}>Preparing transfer...</Text>
            </>) : error ? (<>
              <View style={[styles.iconContainer, styles.errorIcon]}>
                <Icon name="alert-circle" size={48} color="#F44336"/>
              </View>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => {
                setError(null);
                startServer();
            }}>
                <Text style={styles.secondaryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </>) : serverUrl ? (<>
              <View style={styles.qrContainer}>
                <QRCode value={serverUrl} size={200} backgroundColor="white"/>
              </View>
              <Text style={styles.title}>Ready to Transfer</Text>
              <Text style={styles.subtitle}>
                Scan this QR code from your new device to begin the transfer.
              </Text>
              <View style={styles.waitingContainer}>
                <ActivityIndicator size="small" color={Colors.button.primary}/>
                <Text style={styles.waitingText}>Waiting for connection...</Text>
              </View>
            </>) : null}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => {
            stopServer();
            navigation.goBack();
        }} testID={testIdWithKey('Cancel')}>
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
    successIcon: {
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
    },
    errorIcon: {
        backgroundColor: 'rgba(244, 67, 54, 0.2)',
    },
    qrContainer: {
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 16,
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
        paddingHorizontal: 20,
    },
    errorText: {
        fontSize: 15,
        color: '#F44336',
        textAlign: 'center',
        marginBottom: 20,
    },
    waitingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 24,
        backgroundColor: 'rgba(30, 50, 50, 0.6)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
    },
    waitingText: {
        fontSize: 14,
        color: Colors.text.secondary,
        marginLeft: 12,
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
export default ExportWallet;
