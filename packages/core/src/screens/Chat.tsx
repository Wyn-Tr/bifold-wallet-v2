import { BasicMessageRepository, ConnectionRecord } from '@credo-ts/core'
import { useAgent, useBasicMessagesByConnectionId, useConnectionById } from '@credo-ts/react-hooks'
import { useIsFocused, useNavigation } from '@react-navigation/native'
import { useHeaderHeight } from '@react-navigation/elements'
import { StackNavigationProp, StackScreenProps } from '@react-navigation/stack'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GiftedChat, IMessage } from 'react-native-gifted-chat'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Dimensions,
  GestureResponderEvent,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'

import { renderComposer, renderSend } from '../components/chat'
import ActionSlider from '../components/chat/ActionSlider'
import { ChatMessage } from '../components/chat/ChatMessage'
import { ThemedText } from '../components/texts/ThemedText'
import { useNetwork } from '../contexts/network'
import { useStore } from '../contexts/store'
import { useTheme } from '../contexts/theme'
import { useChatMessagesByConnection } from '../hooks/chat-messages'
import { useConnectionWorkflowSupport } from '../hooks/useConnectionWorkflowSupport'
import { useWorkflows } from '../hooks/useWorkflows'
import { useOptionalWorkflowRegistry, ActionContext, WorkflowAction } from '../modules/workflow'
import { Role } from '../types/chat'
import { BasicMessageMetadata, basicMessageCustomMetadata } from '../types/metadata'
import { RootStackParams, ContactStackParams, Screens, Stacks } from '../types/navigators'
import {
  getConnectionName,
  pictureToDataUrl,
  useConnectionUserProfile,
} from '../utils/helpers'
import { TOKENS, useServices } from '../container-api'

type ChatProps = StackScreenProps<ContactStackParams, Screens.Chat> | StackScreenProps<RootStackParams, Screens.Chat>

type AnchorRect = { x: number; y: number; w: number; h: number }

const swallow = (..._args: unknown[]) => {
  void _args
}

const Chat: React.FC<ChatProps> = ({ route }) => {
  if (!route?.params) throw new Error('Chat route params were not set properly')

  const { connectionId } = route.params
  const [store] = useStore()
  const { t } = useTranslation()
  const { agent } = useAgent()
  const navigation = useNavigation<StackNavigationProp<RootStackParams | ContactStackParams>>()

  const connection = useConnectionById(connectionId) as ConnectionRecord
  const peerProfile = useConnectionUserProfile(connectionId)
  const isFocused = useIsFocused()

  const basicMessages = useBasicMessagesByConnectionId(connectionId)
  const {
    messages: chatMessages,
    canLoadEarlier,
    isLoadingEarlier,
    loadEarlier,
  } = useChatMessagesByConnection(connection)

  const { silentAssertConnectedNetwork, assertNetworkConnected } = useNetwork()
  const { ChatTheme: theme, Assets } = useTheme()

  const { supported: workflowsSupported } = useConnectionWorkflowSupport(connectionId)
  const { instances: workflowInstances } = useWorkflows(connectionId)

  // Workflow-capable peers get a dedicated workflow view (no chat tab).
  // Everyone else gets the chat. There's no two-tab in-between — a peer is
  // either a workflow system or a conversational one.
  const showWorkflowView = workflowsSupported === true

  const [showActionSlider, setShowActionSlider] = useState(false)

  const [theirLabel, setTheirLabel] = useState(
    getConnectionName(connection, store.preferences.alternateContactNames, peerProfile)
  )

  const headerHeight = useHeaderHeight()
  const insets = useSafeAreaInsets()
  const windowWidth = Dimensions.get('window').width

  const [GradientBackground] = useServices([TOKENS.COMPONENT_GRADIENT_BACKGROUND])
  const registry = useOptionalWorkflowRegistry()

  const sortedWorkflows = useMemo(() => {
    return [...workflowInstances].sort((a, b) => {
      const aDate = new Date((a as any).updatedAt ?? (a as any).createdAt ?? 0).valueOf()
      const bDate = new Date((b as any).updatedAt ?? (b as any).createdAt ?? 0).valueOf()
      return bDate - aDate
    })
  }, [workflowInstances])

  // Avatar source — only render the image element when we actually have one.
  // Never fall back to a generic placeholder; the user explicitly asked for
  // "show the profile only if it exists".
  const avatarUri = useMemo(() => {
    return (
      pictureToDataUrl(peerProfile?.displayPicture ?? undefined) ||
      pictureToDataUrl(peerProfile?.displayIcon ?? undefined) ||
      connection?.imageUrl ||
      null
    )
  }, [peerProfile, connection?.imageUrl])

  // Channel description — only return a real value (no DID-peer fallback).
  // Returns null when nothing meaningful is available so the description card
  // can be hidden entirely.
  const channelDescription = useMemo<string | null>(() => {
    if (peerProfile?.description && typeof peerProfile.description === 'string') {
      return peerProfile.description
    }
    const metadataGet = (connection as any)?.metadata?.get
    const didDocMeta =
      typeof metadataGet === 'function'
        ? metadataGet.call((connection as any).metadata, 'didDocument') ??
          metadataGet.call((connection as any).metadata, 'DidDocument')
        : (connection as any)?.metadata?.didDocument
    if (didDocMeta?.description && typeof didDocMeta.description === 'string') return didDocMeta.description
    const alias = (connection as any)?.alias
    if (alias && typeof alias === 'string' && alias !== (connection as any)?.theirLabel) return alias
    return null
  }, [connection, peerProfile])

  const [isOverflowOpen, setIsOverflowOpen] = useState(false)
  const [overflowAnchor, setOverflowAnchor] = useState<AnchorRect | null>(null)

  const closeOverflowMenu = useCallback(() => setIsOverflowOpen(false), [])

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

  const onRestartSessionPress = useCallback(async () => {
    closeOverflowMenu()
    setShowActionSlider(false)
    try {
      await agent?.basicMessages.sendMessage(connectionId, ':menu')
    } catch (e) {
      swallow(e)
    }
  }, [agent, closeOverflowMenu, connectionId])

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
    assertNetworkConnected()
  }, [assertNetworkConnected])

  // Mark received basic messages as seen so the unread count drops.
  useEffect(() => {
    basicMessages.forEach((msg) => {
      const meta = msg.metadata.get(BasicMessageMetadata.customMetadata) as basicMessageCustomMetadata
      if (agent && !meta?.seen) {
        msg.metadata.set(BasicMessageMetadata.customMetadata, { ...meta, seen: true })
        const repo = agent.context.dependencyManager.resolve(BasicMessageRepository)
        repo.update(agent.context, msg)
      }
    })
  }, [basicMessages, agent])

  useEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: '#005F5F' },
      headerTintColor: '#FFFFFF',
      headerTitleAlign: 'center',
      headerTitle: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={{ width: 28, height: 28, borderRadius: 6, marginRight: 8 }}
            />
          ) : null}
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
  }, [navigation, theirLabel, openOverflowMenuAtEvent, t, avatarUri, windowWidth])

  const onSend = useCallback(
    async (messages: IMessage[]) => {
      try {
        await agent?.basicMessages.sendMessage(connectionId, messages[0].text)
      } catch (e) {
        swallow(e)
      }
    },
    [agent, connectionId]
  )

  const onSendRequest = useCallback(async () => {
    navigation.navigate(Stacks.ProofRequestsStack as any, {
      screen: Screens.ProofRequests,
      params: { connectionId },
    })
  }, [navigation, connectionId])

  const actionContext: ActionContext | undefined = useMemo(() => {
    if (!agent) return undefined
    return { agent, connectionId, navigation, t }
  }, [agent, connectionId, navigation, t])

  const actions = useMemo(() => {
    const defaultActions: WorkflowAction[] = []

    if (store.preferences.useVerifierCapability) {
      defaultActions.push({
        id: 'send-proof-request',
        text: t('Verifier.SendProofRequest'),
        onPress: () => {
          setShowActionSlider(false)
          onSendRequest()
        },
        icon: () => <Assets.svg.iconInfoSentDark height={30} width={30} />,
      })
    }

    if (registry && actionContext) {
      const registryActions = registry.getChatActions(actionContext)
      const existingIds = new Set(defaultActions.map((a) => a.id))
      return [...defaultActions, ...registryActions.filter((a) => !existingIds.has(a.id))]
    }

    return defaultActions.length ? defaultActions : undefined
  }, [store.preferences.useVerifierCapability, t, onSendRequest, Assets, registry, actionContext])

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
              onPress={onRestartSessionPress}
              accessibilityRole="button"
              accessibilityLabel={t('Chat.RestartSession') ?? 'Restart session'}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 10,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16 }}>{t('Chat.RestartSession') ?? 'Restart session'}</Text>
            </Pressable>
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

  const renderWorkflowsTab = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      {channelDescription && (
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
          <ThemedText style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{channelDescription}</ThemedText>
        </View>
      )}

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
                  <ThemedText numberOfLines={1} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                    {state}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            )
          })
        )}
      </View>
    </ScrollView>
  )

  const renderChatTab = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
      <GiftedChat
        keyboardShouldPersistTaps="handled"
        messages={chatMessages}
        renderAvatar={() => null}
        messageIdGenerator={(msg) => msg?._id.toString() || '0'}
        renderMessage={(props) => <ChatMessage messageProps={props} />}
        renderInputToolbar={() => null}
        renderSend={(props) => renderSend(props, theme)}
        renderComposer={(props) => renderComposer(props, theme, t('Contacts.TypeHere'))}
        disableComposer={!silentAssertConnectedNetwork()}
        onSend={onSend}
        user={{ _id: Role.me }}
        renderActions={() => null}
        messagesContainerStyle={{ paddingHorizontal: 12, marginTop: 10, paddingBottom: 20 }}
        loadEarlier={canLoadEarlier}
        isLoadingEarlier={isLoadingEarlier}
        onLoadEarlier={loadEarlier}
        bottomOffset={0}
        minInputToolbarHeight={0}
        renderChatFooter={() => <View style={{ height: 0, paddingTop: 10 }} />}
      />
      {showActionSlider && <ActionSlider onDismiss={() => setShowActionSlider(false)} actions={actions as any} />}
    </KeyboardAvoidingView>
  )

  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1 }}>
      {overflowMenu}
      <GradientBackground>
        {showWorkflowView ? renderWorkflowsTab() : renderChatTab()}
      </GradientBackground>
    </SafeAreaView>
  )
}

export default Chat
