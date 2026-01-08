import { CredentialExchangeRecord, CredentialState, ProofExchangeRecord, ProofState, } from '@credo-ts/core';
import { useAgent, useBasicMessagesByConnectionId } from '@credo-ts/react-hooks';
import { isPresentationReceived } from '@bifold/verifier';
import { useNavigation } from '@react-navigation/native';
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';
import { ChatEvent } from '../components/chat/ChatEvent';
import { CallbackType } from '../components/chat/ChatMessage';
import { ThemedText } from '../components/texts/ThemedText';
import { TOKENS, useContainer } from '../container-api';
import { useStore } from '../contexts/store';
import { useTheme } from '../contexts/theme';
import { useOptionalWorkflowRegistry } from '../modules/workflow';
import { Role } from '../types/chat';
import { Screens, Stacks } from '../types/navigators';
import { getConnectionName, getCredentialEventLabel, getCredentialEventRole, getMessageEventRole, getProofEventLabel, getProofEventRole, } from '../utils/helpers';
import { useCredentialsByConnectionId } from './credentials';
import { useProofsByConnectionId } from './proofs';
import { useWorkflows } from './useWorkflows';
import { useServices } from '../container-api';
const callbackTypeForMessage = (record) => {
    if (record instanceof CredentialExchangeRecord &&
        (record.state === CredentialState.Done || record.state === CredentialState.OfferReceived)) {
        return CallbackType.CredentialOffer;
    }
    if ((record instanceof ProofExchangeRecord && isPresentationReceived(record) && record.isVerified !== undefined) ||
        record.state === ProofState.RequestReceived ||
        (record.state === ProofState.Done && record.isVerified === undefined)) {
        return CallbackType.ProofRequest;
    }
    if (record instanceof ProofExchangeRecord &&
        (record.state === ProofState.PresentationSent || record.state === ProofState.Done)) {
        return CallbackType.PresentationSent;
    }
};
export const useChatMessagesByConnection = (connection) => {
    const [messages, setMessages] = useState([]);
    const [store] = useStore();
    const { t } = useTranslation();
    const { ChatTheme: theme, ColorPalette } = useTheme();
    const navigation = useNavigation();
    const { agent } = useAgent();
    const basicMessages = useBasicMessagesByConnectionId(connection?.id);
    const credentials = useCredentialsByConnectionId(connection?.id);
    const proofs = useProofsByConnectionId(connection?.id);
    const [theirLabel, setTheirLabel] = useState(getConnectionName(connection, store.preferences.alternateContactNames));
    const [AboutInstitution] = useServices([TOKENS.COMPONENT_ABOUT_INSTITUTION]);
    const { instances: workflowInstances, isAvailable: workflowsAvailable } = useWorkflows(connection?.id);
    const container = useContainer();
    const logger = container?.resolve(TOKENS.UTIL_LOGGER) ?? undefined;
    const registry = useOptionalWorkflowRegistry();
    useEffect(() => {
        setTheirLabel(getConnectionName(connection, store.preferences.alternateContactNames));
    }, [connection, store.preferences.alternateContactNames]);
    const messageContext = useMemo(() => ({
        t,
        theme,
        theirLabel,
        colorPalette: ColorPalette,
        agent: agent ?? undefined,
        navigation,
        logger,
    }), [t, theme, theirLabel, ColorPalette, agent, navigation, logger]);
    useEffect(() => {
        let transformedMessages = [];
        if (registry) {
            const allRecords = [...basicMessages, ...credentials, ...proofs, ...(workflowsAvailable ? workflowInstances : [])];
            transformedMessages = registry.toMessages(allRecords, connection, messageContext);
        }
        else {
            transformedMessages = transformMessagesLegacy(basicMessages, credentials, proofs, theirLabel, t, theme, ColorPalette, navigation);
        }
        const connectedBubbleStyle = {
            width: '100%',
        };
        const connectedMessage = connection
            ? {
                _id: 'connected',
                text: `${t('Chat.YouConnected')} ${theirLabel}`,
                renderEvent: () => (<View style={connectedBubbleStyle}>
              <ThemedText style={theme.leftText}>
                {t('Chat.YouConnected')}
                <ThemedText style={[theme.leftText, theme.leftTextHighlighted]}> {theirLabel}</ThemedText>
              </ThemedText>
            </View>),
                createdAt: connection.createdAt,
                user: { _id: Role.them },
            }
            : undefined;
        const rootMenuMessage = basicMessages.find((msg) => {
            try {
                const content = JSON.parse(msg.content);
                return content.workflowID === 'root-menu';
            }
            catch {
                return false;
            }
        });
        if (rootMenuMessage && !transformedMessages.some((msg) => msg._id === rootMenuMessage.id)) {
            try {
                const content = JSON.parse(rootMenuMessage.content);
                const displayData = content.displayData || [];
                const titleItem = displayData.find((item) => item.type === 'title');
                const textItem = displayData.find((item) => item.type === 'text');
                if (titleItem && textItem) {
                    const aboutMessage = {
                        _id: rootMenuMessage.id,
                        text: titleItem.text,
                        renderEvent: () => <AboutInstitution title={titleItem.text} content={textItem.text}/>,
                        createdAt: rootMenuMessage.createdAt,
                        user: { _id: Role.them },
                    };
                    transformedMessages.push(aboutMessage);
                }
            }
            catch (error) {
                console.log('Error parsing workflow message:', error);
            }
        }
        const finalMessages = connectedMessage
            ? [...transformedMessages.sort((a, b) => b.createdAt - a.createdAt), connectedMessage]
            : transformedMessages.sort((a, b) => b.createdAt - a.createdAt);
        setMessages(finalMessages);
    }, [
        ColorPalette,
        basicMessages,
        theme,
        credentials,
        t,
        navigation,
        proofs,
        theirLabel,
        connection,
        registry,
        messageContext,
        workflowInstances,
        workflowsAvailable,
    ]);
    return messages;
};
function transformMessagesLegacy(basicMessages, credentials, proofs, theirLabel, t, theme, ColorPalette, navigation) {
    const transformedMessages = [];
    transformedMessages.push(...basicMessages.map((record) => {
        const role = getMessageEventRole(record);
        const linkRegex = /(?:https?:\/\/\w+(?:\.\w+)+\S*)|(?:[\w\d._-]+@\w+(?:\.\w+)+)/gim;
        const mailRegex = /^[\w\d._-]+@\w+(?:\.\w+)+$/gim;
        const links = record.content.match(linkRegex) ?? [];
        const handleLinkPress = (link) => {
            if (link.match(mailRegex)) {
                link = 'mailto:' + link;
            }
            Linking.openURL(link);
        };
        const msgText = (<ThemedText style={role === Role.me ? theme.rightText : theme.leftText}>
          {record.content.split(linkRegex).map((split, i) => {
                if (i < links.length) {
                    const link = links[i];
                    return (<Fragment key={`${record.id}-${i}`}>
                  <ThemedText>{split}</ThemedText>
                  <ThemedText onPress={() => handleLinkPress(link)} style={{ color: ColorPalette.brand.link, textDecorationLine: 'underline' }} accessibilityRole={'link'}>
                    {link}
                  </ThemedText>
                </Fragment>);
                }
                return <ThemedText key={`${record.id}-${i}`}>{split}</ThemedText>;
            })}
        </ThemedText>);
        return {
            _id: record.id,
            text: record.content,
            renderEvent: () => msgText,
            createdAt: record.createdAt,
            type: record.type,
            user: { _id: role },
        };
    }));
    transformedMessages.push(...credentials.map((record) => {
        const role = getCredentialEventRole(record);
        const userLabel = role === Role.me ? t('Chat.UserYou') : theirLabel;
        const actionLabel = t(getCredentialEventLabel(record));
        return {
            _id: record.id,
            text: actionLabel,
            renderEvent: () => <ChatEvent role={role} userLabel={userLabel} actionLabel={actionLabel}/>,
            createdAt: record.createdAt,
            type: record.type,
            user: { _id: role },
            messageOpensCallbackType: callbackTypeForMessage(record),
            onDetails: () => {
                const navMap = {
                    [CredentialState.Done]: () => {
                        navigation.navigate(Stacks.ContactStack, {
                            screen: Screens.CredentialDetails,
                            params: { credentialId: record.id },
                        });
                    },
                    [CredentialState.OfferReceived]: () => {
                        if (navigation.getParent()) {
                            navigation.getParent()?.navigate(Stacks.ConnectionStack, {
                                screen: Screens.Connection,
                                params: { credentialId: record.id },
                            });
                        }
                        else {
                            navigation.navigate(Stacks.ConnectionStack, {
                                screen: Screens.Connection,
                                params: { credentialId: record.id },
                            });
                        }
                    },
                };
                const nav = navMap[record.state];
                if (nav) {
                    nav();
                }
            },
        };
    }));
    transformedMessages.push(...proofs.map((record) => {
        const role = getProofEventRole(record);
        const userLabel = role === Role.me ? t('Chat.UserYou') : theirLabel;
        const actionLabel = t(getProofEventLabel(record));
        return {
            _id: record.id,
            text: actionLabel,
            renderEvent: () => <ChatEvent role={role} userLabel={userLabel} actionLabel={actionLabel}/>,
            createdAt: record.createdAt,
            type: record.type,
            user: { _id: role },
            messageOpensCallbackType: callbackTypeForMessage(record),
            onDetails: () => {
                const toProofDetails = () => {
                    navigation.navigate(Stacks.ContactStack, {
                        screen: Screens.ProofDetails,
                        params: {
                            recordId: record.id,
                            isHistory: true,
                            senderReview: record.state === ProofState.PresentationSent ||
                                (record.state === ProofState.Done && record.isVerified === undefined),
                        },
                    });
                };
                const navMap = {
                    [ProofState.Done]: toProofDetails,
                    [ProofState.PresentationSent]: toProofDetails,
                    [ProofState.PresentationReceived]: toProofDetails,
                    [ProofState.RequestReceived]: () => {
                        if (navigation.getParent()) {
                            navigation.getParent()?.navigate(Stacks.ConnectionStack, {
                                screen: Screens.Connection,
                                params: { proofId: record.id },
                            });
                        }
                        else {
                            navigation.navigate(Stacks.ConnectionStack, {
                                screen: Screens.Connection,
                                params: { proofId: record.id },
                            });
                        }
                    },
                };
                const nav = navMap[record.state];
                if (nav) {
                    nav();
                }
            },
        };
    }));
    return transformedMessages;
}
