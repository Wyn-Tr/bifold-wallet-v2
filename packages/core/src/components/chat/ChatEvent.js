import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../contexts/theme';
import { Role } from '../../types/chat';
import { ThemedText } from '../texts/ThemedText';
export const ChatEvent = ({ userLabel, actionLabel, role }) => {
    const { ChatTheme } = useTheme();
    // Note: Bubble styling is handled by ChatMessage for proof/credential messages
    return (<View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {userLabel && (<ThemedText style={[role === Role.me ? ChatTheme.rightText : ChatTheme.leftText, { marginRight: 4 }]}>
          {userLabel}
        </ThemedText>)}
      {actionLabel && (<ThemedText style={role === Role.me ? ChatTheme.rightTextHighlighted : ChatTheme.leftTextHighlighted}>
          {actionLabel}
        </ThemedText>)}
    </View>);
};
