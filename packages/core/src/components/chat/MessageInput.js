import React from 'react';
import { View } from 'react-native';
import { Composer, InputToolbar, Send } from 'react-native-gifted-chat';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
export const renderInputToolbar = (props, theme) => (<InputToolbar {...props} containerStyle={{
        display: 'none',
        ...theme.inputToolbar,
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginHorizontal: 12,
        marginBottom: 6,
        borderRadius: 24,
        borderTopWidth: 0,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    }} primaryStyle={{
        alignItems: 'center',
    }}/>);
export const renderComposer = (props, theme, placeholder) => (<Composer {...props} textInputStyle={{
        ...theme.inputText,
        backgroundColor: 'transparent',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        marginLeft: 0,
        marginRight: 8,
        lineHeight: 20,
    }} placeholder={placeholder} placeholderTextColor={theme.placeholderText} 
// the placeholder is read by accessibility features when multiline is enabled so a label is not necessary (results in double announcing if used)
textInputProps={{ accessibilityLabel: '', maxFontSizeMultiplier: 1.2 }}/>);
export const renderSend = (props, theme) => (<Send {...props} alwaysShowSend={true} disabled={!props.text} containerStyle={{
        ...theme.sendContainer,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
        marginBottom: 0,
    }}>
    <View style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: props.text ? theme.sendEnabled : 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    }}>
      <Icon name="send" size={24} color={props.text ? '#FFFFFF' : theme.sendDisabled} style={{ marginLeft: 2 }}/>
    </View>
  </Send>);
