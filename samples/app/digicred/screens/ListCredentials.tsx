import React, { useCallback, useEffect, useMemo } from 'react'
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
  MdocRecord,
  SdJwtVcRecord,
  W3cCredentialRecord,
} from '@credo-ts/core'
import { OpenBadgeCredentialRecord } from '@ajna-inc/openbadges'
import { JsonLdCredentialRecord } from '@bifold/core/src/modules/openid/jsonLd/JsonLdCredentialRecord'
import { useConnections, useCredentialByState } from '@credo-ts/react-hooks'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useStore, useTour, DispatchAction, testIdWithKey } from '@bifold/core'
import { useOpenIDCredentials } from '@bifold/core/src/modules/openid/context/OpenIDCredentialRecordProvider'
import { GenericCredentialExchangeRecord } from '@bifold/core/src/types/credentials'
import { OpenIDCredentialType } from '@bifold/core/src/modules/openid/types'
import { BaseTourID } from '@bifold/core/src/types/tour'
import { CredentialListFooterProps } from '@bifold/core/src/types/credential-list-footer'
import { getCredentialForDisplay } from '@bifold/core/src/modules/openid/display'
import {
  DCCredentialMark,
  DC_PALETTE,
  resolveDesign,
  type CardDesign,
} from '@bifold/core/src/modules/openid-card-design'
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
  // Stable identity — only rebuild when the connections list actually changes.
  // Without this, every render produces a new object and invalidates the row
  // memo + per-row useMemo, defeating the point of caching describeCredential.
  const connectionsMap = useMemo<Record<string, ConnectionRecord>>(() => {
    const map: Record<string, ConnectionRecord> = {}
    for (const conn of connections) {
      if (conn.id) map[conn.id] = conn
    }
    return map
  }, [connections])

  const [, , credentialListFooter, { enableTours: enableToursConfig, credentialHideList }] =
    useServices([
      TOKENS.COMPONENT_CRED_LIST_OPTIONS,
      TOKENS.COMPONENT_CRED_EMPTY_LIST,
      TOKENS.COMPONENT_CRED_LIST_FOOTER,
      TOKENS.CONFIG,
    ])

  const {
    openIdState: {
      w3cCredentialRecords,
      sdJwtVcRecords,
      mdocVcRecords,
      openBadgeCredentialRecords,
      jsonLdCredentialRecords,
    },
    refreshOpenBadgeCredentials,
    refreshJsonLdCredentials,
  } = useOpenIDCredentials()

  useEffect(() => {
    if (screenIsFocused) {
      refreshOpenBadgeCredentials().catch(() => undefined)
      refreshJsonLdCredentials().catch(() => undefined)
    }
  }, [screenIsFocused, refreshOpenBadgeCredentials, refreshJsonLdCredentials])

  const baseCredentialsReceived = useCredentialByState(CredentialState.CredentialReceived)
  const baseCredentialsDone = useCredentialByState(CredentialState.Done)

  const credentials: GenericCredentialExchangeRecord[] = useMemo(() => {
    const all: GenericCredentialExchangeRecord[] = [
      ...baseCredentialsReceived,
      ...baseCredentialsDone,
      ...w3cCredentialRecords,
      ...sdJwtVcRecords,
      ...mdocVcRecords,
      ...openBadgeCredentialRecords,
      ...jsonLdCredentialRecords,
    ]
    if (store.preferences.developerModeEnabled) return all
    return all.filter((r) => {
      const credDefId = r.metadata.get(AnonCredsCredentialMetadataKey)?.credentialDefinitionId
      return !credentialHideList?.includes(credDefId)
    })
  }, [
    baseCredentialsReceived,
    baseCredentialsDone,
    w3cCredentialRecords,
    sdJwtVcRecords,
    mdocVcRecords,
    openBadgeCredentialRecords,
    jsonLdCredentialRecords,
    store.preferences.developerModeEnabled,
    credentialHideList,
  ])

  const CredentialListFooter = credentialListFooter as React.FC<CredentialListFooterProps>

  useEffect(() => {
    const shouldShowTour = enableToursConfig && store.tours.enableTours && !store.tours.seenCredentialsTour
    if (shouldShowTour && screenIsFocused) {
      start(BaseTourID.CredentialsTour)
      dispatch({ type: DispatchAction.UPDATE_SEEN_CREDENTIALS_TOUR, payload: [true] })
    }
  }, [enableToursConfig, store.tours.enableTours, store.tours.seenCredentialsTour, screenIsFocused, start, dispatch])

  useEffect(() => stop, [stop])

  const handleScanPress = () => {
    navigation.navigate(Stacks.ConnectStack as string, { screen: Screens.Scan } as Record<string, unknown>)
  }

  const sortedCredentials = useMemo(
    () => [...credentials].sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf()),
    [credentials]
  )

  const navigateToDetail = useCallback((cred: GenericCredentialExchangeRecord) => {
    const credType = (cred as { type?: string }).type
    const isOpenBadge = credType === 'OpenBadgeCredentialRecord'
    const isJsonLd = credType === 'JsonLdCredentialRecord'
    if (isOpenBadge || isJsonLd) {
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
    } else if (cred instanceof MdocRecord) {
      navigation.navigate(Screens.OpenIDCredentialDetails, {
        credentialId: cred.id,
        type: OpenIDCredentialType.Mdoc,
      })
    } else {
      navigation.navigate(Screens.CredentialDetails, { credentialId: cred.id })
    }
  }, [navigation])

  const renderRow = useCallback(
    ({ item: credential }: { item: GenericCredentialExchangeRecord }) => (
      <CredentialListRow
        credential={credential}
        connectionsMap={connectionsMap}
        onPress={() => navigateToDetail(credential)}
      />
    ),
    [connectionsMap, navigateToDetail]
  )

  const renderFooter = useCallback(
    () => <CredentialListFooter credentialsCount={credentials.length} />,
    [CredentialListFooter, credentials.length]
  )

  const renderSeparator = useCallback(() => <View style={{ height: 10 }} />, [])

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
          <View>
            <Text style={styles.eyebrow}>MY WALLET</Text>
            <Text style={styles.headerTitle}>{t('Screens.Credentials') || 'Credentials'}</Text>
          </View>
          {sortedCredentials.length > 0 ? (
            <View style={styles.countPill}>
              <View style={styles.countDot} />
              <Text style={styles.countText}>{sortedCredentials.length} held</Text>
            </View>
          ) : null}
        </View>

        <FlatList
          data={sortedCredentials}
          keyExtractor={(credential) => credential.id}
          renderItem={renderRow}
          ItemSeparatorComponent={renderSeparator}
          // Keep the FlatList viewport ending at the vertical midpoint of the
          // floating tab bar (matches the mockup — content can scroll behind
          // the top half of the bar during mid-scroll). Then pad the content
          // by the other half + breathing room so the last card scrolls fully
          // above the tab bar when the user reaches the end.
          style={{ flex: 1, marginBottom: tabBarVisualHeight / 2 }}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: tabBarVisualHeight / 2 + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          removeClippedSubviews
          initialNumToRender={6}
          windowSize={5}
          maxToRenderPerBatch={6}
          updateCellsBatchingPeriod={50}
        />
      </View>
    </GradientBackground>
  )
}

// ---------------------------------------------------------------------------
// Row component — ports the Digicred mockup list row (screens.jsx:628-647)
// ---------------------------------------------------------------------------

interface CredentialListRowProps {
  credential: GenericCredentialExchangeRecord
  connectionsMap: Record<string, ConnectionRecord>
  onPress: () => void
}

const CredentialListRowInner: React.FC<CredentialListRowProps> = ({ credential, connectionsMap, onPress }) => {
  const { design, title, issuer, date, fallbackInitial } = useMemo(
    () => describeCredential(credential, connectionsMap),
    [credential, connectionsMap]
  )

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {design ? (
        <DCCredentialMark design={design} size={52} />
      ) : (
        <View style={[styles.markFallback, { width: 52, height: 52 }]}>
          <Text style={styles.markFallbackText}>{fallbackInitial}</Text>
        </View>
      )}

      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2} ellipsizeMode="tail">
          {title}
        </Text>
        <View style={styles.rowSubline}>
          <Text style={styles.rowIssuer} numberOfLines={1} ellipsizeMode="tail">
            {issuer}
          </Text>
          {date ? (
            <>
              <Text style={styles.rowDot}>·</Text>
              <Text style={styles.rowDate} numberOfLines={1}>
                {date}
              </Text>
            </>
          ) : null}
        </View>
      </View>

      <Icon name="chevron-right" size={20} color={DC_PALETTE.subMuted} />
    </TouchableOpacity>
  )
}

// Memoize on the credential record identity + connectionsMap identity. Both
// are now stable across parent renders (see useMemo + WeakMap caches), so
// scrolling re-renders the parent without doing per-row decode work.
const CredentialListRow = React.memo(CredentialListRowInner)

// Pull title / issuer / date out of whichever credential record we have.
// Falls back gracefully for AnonCreds, raw OID4VCI records, and JSON-LD.
function describeCredential(
  cred: GenericCredentialExchangeRecord,
  connectionsMap: Record<string, ConnectionRecord>
): { design: CardDesign | null; title: string; issuer: string; date?: string; fallbackInitial: string } {
  const design = (() => {
    try {
      return resolveDesign(cred as never)
    } catch {
      return null
    }
  })()

  let title = 'Credential'
  let issuer = ''
  let date: string | undefined

  try {
    // OID4VCI / JSON-LD / mDoc / SD-JWT: getCredentialForDisplay handles all of them.
    const isOID4VCI =
      cred instanceof W3cCredentialRecord ||
      cred instanceof SdJwtVcRecord ||
      cred instanceof MdocRecord ||
      cred instanceof OpenBadgeCredentialRecord ||
      cred instanceof JsonLdCredentialRecord ||
      (cred as { type?: string }).type === 'OpenBadgeCredentialRecord' ||
      (cred as { type?: string }).type === 'JsonLdCredentialRecord'
    if (isOID4VCI) {
      const display = getCredentialForDisplay(cred as never)
      title = display?.display?.name ?? title
      issuer = display?.display?.issuer?.name ?? ''
    } else if (cred instanceof CredentialExchangeRecord) {
      // AnonCreds: lean on the connection's label for the issuer, schema name
      // (if present in metadata) for the title.
      const meta = cred.metadata.get(AnonCredsCredentialMetadataKey) as
        | { schemaName?: string; credentialDefinitionId?: string }
        | undefined
      title = meta?.schemaName ?? meta?.credentialDefinitionId ?? title
      const connection = cred.connectionId ? connectionsMap[cred.connectionId] : undefined
      issuer = connection?.theirLabel ?? connection?.alias ?? ''
    }
  } catch {
    /* swallow — keep defaults */
  }

  // Date line — match the mockup's "Issued DD MMM YYYY".
  try {
    const created = cred.createdAt instanceof Date ? cred.createdAt : new Date(cred.createdAt)
    if (!Number.isNaN(created.getTime())) {
      date = `Issued ${created.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}`
    }
  } catch {
    /* swallow */
  }

  const fallbackInitial = (title.charAt(0) || '?').toUpperCase()
  return { design, title, issuer: issuer || 'Unknown issuer', date, fallbackInitial }
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 14,
  },
  eyebrow: {
    color: DC_PALETTE.muted,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(125,224,213,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(125,224,213,0.25)',
  },
  countDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DC_PALETTE.accent,
    marginRight: 6,
  },
  countText: { color: DC_PALETTE.accent, fontSize: 11, fontWeight: '600' },

  listContent: { paddingHorizontal: 18, paddingTop: 4, flexGrow: 1 },

  // Row card
  row: {
    backgroundColor: DC_PALETTE.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DC_PALETTE.cardBorder,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  markFallback: {
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markFallbackText: { color: '#FFFFFF', fontWeight: '700', fontSize: 20 },
  rowBody: { flex: 1, minWidth: 0, marginLeft: 14, marginRight: 8 },
  rowTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 19,
  },
  rowSubline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rowIssuer: {
    color: DC_PALETTE.muted,
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
    maxWidth: 160,
  },
  rowDot: { color: DC_PALETTE.muted, fontSize: 12, opacity: 0.5, marginHorizontal: 6 },
  rowDate: { color: DC_PALETTE.muted, fontSize: 12, fontWeight: '500' },

  // Empty state
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
