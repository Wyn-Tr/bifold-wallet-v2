import { AnonCredsCredentialMetadataKey } from '@credo-ts/anoncreds'
import { ConnectionRecord, CredentialExchangeRecord, CredentialState, SdJwtVcRecord, W3cCredentialRecord } from '@credo-ts/core'
import { useConnections, useCredentialByState } from '@credo-ts/react-hooks'
import { useNavigation, useIsFocused } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { View, FlatList } from 'react-native'

import CredentialCard from '../components/misc/CredentialCard'
import { OpenIDCardRenderer, resolveDesign } from '../modules/openid-card-design'
import { DispatchAction } from '../contexts/reducers/store'
import { useStore } from '../contexts/store'
import { useTheme } from '../contexts/theme'
import { useTour } from '../contexts/tour/tour-context'
import { RootStackParams, Screens } from '../types/navigators'
import { TOKENS, useServices } from '../container-api'
import { EmptyListProps } from '../components/misc/EmptyList'
import { CredentialListFooterProps } from '../types/credential-list-footer'
import { useOpenIDCredentials } from '../modules/openid/context/OpenIDCredentialRecordProvider'
import { CredentialErrors, GenericCredentialExchangeRecord } from '../types/credentials'
import { BaseTourID } from '../types/tour'
import { OpenIDCredentialType } from '../modules/openid/types'

const ListCredentials: React.FC = () => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore()
  const [
    CredentialListOptions,
    credentialEmptyList,
    credentialListFooter,
    { enableTours: enableToursConfig, credentialHideList },
  ] = useServices([
    TOKENS.COMPONENT_CRED_LIST_OPTIONS,
    TOKENS.COMPONENT_CRED_EMPTY_LIST,
    TOKENS.COMPONENT_CRED_LIST_FOOTER,
    TOKENS.CONFIG,
  ])
  const navigation = useNavigation<StackNavigationProp<RootStackParams>>()
  const { ColorPalette } = useTheme()
  const { start, stop } = useTour()
  const screenIsFocused = useIsFocused()
  const { records: connections } = useConnections()
  const connectionsMap: Record<string, ConnectionRecord> = {}
  connections.forEach((conn) => {
    if (conn.id) connectionsMap[conn.id] = conn
  })

  const {
    openIdState: { w3cCredentialRecords, sdJwtVcRecords, openBadgeCredentialRecords, jsonLdCredentialRecords },
    refreshOpenBadgeCredentials,
  } = useOpenIDCredentials()

  // Defensive refetch when this screen comes into focus. Subscriptions usually
  // keep the list current, but a missed event would otherwise leave the list
  // out of sync until app relaunch.
  useEffect(() => {
    if (screenIsFocused) {
      refreshOpenBadgeCredentials().catch(() => undefined)
    }
  }, [screenIsFocused, refreshOpenBadgeCredentials])

  const credsReceived = useCredentialByState(CredentialState.CredentialReceived)
  const credsDone = useCredentialByState(CredentialState.Done)
  let credentials: GenericCredentialExchangeRecord[] = [
    ...credsReceived,
    ...credsDone,
    ...w3cCredentialRecords,
    ...sdJwtVcRecords,
    ...openBadgeCredentialRecords,
    ...jsonLdCredentialRecords,
  ]

  const CredentialEmptyList = credentialEmptyList as React.FC<EmptyListProps>
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

  // stop the tour when the screen unmounts
  useEffect(() => {
    return stop
  }, [stop])

  const renderCardItem = (cred: GenericCredentialExchangeRecord) => {
    const connectionId = 'connectionId' in cred ? cred.connectionId : undefined
    const logoUrl = connectionId ? connectionsMap[connectionId]?.imageUrl?.trim() : undefined
    const credType = (cred as { type?: string }).type
    const isOpenBadge = credType === 'OpenBadgeCredentialRecord'
    const isJsonLd = credType === 'JsonLdCredentialRecord'

    const navigate = () => {
      if (isOpenBadge) {
        navigation.navigate(Screens.OpenIDCredentialDetails, {
          credentialId: cred.id,
          type: OpenIDCredentialType.OpenBadge,
        })
      } else if (isJsonLd) {
        navigation.navigate(Screens.OpenIDCredentialDetails, {
          credentialId: cred.id,
          type: OpenIDCredentialType.JsonLd,
        })
      } else if (credType === 'W3cCredentialRecord' || cred instanceof W3cCredentialRecord) {
        navigation.navigate(Screens.OpenIDCredentialDetails, {
          credentialId: cred.id,
          type: OpenIDCredentialType.W3cCredential,
        })
      } else if (credType === 'SdJwtVcRecord' || cred instanceof SdJwtVcRecord) {
        navigation.navigate(Screens.OpenIDCredentialDetails, {
          credentialId: cred.id,
          type: OpenIDCredentialType.SdJwtVc,
        })
      } else {
        navigation.navigate(Screens.CredentialDetails, { credentialId: cred.id })
      }
    }

    // OID4VCI credentials whose attribute shape matches a known design get a
    // branded card row. AnonCreds (CredentialExchangeRecord) always falls
    // through to the generic CredentialCard — its custom SVG path lives in
    // CredentialDetails, not here.
    if (isOpenBadge || isJsonLd || credType === 'W3cCredentialRecord' || credType === 'SdJwtVcRecord' || credType === 'MdocRecord') {
      const design = resolveDesign(cred as any)
      if (design) {
        return (
          <View style={{ marginHorizontal: 14, marginVertical: 8 }}>
            <OpenIDCardRenderer credentialRecord={cred as any} design={design} mode="compact" onPress={navigate} />
          </View>
        )
      }
    }

    return (
      <CredentialCard
        credential={cred as CredentialExchangeRecord}
        credentialErrors={
          (cred as CredentialExchangeRecord).revocationNotification?.revocationDate && [CredentialErrors.Revoked]
        }
        logoUrl={logoUrl}
        onPress={navigate}
      />
    )
  }

  const sortedCredentials = credentials.sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf())

  return (
    <View style={{ flex: 1}}>
      <FlatList
        style={{ backgroundColor: ColorPalette.brand.primaryBackground }}
        data={sortedCredentials}
        keyExtractor={(credential) => credential.id}
        renderItem={({ item: credential, index }) => {
          return (
            <View
              style={{
                marginHorizontal: 15,
                marginTop: 15,
                marginBottom: index === credentials.length - 1 ? 45 : 0,
              }}
            >
              {renderCardItem(credential)}
            </View>
          )
        }}
        ListEmptyComponent={() => <CredentialEmptyList message={t('ListCredentials.EmptyList')} />}
        ListFooterComponent={() => <CredentialListFooter credentialsCount={credentials.length} />}
      />
      <CredentialListOptions />
    </View>
  )
}

export default ListCredentials
