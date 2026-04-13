import { ConnectionRecord } from '@credo-ts/core'
import { useConnectionById } from '@credo-ts/react-hooks'
import { useIsFocused, useNavigation } from '@react-navigation/native'
import { useHeaderHeight } from '@react-navigation/elements'
import { StackNavigationProp, StackScreenProps } from '@react-navigation/stack'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Dimensions,
  GestureResponderEvent,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'

import { ThemedText } from '../components/texts/ThemedText'
import { useStore } from '../contexts/store'
import { useWorkflows } from '../hooks/useWorkflows'
import { RootStackParams, ContactStackParams, Screens, Stacks } from '../types/navigators'
import {
  getConnectionName,
  pictureToDataUrl,
  useConnectionUserProfile,
} from '../utils/helpers'
import { TOKENS, useServices } from '../container-api'

type ChatProps = StackScreenProps<ContactStackParams, Screens.Chat> | StackScreenProps<RootStackParams, Screens.Chat>

type AnchorRect = { x: number; y: number; w: number; h: number }

const Chat: React.FC<ChatProps> = ({ route }) => {
  if (!route?.params) throw new Error('Chat route params were not set properly')

  const { connectionId } = route.params
  const [store] = useStore()
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<RootStackParams | ContactStackParams>>()

  const connection = useConnectionById(connectionId) as ConnectionRecord
  const peerProfile = useConnectionUserProfile(connectionId)
  const isFocused = useIsFocused()

  const [theirLabel, setTheirLabel] = useState(
    getConnectionName(connection, store.preferences.alternateContactNames, peerProfile)
  )

  const headerHeight = useHeaderHeight()
  const insets = useSafeAreaInsets()
  const windowWidth = Dimensions.get('window').width

  const [GradientBackground] = useServices([TOKENS.COMPONENT_GRADIENT_BACKGROUND])

  const { instances: workflowInstances } = useWorkflows(connectionId)

  const sortedWorkflows = useMemo(() => {
    return [...workflowInstances].sort((a, b) => {
      const aDate = new Date((a as any).updatedAt ?? (a as any).createdAt ?? 0).valueOf()
      const bDate = new Date((b as any).updatedAt ?? (b as any).createdAt ?? 0).valueOf()
      return bDate - aDate
    })
  }, [workflowInstances])

  const channelDescription = useMemo(() => {
    // Prefer peer user-profile description (2060 user-profile module metadata)
    if (peerProfile?.description) return peerProfile.description

    // Try DID Document metadata next
    const metadataGet = (connection as any)?.metadata?.get
    const didDocMeta =
      typeof metadataGet === 'function'
        ? metadataGet.call((connection as any).metadata, 'didDocument') ??
          metadataGet.call((connection as any).metadata, 'DidDocument')
        : (connection as any)?.metadata?.didDocument

    if (didDocMeta?.description && typeof didDocMeta.description === 'string') return didDocMeta.description
    if (didDocMeta?.service?.[0]?.serviceEndpoint && typeof didDocMeta.service[0].serviceEndpoint === 'string') {
      return didDocMeta.service[0].serviceEndpoint
    }

    // Fall back to connection fields
    const alias = (connection as any)?.alias
    if (alias && typeof alias === 'string' && alias !== (connection as any)?.theirLabel) return alias

    const theirDid = (connection as any)?.theirDid
    if (theirDid && typeof theirDid === 'string') return theirDid

    return t('ContactDetails.NoDescription') || 'No description available from DID Document metadata'
  }, [connection, peerProfile, t])

  const [isOverflowOpen, setIsOverflowOpen] = useState(false)
  const [overflowAnchor, setOverflowAnchor] = useState<AnchorRect | null>(null)

  const closeOverflowMenu = useCallback(() => {
    setIsOverflowOpen(false)
  }, [])

  const openOverflowMenuAtEvent = useCallback(
    (e?: GestureResponderEvent) => {
      if (e?.nativeEvent) {
        const { pageX, pageY } = e.nativeEvent
        setOverflowAnchor({ x: pageX - 20, y: pageY - 20, w: 40, h: 40 })
      } else {
        setOverflowAnchor({ x: windowWidth - 48, y: insets.top + headerHeight - 20, w: 40, h: 40 })
      }
      setIsOverflowOpen(true)
    },
    [insets.top, headerHeight, windowWidth]
  )

  const onInformationPress = useCallback(() => {
    closeOverflowMenu()
    navigation.navigate(Stacks.ContactStack as any, {
      screen: Screens.ContactDetails,
      params: { connectionId },
    })
  }, [closeOverflowMenu, navigation, connectionId])

  const onNewWorkflowPress = useCallback(() => {
    navigation.navigate(Stacks.ContactStack as any, {
      screen: Screens.WorkflowTemplatePicker,
      params: { connectionId },
    })
  }, [navigation, connectionId])

  const onWorkflowInstancePress = useCallback(
    (instanceId: string) => {
      navigation.navigate(Stacks.ContactStack as any, {
        screen: Screens.WorkflowDetails,
        params: { instanceId },
      })
    },
    [navigation]
  )

  useEffect(() => {
    setTheirLabel(getConnectionName(connection, store.preferences.alternateContactNames, peerProfile))
  }, [isFocused, connection, store.preferences.alternateContactNames, peerProfile])

  useEffect(() => {
    const logoUrl =
      pictureToDataUrl(peerProfile?.displayPicture ?? undefined) ||
      pictureToDataUrl(peerProfile?.displayIcon ?? undefined) ||
      connection?.imageUrl
    navigation.setOptions({
      headerStyle: { backgroundColor: '#005F5F' },
      headerTintColor: '#FFFFFF',
      headerTitleAlign: 'center',
      headerTitle: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              style={{ width: 28, height: 28, borderRadius: 6, marginRight: 8 }}
            />
          ) : (
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                marginRight: 8,
                backgroundColor: '#14FFEC',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#000', fontWeight: '700' }}>
                {(theirLabel || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text
            numberOfLines={1}
            style={{ fontSize: 18, fontWeight: '600', color: '#FFFFFF', maxWidth: windowWidth * 0.5 }}
          >
            {theirLabel}
          </Text>
        </View>
      ),
      headerLeft: () => (
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityLabel={t('Global.Back') ?? 'Back'}
          style={{ padding: 8, marginLeft: Platform.OS === 'ios' ? 16 : 0, zIndex: 10 }}
        >
          <MaterialCommunityIcon name="chevron-left" size={32} color="#FFFFFF" />
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={(e) => openOverflowMenuAtEvent(e)}
          accessibilityLabel={t('Global.MoreOptions') ?? 'More options'}
          style={{
            padding: 8,
            zIndex: 1,
            marginRight: 26,
            marginLeft: Platform.OS === 'ios' ? -26 : -50,
            marginTop: Platform.OS === 'ios' ? -3 : 0,
          }}
        >
          <MaterialCommunityIcon name="menu" size={28} color="#FFFFFF" />
        </Pressable>
      ),
    })
  }, [
    navigation,
    theirLabel,
    openOverflowMenuAtEvent,
    t,
    connection?.imageUrl,
    peerProfile,
    windowWidth,
  ])

  const menuStyle = useMemo(() => {
    const GAP = 8
    const fallbackTop = insets.top + headerHeight + GAP
    if (!overflowAnchor) {
      return { position: 'absolute' as const, top: fallbackTop, right: GAP }
    }
    const menuTop = overflowAnchor.y
    const menuRight = windowWidth - overflowAnchor.x - 40
    return { position: 'absolute' as const, top: menuTop, right: menuRight }
  }, [insets.top, headerHeight, overflowAnchor, windowWidth])

  const overflowMenu = (
    <Modal visible={isOverflowOpen} transparent animationType="fade" onRequestClose={closeOverflowMenu}>
      <Pressable style={{ flex: 1 }} onPress={closeOverflowMenu}>
        <View style={[menuStyle]}>
          <View
            style={{
              backgroundColor: '#1F1F1F',
              borderRadius: 12,
              paddingVertical: 8,
              minWidth: 200,
              shadowOpacity: 0.25,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
              marginTop: Platform.OS === 'ios' ? 50 : 0,
            }}
          >
            <Pressable
              onPress={onInformationPress}
              accessibilityRole="button"
              accessibilityLabel={t('Global.Information') ?? 'Information'}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 10,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16 }}>{t('Global.Information') ?? 'Information'}</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  )

  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1 }}>
      {overflowMenu}
      <GradientBackground>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Channel Description Card */}
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 16,
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
              backgroundColor: 'rgba(255,255,255,0.04)',
            }}
          >
            <ThemedText variant="headingThree" style={{ color: '#FFFFFF', marginBottom: 4 }}>
              {t('ContactDetails.ChannelDescription') || 'Channel Description'}
            </ThemedText>
            <ThemedText style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              {channelDescription}
            </ThemedText>
          </View>

          {/* New Workflow Button (right-aligned pill) */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, marginTop: 16 }}>
            <TouchableOpacity
              onPress={onNewWorkflowPress}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 22,
                borderWidth: 1.5,
                borderColor: '#14FFEC',
                backgroundColor: 'transparent',
              }}
              accessibilityRole="button"
            >
              <MaterialCommunityIcon name="plus" size={18} color="#14FFEC" />
              <Text style={{ color: '#14FFEC', fontWeight: '600', fontSize: 14, marginLeft: 6 }}>
                {t('ContactDetails.NewWorkflow') || 'New Workflow'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Name | State column headers */}
          <View
            style={{
              flexDirection: 'row',
              marginHorizontal: 16,
              marginTop: 16,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                flex: 1,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRightWidth: 1,
                borderRightColor: 'rgba(255,255,255,0.15)',
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <ThemedText variant="labelTitle" style={{ color: '#FFFFFF' }}>
                {t('ContactDetails.Name') || 'Name'}
              </ThemedText>
            </View>
            <View
              style={{
                width: 120,
                paddingVertical: 10,
                paddingHorizontal: 12,
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <ThemedText variant="labelTitle" style={{ color: '#FFFFFF' }}>
                {t('ContactDetails.State') || 'State'}
              </ThemedText>
            </View>
          </View>

          {/* Workflow instances list */}
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 4,
              borderWidth: 1,
              borderTopWidth: 0,
              borderColor: 'rgba(255,255,255,0.15)',
              borderBottomLeftRadius: 8,
              borderBottomRightRadius: 8,
              overflow: 'hidden',
            }}
          >
            {sortedWorkflows.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <ThemedText style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>
                  {t('ContactDetails.NoWorkflows') || 'No workflow instances yet'}
                </ThemedText>
              </View>
            ) : (
              sortedWorkflows.map((item, idx) => {
                const inst = item as any
                const state = (inst.state ?? '')
                  .replace(/[-_]/g, ' ')
                  .replace(/\b\w/g, (c: string) => c.toUpperCase())
                const name = (inst.templateId ?? '')
                  .replace(/[-_]/g, ' ')
                  .replace(/\b\w/g, (c: string) => c.toUpperCase())
                return (
                  <TouchableOpacity
                    key={inst.instanceId ?? idx}
                    onPress={() => onWorkflowInstancePress(inst.instanceId)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderBottomWidth: idx < sortedWorkflows.length - 1 ? 1 : 0,
                      borderBottomColor: 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        paddingVertical: 14,
                        paddingHorizontal: 12,
                        borderRightWidth: 1,
                        borderRightColor: 'rgba(255,255,255,0.08)',
                      }}
                    >
                      <ThemedText numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 14 }}>
                        {name}
                      </ThemedText>
                    </View>
                    <View style={{ width: 120, paddingVertical: 14, paddingHorizontal: 12 }}>
                      <ThemedText
                        numberOfLines={1}
                        style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}
                      >
                        {state}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                )
              })
            )}
          </View>
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  )
}

export default Chat
