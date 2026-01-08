import React, { useMemo } from 'react';
// import { useTranslation } from 'react-i18next'
import { View } from 'react-native';
import { Bubble } from 'react-native-gifted-chat';
import { useTheme } from '../../contexts/theme';
import { Role } from '../../types/chat';
import { formatTime } from '../../utils/helpers';
import { ThemedText } from '../texts/ThemedText';
export var CallbackType;
(function (CallbackType) {
    CallbackType["CredentialOffer"] = "CredentialOffer";
    CallbackType["ProofRequest"] = "ProofRequest";
    CallbackType["PresentationSent"] = "PresentationSent";
    CallbackType["Workflow"] = "Workflow";
})(CallbackType || (CallbackType = {}));
const MessageTime = ({ message }) => {
    const { ChatTheme: theme } = useTheme();
    return (<ThemedText style={message.user._id === Role.me ? theme.timeStyleRight : theme.timeStyleLeft}>
      {formatTime(message.createdAt, { includeHour: true, chatFormat: true, trim: true })}
    </ThemedText>);
};
// MessageIcon component - intentionally unused for now, kept for future use
// const MessageIcon: React.FC<{ type: CallbackType }> = ({ type }) => {
//   const { ChatTheme: theme, Assets } = useTheme()
//   if (type === CallbackType.PresentationSent) return null
//   return (
//     <View style={type !== CallbackType.CredentialOffer ? theme.documentIconContainer : {}}>
//       {type === CallbackType.ProofRequest && <Assets.svg.iconProofRequestLight width={40} height={40} />}
//     </View>
//   )
// }
export const ChatMessage = ({ messageProps }) => {
    //const { t } = useTranslation()
    const { ChatTheme: theme } = useTheme();
    const message = useMemo(() => messageProps.currentMessage, [messageProps]);
    // const textForCallbackType = (callbackType: CallbackType) => {
    //   // Receiving a credential offer
    //   if (callbackType === CallbackType.CredentialOffer) {
    //     return t('Chat.ViewOffer')
    //   }
    //
    //   // Receiving a proof request
    //   if (callbackType === CallbackType.ProofRequest) {
    //     return t('Chat.ViewRequest')
    //   }
    //
    //   // After a presentation of a proof
    //   if (callbackType === CallbackType.PresentationSent) {
    //     return t('Chat.OpenPresentation')
    //   }
    //
    //   // Workflow actions
    //   if (callbackType === CallbackType.Workflow) {
    //     return t('Chat.ViewWorkflow')
    //   }
    //
    //   return t('Chat.OpenItem')
    // }
    // For messages with callback types (proof request, credential offer), render in a combined card
    // if (message.messageOpensCallbackType) {
    //   const cardStyle = {
    //     backgroundColor: ColorPalette.brand.secondaryBackground,
    //     borderRadius: 12,
    //     borderWidth: 1,
    //     borderColor: ColorPalette.brand.primary,
    //     maxWidth: 320,
    //     overflow: 'hidden' as const,
    //   }
    //
    //   const buttonStyle = {
    //     backgroundColor: ColorPalette.brand.primary,
    //     paddingVertical: 12,
    //     paddingHorizontal: 16,
    //     alignItems: 'center' as const,
    //     justifyContent: 'center' as const,
    //   }
    //
    //   return (
    //     <View style={{ marginBottom: 8 }}>
    //       <View
    //         style={{
    //           flexDirection: 'row',
    //           justifyContent: message.user._id === Role.me ? 'flex-end' : 'flex-start',
    //         }}
    //       >
    //         <View style={cardStyle}>
    //           {/* Message content */}
    //           <View style={{ padding: 12 }}>
    //             {message.renderEvent?.() || null}
    //           </View>
    //           {/* Action button */}
    //           <TouchableOpacity
    //             accessibilityLabel={textForCallbackType(message.messageOpensCallbackType)}
    //             accessibilityRole="button"
    //             testID={testIdForCallbackType(message.messageOpensCallbackType)}
    //             onPress={() => {
    //               if (message.onDetails) message.onDetails()
    //             }}
    //             style={buttonStyle}
    //             hitSlop={hitSlop}
    //           >
    //             <ThemedText style={{ color: ColorPalette.grayscale.white, fontWeight: '600', fontSize: 16 }}>
    //               {textForCallbackType(message.messageOpensCallbackType)}
    //             </ThemedText>
    //           </TouchableOpacity>
    //         </View>
    //       </View>
    //       {/* Timestamp */}
    //       <View
    //         style={{
    //           flexDirection: 'row',
    //           justifyContent: message.user._id === Role.me ? 'flex-end' : 'flex-start',
    //           marginTop: 4,
    //           marginBottom: 20,
    //         }}
    //       >
    //         <MessageTime message={message} />
    //       </View>
    //     </View>
    //   )
    // }
    if (message.messageOpensCallbackType) {
        return (<View style={{ marginBottom: 8 }}>
        <View style={{
                flexDirection: 'row',
                justifyContent: message.user._id === Role.me ? 'flex-end' : 'flex-start',
            }}>
          {message.renderEvent?.() || null}
        </View>
        {/* Timestamp */}
        <View style={{
                flexDirection: 'row',
                justifyContent: message.user._id === Role.me ? 'flex-end' : 'flex-start',
                marginTop: 10,
                marginBottom: 10,
            }}>
          <MessageTime message={message}/>
        </View>
      </View>);
    }
    // Regular messages without callback types
    return (<View style={{
            flexDirection: 'row',
            justifyContent: message.user._id === Role.me ? 'flex-end' : 'flex-start',
        }}>
      <View style={{
            backgroundColor: 'transparent',
        }}>
        <Bubble {...messageProps} key={messageProps.key} renderUsernameOnMessage={false} renderMessageText={() => (<View style={{ backgroundColor: 'transparent' }}>
              {message.renderEvent?.() || null}
            </View>)} containerStyle={{
            left: {
                margin: 0,
            },
            right: {
                margin: 0,
            },
        }} wrapperStyle={{
            left: {
                backgroundColor: 'transparent',
                marginRight: 0,
                padding: 0,
                marginLeft: '5%',
            },
            right: {
                backgroundColor: 'transparent',
                marginLeft: 0,
                marginRight: 0,
                padding: 0,
            },
        }} textStyle={{
            left: { ...theme.leftText },
            right: { ...theme.rightText },
        }} renderTime={() => <MessageTime message={message}/>} renderCustomView={() => null}/>
      </View>
    </View>);
};
