import { DidExchangeState } from '@credo-ts/core'
import { useAgent } from '@credo-ts/react-hooks'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, StyleSheet, Text, StatusBar, TouchableOpacity, Share, useWindowDimensions } from 'react-native'

import {
  testIdWithKey,
  BifoldError,
  ScanCamera,
  SVGOverlay,
  MaskType,
  connectFromScanOrDeepLink,
  QRRenderer,
  setCameraActive,
} from '@bifold/core'
import { QrCodeScanError } from '@bifold/core/src/types/error'
import { TOKENS, useServices } from '@bifold/core/src/container-api'
import { useStore } from '@bifold/core/src/contexts/store'
import LoadingIndicator from '@bifold/core/src/components/animated/LoadingIndicator'
import { createConnectionInvitation } from '@bifold/core/src/utils/helpers'
import { useConnectionByOutOfBandId } from '@bifold/core/src/hooks/connections'
import { Screens, Stacks } from '@bifold/core/src/types/navigators'
import { ConnectStackParams } from '@bifold/core/src/types/navigators'

import { GradientBackground } from '../components'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

// Hardcoded colors to avoid circular dependency with theme
const Colors = {
  text: { primary: '#FFFFFF', secondary: '#8A9A9A' },
  button: { primary: '#1A7A7A' },
}

export type ScanProps = StackScreenProps<ConnectStackParams>

const Scan: React.FC<ScanProps> = ({ navigation }) => {
  const { agent } = useAgent()
  const { t } = useTranslation()
  const { width } = useWindowDimensions()
  const [store] = useStore()
  const [qrCodeScanError, setQrCodeScanError] = useState<QrCodeScanError | null>(null)
  const [torchActive, setTorchActive] = useState(false)
  const [activeTab, setActiveTab] = useState<'scan' | 'myqr'>('scan')
  const [invitation, setInvitation] = useState<string | undefined>(undefined)
  const [recordId, setRecordId] = useState<string | undefined>(undefined)
  const record = useConnectionByOutOfBandId(recordId || '')
  const [{ enableImplicitInvitations, enableReuseConnections }, logger] = useServices([
    TOKENS.CONFIG,
    TOKENS.UTIL_LOGGER,
  ])

  const qrSize = Math.min(width - 100, 250)

  // Note: defaultToConnect parameter available in route.params if needed
  // const defaultToConnect = route?.params?.['defaultToConnect'] ?? false

  const handleInvitation = useCallback(
    async (value: string): Promise<void> => {
      try {
        await connectFromScanOrDeepLink(
          value,
          agent,
          logger,
          navigation?.getParent(),
          false,
          enableImplicitInvitations,
          enableReuseConnections
        )
      } catch (err: unknown) {
        const error = new BifoldError(
          t('Error.Title1031'),
          t('Error.Message1031'),
          (err as Error)?.message ?? err,
          1031
        )
        throw error
      }
    },
    [agent, logger, navigation, enableImplicitInvitations, enableReuseConnections, t]
  )

  const handleCodeScan = useCallback(
    async (value: string) => {
      setQrCodeScanError(null)
      try {
        const uri = value
        await handleInvitation(uri)
      } catch (e: unknown) {
        const error = new QrCodeScanError(t('Scan.InvalidQrCode'), value, (e as Error)?.message)
        setQrCodeScanError(error)
      }
    },
    [handleInvitation, t]
  )

  const createInvitation = useCallback(async () => {
    setInvitation(undefined)
    const result = await createConnectionInvitation(agent)
    if (result) {
      setRecordId(result.record.id)
      setInvitation(result.invitationUrl)
    }
  }, [agent])

  // Create invitation when switching to My QR tab
  useEffect(() => {
    if (activeTab === 'myqr') {
      createInvitation()
    }
  }, [activeTab, createInvitation])

  // Navigate to connection screen when connection is completed
  useEffect(() => {
    if (record?.state === DidExchangeState.Completed) {
      navigation.getParent()?.navigate(Stacks.ConnectionStack, {
        screen: Screens.Connection,
        params: { oobRecordId: recordId },
      })
    }
  }, [record, navigation, recordId])

  const handleShare = useCallback(() => {
    if (invitation) {
      Share.share({ message: invitation })
    }
  }, [invitation])

  // Set camera active flag to prevent splash overlay during camera transitions
  useEffect(() => {
    setCameraActive(true)
    return () => {
      setCameraActive(false)
    }
  }, [])

  // Scanner view with tabs
  return (
    <View style={styles.scanContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {activeTab === 'scan' ? (
        // Scan QR Code Tab
        <View style={styles.cameraContainer}>
          <ScanCamera
            handleCodeScan={handleCodeScan}
            error={qrCodeScanError}
            enableCameraOnError={true}
            torchActive={torchActive}
          />
          <SVGOverlay maskType={MaskType.QR_CODE} />
          <View style={styles.overlay}>
            {/* Header */}
            <View style={styles.scanHeader}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                testID={testIdWithKey('Back')}
              >
                <Icon name="chevron-left" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.scanHeaderTitle}>{t('Scan.ScanQRCode')}</Text>
              <TouchableOpacity
                onPress={() => setTorchActive(!torchActive)}
                style={styles.torchButton}
                testID={testIdWithKey('Torch')}
              >
                <Icon name={torchActive ? 'flashlight' : 'flashlight-off'} size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Status message */}
            <View style={styles.statusContainer}>
              {qrCodeScanError ? (
                <View style={styles.errorBanner}>
                  <Icon name="alert-circle" size={20} color="#F44336" />
                  <Text style={styles.errorText}>{qrCodeScanError.message}</Text>
                </View>
              ) : (
                <Text style={styles.statusText}>{t('Scan.WillScanAutomatically')}</Text>
              )}
            </View>
          </View>
        </View>
      ) : (
        // My QR Code Tab
        <GradientBackground>
          <View style={styles.myQrContainer}>
            {/* Header */}
            <View style={styles.myQrHeader}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                testID={testIdWithKey('Back')}
              >
                <Icon name="chevron-left" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.scanHeaderTitle}>{t('Scan.MyQRCode')}</Text>
              <TouchableOpacity
                onPress={handleShare}
                style={styles.torchButton}
                testID={testIdWithKey('Share')}
                disabled={!invitation}
              >
                <Icon name="share-variant" size={24} color={invitation ? '#FFFFFF' : '#666666'} />
              </TouchableOpacity>
            </View>

            {/* QR Code Content */}
            <View style={styles.myQrContent}>
              <View style={styles.qrWrapper}>
                {!invitation ? (
                  <View style={styles.loadingContainer}>
                    <LoadingIndicator />
                  </View>
                ) : (
                  <View style={styles.qrCodeContainer}>
                    <QRRenderer value={invitation} size={qrSize} />
                  </View>
                )}
              </View>

              <Text style={styles.walletName}>{store.preferences.walletName}</Text>
              <Text style={styles.shareHint}>{t('Connection.ShareQR')}</Text>
            </View>
          </View>
        </GradientBackground>
      )}

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'scan' && styles.activeTab]}
          onPress={() => setActiveTab('scan')}
          testID={testIdWithKey('ScanTab')}
        >
          <Icon
            name="qrcode-scan"
            size={24}
            color={activeTab === 'scan' ? Colors.button.primary : Colors.text.secondary}
          />
          <Text style={[styles.tabText, activeTab === 'scan' && styles.activeTabText]}>{t('Scan.ScanQRCode')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'myqr' && styles.activeTab]}
          onPress={() => setActiveTab('myqr')}
          testID={testIdWithKey('MyQRTab')}
        >
          <Icon name="qrcode" size={24} color={activeTab === 'myqr' ? Colors.button.primary : Colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'myqr' && styles.activeTabText]}>{t('Scan.MyQRCode')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
  },
  scanButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  // Tab bar styles
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0A1A1A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 30,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    borderTopWidth: 2,
    borderTopColor: Colors.button.primary,
    marginTop: -10,
    paddingTop: 8,
  },
  tabText: {
    color: Colors.text.secondary,
    fontSize: 12,
    marginTop: 4,
  },
  activeTabText: {
    color: Colors.button.primary,
  },
  // My QR styles
  myQrContainer: {
    flex: 1,
  },
  myQrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
  },
  myQrContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  qrWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    flexGrow: 0,
    flexShrink: 0,
  },
  loadingContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  qrCodeContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    // Prevent stretching - only be as big as content
    flexGrow: 0,
    flexShrink: 0,
  },
  walletName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  shareHint: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
})

export default Scan
