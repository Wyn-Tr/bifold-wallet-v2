import { BasicMessageRepository } from '@credo-ts/core';
import { useAgent, useBasicMessagesByConnectionId, useConnectionById } from '@credo-ts/react-hooks';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GiftedChat } from 'react-native-gifted-chat';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import InfoIcon from '../components/buttons/InfoIcon';
import { renderComposer, renderInputToolbar, renderSend } from '../components/chat';
import ActionSlider from '../components/chat/ActionSlider';
import { renderActions } from '../components/chat/ChatActions';
import { ChatMessage } from '../components/chat/ChatMessage';
import { useNetwork } from '../contexts/network';
import { useStore } from '../contexts/store';
import { useTheme } from '../contexts/theme';
import { useChatMessagesByConnection } from '../hooks/chat-messages';
import { useConnectionCapabilities } from '../hooks/useConnectionCapabilities';
import { useOptionalWorkflowRegistry } from '../modules/workflow';
import { Role } from '../types/chat';
import { BasicMessageMetadata } from '../types/metadata';
import { Screens, Stacks } from '../types/navigators';
import { getConnectionName } from '../utils/helpers';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { createDCWalletChatConfig } from '../modules/workflow/renderers/createChatScreenConfig';
const Chat = ({ route }) => {
    if (!route?.params) {
        throw new Error('Chat route params were not set properly');
    }
    const { connectionId } = route.params;
    const [store] = useStore();
    const { t } = useTranslation();
    const { agent } = useAgent();
    const navigation = useNavigation();
    const connection = useConnectionById(connectionId);
    const basicMessages = useBasicMessagesByConnectionId(connectionId);
    const chatMessages = useChatMessagesByConnection(connection);
    const isFocused = useIsFocused();
    const { assertNetworkConnected, silentAssertConnectedNetwork } = useNetwork();
    const [showActionSlider, setShowActionSlider] = useState(false);
    const { ChatTheme: theme, Assets, ColorPalette } = useTheme();
    const [theirLabel, setTheirLabel] = useState(getConnectionName(connection, store.preferences.alternateContactNames));
    const headerHeight = useHeaderHeight();
    console.log('====BM====> ', JSON.stringify(basicMessages, null, 2));
    // Check if the connection supports WebRTC for video calls
    const { capabilities } = useConnectionCapabilities(connectionId);
    // Try to get the workflow registry for chat actions
    const registry = useOptionalWorkflowRegistry();
    // Get chat screen config from registry
    // const chatScreenConfig = useMemo(() => {
    //   return registry?.getChatScreenConfig()
    // }, [registry])
    const chatScreenConfig = useMemo(() => {
        return createDCWalletChatConfig({
            onCredentialAccept: async (credential, context) => {
                try {
                    await context.agent.credentials.acceptOffer(credential.id);
                }
                catch (err) {
                    console.error('Accept failed:', err);
                }
            },
            onCredentialDecline: async (credential, context) => {
                try {
                    await context.agent.credentials.declineOffer(credential.id);
                }
                catch (err) {
                    console.error('Decline failed:', err);
                }
            },
            onCredentialPress: (credential, context) => {
                context.navigation.navigate('CredentialDetails', { credentialId: credential.id });
            },
        });
    }, []);
    // This useEffect is for properly rendering changes to the alt contact name, useMemo did not pick them up
    useEffect(() => {
        setTheirLabel(getConnectionName(connection, store.preferences.alternateContactNames));
    }, [isFocused, connection, store.preferences.alternateContactNames]);
    useEffect(() => {
        assertNetworkConnected();
    }, [assertNetworkConnected]);
    /**
     * Send :menu message to the connection to request the action menu
     * This is the DC wallet bell icon functionality
     */
    const onShowMenu = useCallback(async () => {
        try {
            await agent?.basicMessages.sendMessage(connectionId, ':menu');
        }
        catch (error) {
            // Error sending menu request - silently fail
        }
    }, [agent, connectionId]);
    useEffect(() => {
        // If header should be inside background, hide navigation header
        if (chatScreenConfig?.headerInsideBackground && chatScreenConfig?.headerRenderer) {
            navigation.setOptions({
                headerShown: false,
            });
        }
        else if (chatScreenConfig?.headerRenderer) {
            // Use custom header from config if available (rendered by navigation)
            navigation.setOptions({
                header: () => chatScreenConfig.headerRenderer.render({
                    title: theirLabel,
                    connectionId: connection?.id,
                    onBack: () => navigation.goBack(),
                    onInfo: () => {
                        navigation.navigate(Screens.ContactDetails, { connectionId: connection?.id });
                    },
                    onVideoCall: () => {
                        navigation.navigate(Screens.VideoCall, { connectionId: connection?.id, video: true });
                    },
                    showMenuButton: chatScreenConfig.showMenuButton,
                    showInfoButton: chatScreenConfig.showInfoButton,
                    // Only show video button if config allows AND remote supports WebRTC
                    showVideoButton: chatScreenConfig.showVideoButton && capabilities.supportsWebRTC,
                    isLoadingCapabilities: capabilities.isLoading,
                    // Bell icon sends :menu message to request action menu from the connection
                    onMenuPress: onShowMenu,
                }),
            });
        }
        else {
            navigation.setOptions({
                title: theirLabel,
                headerRight: () => (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginRight: 8 }}>
            {/* Only show video button if remote supports WebRTC */}
            {capabilities.supportsWebRTC && (<TouchableOpacity onPress={() => navigation.navigate(Screens.VideoCall, { connectionId: connection?.id, video: true })} accessibilityLabel={t('ContactDetails.StartVideoCall')} accessibilityRole="button" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="video" size={24} color={ColorPalette.brand.primary}/>
              </TouchableOpacity>)}
            <InfoIcon connectionId={connection?.id}/>
          </View>),
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        navigation,
        theirLabel,
        connection,
        chatScreenConfig,
        onShowMenu,
        t,
        capabilities.supportsWebRTC,
        capabilities.isLoading,
        ColorPalette.brand.primary,
    ]);
    // Render header inside content when headerInsideBackground is enabled
    const renderInlineHeader = useCallback(() => {
        if (!chatScreenConfig?.headerInsideBackground || !chatScreenConfig?.headerRenderer) {
            return null;
        }
        return chatScreenConfig.headerRenderer.render({
            title: theirLabel,
            connectionId: connection?.id,
            onBack: () => navigation.goBack(),
            onInfo: () => {
                navigation.navigate(Screens.ContactDetails, { connectionId: connection?.id });
            },
            onVideoCall: () => {
                navigation.navigate(Screens.VideoCall, { connectionId: connection?.id, video: true });
            },
            showMenuButton: chatScreenConfig.showMenuButton,
            showInfoButton: chatScreenConfig.showInfoButton,
            // Only show video button if config allows AND remote supports WebRTC
            showVideoButton: chatScreenConfig.showVideoButton && capabilities.supportsWebRTC,
            isLoadingCapabilities: capabilities.isLoading,
            onMenuPress: onShowMenu,
        });
    }, [
        chatScreenConfig,
        theirLabel,
        connection,
        navigation,
        onShowMenu,
        capabilities.supportsWebRTC,
        capabilities.isLoading,
    ]);
    // when chat is open, mark messages as seen
    useEffect(() => {
        basicMessages.forEach((msg) => {
            const meta = msg.metadata.get(BasicMessageMetadata.customMetadata);
            if (agent && !meta?.seen) {
                msg.metadata.set(BasicMessageMetadata.customMetadata, { ...meta, seen: true });
                const basicMessageRepository = agent.context.dependencyManager.resolve(BasicMessageRepository);
                basicMessageRepository.update(agent.context, msg);
            }
        });
    }, [basicMessages, agent]);
    const onSend = useCallback(async (messages) => {
        await agent?.basicMessages.sendMessage(connectionId, messages[0].text);
    }, [agent, connectionId]);
    const onSendRequest = useCallback(async () => {
        navigation.navigate(Stacks.ProofRequestsStack, {
            screen: Screens.ProofRequests,
            params: { connectionId },
        });
    }, [navigation, connectionId]);
    // Create action context for registry
    const actionContext = useMemo(() => {
        if (!agent)
            return undefined;
        return {
            agent,
            connectionId,
            navigation,
            t,
        };
    }, [agent, connectionId, navigation, t]);
    // Get actions from registry if available, otherwise use default actions
    const actions = useMemo(() => {
        const defaultActions = [];
        // Add default Send Proof Request action if verifier capability is enabled
        if (store.preferences.useVerifierCapability) {
            defaultActions.push({
                id: 'send-proof-request',
                text: t('Verifier.SendProofRequest'),
                onPress: () => {
                    setShowActionSlider(false);
                    onSendRequest();
                },
                icon: () => <Assets.svg.iconInfoSentDark height={30} width={30}/>,
            });
        }
        // Get additional actions from registry if available
        if (registry && actionContext) {
            const registryActions = registry.getChatActions(actionContext);
            // Merge registry actions with default actions, avoiding duplicates by ID
            const existingIds = new Set(defaultActions.map((a) => a.id));
            const uniqueRegistryActions = registryActions.filter((a) => !existingIds.has(a.id));
            return [...defaultActions, ...uniqueRegistryActions];
        }
        return defaultActions.length > 0 ? defaultActions : undefined;
    }, [store.preferences.useVerifierCapability, t, onSendRequest, Assets, registry, actionContext]);
    const onDismiss = useCallback(() => {
        setShowActionSlider(false);
    }, []);
    // Render the chat content
    const chatContent = (<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? undefined : 'padding'} keyboardVerticalOffset={headerHeight}>
      <GiftedChat keyboardShouldPersistTaps={'handled'} messages={chatMessages} showAvatarForEveryMessage={true} alignTop renderAvatar={() => null} messageIdGenerator={(msg) => msg?._id.toString() || '0'} renderMessage={(props) => <ChatMessage messageProps={props}/>} renderInputToolbar={(props) => renderInputToolbar(props, theme)} renderSend={(props) => renderSend(props, theme)} renderComposer={(props) => renderComposer(props, theme, t('Contacts.TypeHere'))} disableComposer={!silentAssertConnectedNetwork()} onSend={onSend} user={{
            _id: Role.me,
        }} renderActions={(props) => renderActions(props, theme, actions)} onPressActionButton={actions && actions.length > 0 ? () => setShowActionSlider(true) : undefined} 
    // bottomOffset={Platform.OS === 'ios' ? 34 : 0}
    //minInputToolbarHeight={60}
    messagesContainerStyle={{
            // paddingBottom: 80,
            paddingHorizontal: 12,
        }}/>
      {showActionSlider && <ActionSlider onDismiss={onDismiss} actions={actions}/>}
    </KeyboardAvoidingView>);
    // Use custom background if available, otherwise use default SafeAreaView
    if (chatScreenConfig?.backgroundRenderer) {
        // When header is inside background, render header as first child of the gradient
        const headerInsideBackground = chatScreenConfig.headerInsideBackground;
        return (<View style={{ flex: 1 }}>
        {chatScreenConfig.backgroundRenderer.render(<>
            {headerInsideBackground && renderInlineHeader()}
            <SafeAreaView edges={headerInsideBackground ? ['bottom', 'left', 'right'] : ['bottom', 'left', 'right']} style={{ flex: 1, paddingTop: headerInsideBackground ? 0 : 20 }}>
              {chatContent}
            </SafeAreaView>
          </>)}
      </View>);
    }
    return (<SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, paddingTop: 20 }}>
      {chatContent}
    </SafeAreaView>);
};
export default Chat;
