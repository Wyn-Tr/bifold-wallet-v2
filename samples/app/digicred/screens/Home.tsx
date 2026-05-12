import React, { useCallback, useMemo, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
  Platform,
} from 'react-native'
import { useNavigation, useIsFocused } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { CommonActions } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useConnections, useCredentials } from '@credo-ts/react-hooks'
import { ConnectionType, CredentialState, DidExchangeState } from '@credo-ts/core'

import {
  testIdWithKey,
  useStore,
  getConnectionName,
  ColorPalette,
  useConnectionImageUrl,
  useConnectionUserProfile,
} from '@bifold/core'
import { useOpenIDCredentials } from '@bifold/core/src/modules/openid/context/OpenIDCredentialRecordProvider'
import { useWorkflowSubtitles } from '../../../../packages/core/src/hooks/useWorkflowSubtitles'

import { GradientBackground } from '../components'
import { DigiCredColors } from '../theme'
import { TOKENS, useServices } from '../../../../packages/core/src/container-api'
import { Screens, Stacks } from '../../../../packages/core/src/types/navigators'

interface ContactCardProps {
  name: string
  time: string
  subtitle?: string
  hasNotification?: boolean
  imageUrl?: string
  onPress: () => void
}

const ContactCard: React.FC<ContactCardProps> = ({ name, time, subtitle, hasNotification, imageUrl, onPress }) => {
  const { t } = useTranslation()
  const screenWidth = Dimensions.get('window').width

  return (
    <View style={[styles.contactCardContainer, { width: screenWidth * 0.9 }]}>
      <TouchableOpacity style={styles.contactCard} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.contactAvatar}>
          <View style={styles.avatarBackground}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.contactContent}>
          <View style={styles.textContainer}>
            <Text style={styles.contactName} numberOfLines={2}>
              {name}
            </Text>
            {subtitle && (
              <Text style={styles.workflowSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
            <Text style={styles.contactTime}>{time}</Text>
            {hasNotification && <Text style={styles.notificationText}>{t('Home.NotificationPreview')}</Text>}
          </View>

          <View style={styles.rightSection}>
            {hasNotification && <View style={styles.notificationDot} />}
            <Icon name="chevron-right" size={24} color={ColorPalette.grayscale.white} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  )
}

const Home: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<Record<string, object | undefined>>>()
  const isFocused = useIsFocused()
  const [store] = useStore()
  const [config] = useServices([TOKENS.CONFIG])
  const contactHideList = config?.contactHideList
  const { records: credentials = [] } = useCredentials()
  const {
    openIdState: { w3cCredentialRecords, sdJwtVcRecords, openBadgeCredentialRecords, jsonLdCredentialRecords },
  } = useOpenIDCredentials()
  const hasOpenIdCredentials =
    w3cCredentialRecords.length > 0 ||
    sdJwtVcRecords.length > 0 ||
    openBadgeCredentialRecords.length > 0 ||
    jsonLdCredentialRecords.length > 0
  const [hadContacts, setHadContacts] = useState(false)

  const connectionsResult = useConnections()
  const { records: connections = [] } = connectionsResult ?? { records: [] }

  const filteredConnections = useMemo(() => {
    if (!connections || !Array.isArray(connections)) return []
    return connections.filter((connection) => {
      if (connection.connectionTypes.includes(ConnectionType.Mediator)) {
        return false
      }
      const contactName = connection.theirLabel || connection.alias
      if (contactHideList?.includes(contactName ?? '')) {
        return false
      }
      if (!store.preferences.developerModeEnabled && connection.state !== DidExchangeState.Completed) {
        return false
      }
      return true
    })
  }, [connections, contactHideList, store.preferences.developerModeEnabled])

  useEffect(() => {
    if (filteredConnections.length > 0) {
      setHadContacts(true)
    }
  }, [filteredConnections])

  useEffect(() => {
    // Only fall back to the welcome screen if the wallet is genuinely empty —
    // no contacts AND no OID4VCI credentials. Otherwise a user who only has
    // JSON-LD / SD-JWT / OpenBadge credentials (no DIDComm contacts) gets
    // pushed back to the onboarding-style welcome flow.
    if (isFocused && hadContacts && filteredConnections.length === 0 && !hasOpenIdCredentials) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: Stacks.HomeNoChannelStack }],
        })
      )
    }
  }, [filteredConnections, navigation, hadContacts, isFocused, hasOpenIdCredentials])

  const handleScanPress = useCallback(() => {
    navigation.navigate(Stacks.ConnectStack as string, { screen: Screens.Scan } as Record<string, unknown>)
  }, [navigation])

  const handleContactPress = useCallback(
    (connectionId: string) => {
      navigation.navigate(Screens.Chat, { connectionId })
    },
    [navigation]
  )

  const formatTime = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const sortedConnections = useMemo(() => {
    return [...filteredConnections].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime()
      const dateB = new Date(b.updatedAt || b.createdAt).getTime()
      return dateB - dateA
    })
  }, [filteredConnections])

  const connectionIds = useMemo(() => sortedConnections.map((c) => c.id), [sortedConnections])
  const { subtitles: workflowSubtitles } = useWorkflowSubtitles(connectionIds)

  const ContactRow: React.FC<{ item: (typeof sortedConnections)[0] }> = ({ item }) => {
    const profile = useConnectionUserProfile(item.id)
    const imageUrl = useConnectionImageUrl(item.id)
    const contactName =
      getConnectionName(item, store.preferences.alternateContactNames, profile) || t('Home.UnknownContact')
    const hasOfferReceived = credentials.some(
      (c) => c.state === CredentialState.OfferReceived && c.connectionId === item.id
    )
    const subtitle = workflowSubtitles.get(item.id) ?? profile?.description

    return (
      <ContactCard
        name={contactName}
        time={formatTime((item.updatedAt || item.createdAt).toISOString())}
        subtitle={subtitle}
        hasNotification={hasOfferReceived}
        imageUrl={imageUrl}
        onPress={() => handleContactPress(item.id)}
      />
    )
  }

  const renderContact = ({ item }: { item: (typeof sortedConnections)[0] }) => <ContactRow item={item} />

  return (
    <>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <GradientBackground>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('Screens.Home')}</Text>
            <TouchableOpacity
              style={styles.newChannelButton}
              onPress={handleScanPress}
              testID={testIdWithKey('NewChannelButton')}
              accessibilityLabel={t('Home.NewChannel')}
            >
              <Text style={styles.newChannelText}>{t('Home.NewChannel')}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={sortedConnections}
            renderItem={renderContact}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </GradientBackground>
    </>
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
  newChannelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#004D4D',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#14FFEC',
  },
  newChannelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  contactCardContainer: {
    marginBottom: 12,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 125,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2F2F2F',
    paddingHorizontal: 20,
    backgroundColor: '#25272A',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 0.32,
        shadowRadius: 10,
      },
      android: {
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 0.32,
        shadowRadius: 10,
        elevation: 5,
      },
    }),
  },
  contactAvatar: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: ColorPalette.grayscale.white,
    padding: 2,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#14FFEC',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
  },
  contactContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    marginLeft: 10,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: DigiCredColors.text.primary,
    lineHeight: 20,
  },
  workflowSubtitle: {
    fontSize: 12,
    color: '#8A9A9A',
  },
  contactTime: {
    fontSize: 11,
    color: ColorPalette.grayscale.white,
    marginTop: 2,
  },
  notificationText: {
    fontSize: 12,
    color: ColorPalette.grayscale.white,
    marginTop: 4,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  notificationDot: {
    position: 'absolute',
    top: -25,
    left: 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#14FFEC',
    marginRight: 8,
    borderWidth: 1,
    borderColor: ColorPalette.grayscale.white,
  },
})

export default Home