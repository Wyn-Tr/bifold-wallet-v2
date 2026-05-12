import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, StyleSheet, FlatList, StatusBar, TouchableOpacity } from 'react-native'
import { useNavigation, useIsFocused } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AnonCredsCredentialMetadataKey } from '@credo-ts/anoncreds'
import {
  ConnectionRecord,
  CredentialExchangeRecord,
  CredentialState,
  SdJwtVcRecord,
  W3cCredentialRecord,
} from '@credo-ts/core'
import { OpenBadgeCredentialRecord } from '@ajna-inc/openbadges'
import { JsonLdCredentialRecord } from '@bifold/core/src/modules/openid/jsonLd/JsonLdCredentialRecord'
import { useConnections, useCredentialByState } from '@credo-ts/react-hooks'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useStore, useTour, DispatchAction, testIdWithKey, CredentialCard } from '@bifold/core'
import { useOpenIDCredentials } from '@bifold/core/src/modules/openid/context/OpenIDCredentialRecordProvider'
import { GenericCredentialExchangeRecord, CredentialErrors } from '@bifold/core/src/types/credentials'
import { OpenIDCredentialType } from '@bifold/core/src/modules/openid/types'
import { BaseTourID } from '@bifold/core/src/types/tour'
import { CredentialListFooterProps } from '@bifold/core/src/types/credential-list-footer'
import { TOKENS, useServices } from '../../../../packages/core/src/container-api'
import { Screens, Stacks } from '../../../../packages/core/src/types/navigators'

import { GradientBackground } from '../components'
import { DigiCredColors } from '../theme'

const ListCredentials: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<Record<string, object | undefined>>>()
  const [store, dispatch] = useStore()
  const { start, stop } = useTour()
  const screenIsFocused = useIsFocused()
  // The DigiCred custom tab bar (samples/app/digicred/components/TabBar.tsx)
  // is absolutely positioned with `bottom: 0` and a `height: 65` container,
  // wrapped in `paddingBottom: Math.max(insets.bottom, 16)`. React Navigation's
  // `useBottomTabBarHeight()` doesn't reflect that — it returns the platform
  // default (~49) — so we compute the real visual height ourselves from the
  // pieces we know about.
  const insets = useSafeAreaInsets()
  const tabBarVisualHeight = 65 + Math.max(insets.bottom, 16)
  const { records: connections } = useConnections()
  const connectionsMap: Record<string, ConnectionRecord> = {}
  connections.forEach((conn) => {
    if (conn.id) connectionsMap[conn.id] = conn
  })

  const [CredentialListOptions, , credentialListFooter, { enableTours: enableToursConfig, credentialHideList }] =
    useServices([
      TOKENS.COMPONENT_CRED_LIST_OPTIONS,
      TOKENS.COMPONENT_CRED_EMPTY_LIST,
      TOKENS.COMPONENT_CRED_LIST_FOOTER,
      TOKENS.CONFIG,
    ])

  const {
    openIdState: { w3cCredentialRecords, sdJwtVcRecords, openBadgeCredentialRecords, jsonLdCredentialRecords },
    refreshOpenBadgeCredentials,
    refreshJsonLdCredentials,
  } = useOpenIDCredentials()

  // Defensive refetch when this screen comes into focus.
  useEffect(() => {
    if (screenIsFocused) {
      refreshOpenBadgeCredentials().catch(() => undefined)
      refreshJsonLdCredentials().catch(() => undefined)
    }
  }, [screenIsFocused, refreshOpenBadgeCredentials, refreshJsonLdCredentials])

  let credentials: GenericCredentialExchangeRecord[] = [
    ...useCredentialByState(CredentialState.CredentialReceived),
    ...useCredentialByState(CredentialState.Done),
    ...w3cCredentialRecords,
    ...sdJwtVcRecords,
    ...openBadgeCredentialRecords,
    ...jsonLdCredentialRecords,
  ]

  const CredentialListFooter = credentialListFooter as React.FC<CredentialListFooterProps>

  if (!store.preferences.developerModeEnabled) {
    credentials = credentials.filter((r) => {
      const credDefId = r.metadata.get(AnonCredsCredentialMetadataKey)?.credentialDefinitionId
      return !credentialHideList?.includes(credDefId)
    })
  }

  useEffect(() => {
    const shouldShowTour = enableToursConfig && store.tours.enableTours && !store.tours.seenCredentialsTour

    if (shouldShowTour && screenIsFocused) {
      start(BaseTourID.CredentialsTour)
      dispatch({
        type: DispatchAction.UPDATE_SEEN_CREDENTIALS_TOUR,
        payload: [true],
      })
    }
  }, [enableToursConfig, store.tours.enableTours, store.tours.seenCredentialsTour, screenIsFocused, start, dispatch])

  useEffect(() => {
    return stop
  }, [stop])

  const handleScanPress = () => {
    navigation.navigate(Stacks.ConnectStack as string, { screen: Screens.Scan } as Record<string, unknown>)
  }

  const renderCardItem = (cred: GenericCredentialExchangeRecord) => {
    const connectionId = (cred as CredentialExchangeRecord).connectionId
    const connection = connectionId ? connectionsMap[connectionId] : undefined
    const logoUrl = connection?.imageUrl
    const credType = (cred as { type?: string }).type
    const isOpenBadge = credType === 'OpenBadgeCredentialRecord'
    const isJsonLd = credType === 'JsonLdCredentialRecord'

    return (
      <CredentialCard
        credential={cred as CredentialExchangeRecord}
        logoUrl={logoUrl}
        credentialErrors={
          (cred as CredentialExchangeRecord).revocationNotification?.revocationDate && [CredentialErrors.Revoked]
        }
        onPress={() => {
          if (isOpenBadge || isJsonLd) {
            // Both raw-JSON record types use the same details screen.
            navigation.navigate(Screens.OpenBadgeDetails, { credentialId: cred.id })
          } else if (cred instanceof W3cCredentialRecord) {
            navigation.navigate(Screens.OpenIDCredentialDetails, {
              credentialId: cred.id,
              type: OpenIDCredentialType.W3cCredential,
            })
          } else if (cred instanceof SdJwtVcRecord) {
            navigation.navigate(Screens.OpenIDCredentialDetails, {
              credentialId: cred.id,
              type: OpenIDCredentialType.SdJwtVc,
            })
          } else {
            navigation.navigate(Screens.CredentialDetails, { credentialId: cred.id })
          }
        }}
      />
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Icon name="card-multiple-outline" size={48} color={DigiCredColors.button.primary} />
      </View>
      <Text style={styles.emptyTitle}>No Credentials Yet</Text>
      <Text style={styles.emptySubtitle}>Connect with an organization to receive your first credential.</Text>
      <TouchableOpacity
        style={styles.scanActionButton}
        onPress={handleScanPress}
        testID={testIdWithKey('ScanToConnect')}
      >
        <Icon name="qrcode-scan" size={20} color="#FFFFFF" />
        <Text style={styles.scanActionButtonText}>Scan QR Code</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('Screens.Credentials') || 'Credentials'}</Text>
        </View>

        <FlatList
          data={credentials.sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf())}
          keyExtractor={(credential) => credential.id}
          renderItem={({ item: credential, index }) => (
            <View style={[styles.cardContainer, index === credentials.length - 1 && styles.lastCard]}>
              {renderCardItem(credential)}
            </View>
          )}
          // Shrink the FlatList's viewport by half the tab bar height so the
          // scroll area ends roughly at the vertical midpoint of the floating
          // tab bar — content can scroll behind the top half of the bar but
          // never below it.
          style={{ flex: 1, marginBottom: tabBarVisualHeight / 2 }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={() => <CredentialListFooter credentialsCount={credentials.length} />}
        />
        <CredentialListOptions />
      </View>
    </GradientBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: DigiCredColors.text.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  cardContainer: {
    marginTop: 15,
  },
  lastCard: {
    // Last-card margin no longer needed — FlatList paddingBottom is computed
    // from the tab bar height so the last card never tucks behind the bar.
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: -60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(30, 50, 50, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: DigiCredColors.text.primary,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    color: DigiCredColors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  scanActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DigiCredColors.button.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  scanActionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
})

export default ListCredentials
