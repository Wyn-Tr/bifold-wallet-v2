/**
 * ActionMenuBubble Component
 *
 * Renders action menu messages with images, titles, text, buttons, and forms.
 * Ported from bifold-wallet-1 with enhanced styling for dark themes.
 */
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../../contexts/theme';
export const ActionMenuBubble = ({ content, workflowID, onActionPress }) => {
    const { ColorPalette } = useTheme();
    const [formData, setFormData] = useState({});
    // Dynamic styles based on theme
    const themedStyles = StyleSheet.create({
        bubble: {
            backgroundColor: ColorPalette.grayscale.digicredBackgroundModal,
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: ColorPalette.grayscale.digicredBackgroundModal,
            width: 320,
            maxWidth: '100%',
        },
        title: {
            fontSize: 18,
            fontWeight: '700',
            marginBottom: 12,
            color: ColorPalette.brand.text,
        },
        image: {
            width: '100%',
            height: 150,
            marginBottom: 12,
            borderRadius: 8,
        },
        description: {
            fontSize: 15,
            marginBottom: 12,
            color: ColorPalette.brand.text,
            lineHeight: 22,
        },
        buttonContainer: {
            flexDirection: 'column',
            alignItems: 'center',
        },
        button: {
            paddingVertical: 14,
            paddingHorizontal: 20,
            borderRadius: 12,
            marginVertical: 6,
            width: '100%',
            backgroundColor: ColorPalette.brand.primary,
        },
        buttonText: {
            fontSize: 15,
            fontWeight: '600',
            textAlign: 'center',
            color: ColorPalette.grayscale.white,
        },
        textInput: {
            height: 48,
            borderColor: ColorPalette.brand.primary,
            borderWidth: 1.5,
            marginBottom: 12,
            paddingHorizontal: 16,
            borderRadius: 12,
            backgroundColor: ColorPalette.brand.tertiaryBackground,
            color: ColorPalette.brand.text,
            fontSize: 15,
        },
        radioButton: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
            paddingVertical: 4,
        },
        radioButtonIcon: {
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 2,
            borderColor: ColorPalette.brand.primary,
            marginRight: 12,
            justifyContent: 'center',
            alignItems: 'center',
        },
        radioButtonIconSelected: {
            backgroundColor: ColorPalette.brand.primary,
        },
        radioButtonText: {
            fontSize: 15,
            color: ColorPalette.brand.text,
        },
        formLabel: {
            fontSize: 14,
            fontWeight: '600',
            color: ColorPalette.brand.text,
            marginBottom: 8,
        },
    });
    const renderFormField = (field, index) => {
        if (!field) {
            return null;
        }
        switch (field.type) {
            case 'text': {
                return (<TextInput key={index} style={themedStyles.textInput} placeholder={field.label} placeholderTextColor={ColorPalette.grayscale.lightGrey} value={formData[field.name] ? formData[field.name]?.toString() : ''} onChangeText={(text) => setFormData({ ...formData, [field.name]: text })}/>);
            }
            case 'radio': {
                return (<View key={index}>
            <Text style={themedStyles.formLabel}>{field.label}</Text>
            {field.options?.map((option, optionIndex) => (<TouchableOpacity key={optionIndex} style={themedStyles.radioButton} onPress={() => setFormData({ ...formData, [field.name]: option })}>
                <View style={[
                            themedStyles.radioButtonIcon,
                            formData[field.name] === option && themedStyles.radioButtonIconSelected,
                        ]}/>
                <Text style={themedStyles.radioButtonText}>{option}</Text>
              </TouchableOpacity>))}
          </View>);
            }
            default:
                return null;
        }
    };
    const renderContent = (item, index) => {
        switch (item.type) {
            case 'image':
                return item.url ? (<Image key={index} source={{ uri: item.url }} style={themedStyles.image} resizeMode="contain"/>) : null;
            case 'title':
                return (<Text key={index} style={themedStyles.title}>
            {item.text}
          </Text>);
            case 'text':
                return (<Text key={index} style={themedStyles.description}>
            {item.text}
          </Text>);
            case 'button':
                return (<TouchableOpacity key={index} style={themedStyles.button} onPress={() => onActionPress(item.actionID ?? '', workflowID, item.invitationLink)} activeOpacity={0.8}>
            <Text style={themedStyles.buttonText}>{item.label}</Text>
          </TouchableOpacity>);
            case 'form':
                return (<View key={index}>
            {item.fields?.map((field, fieldIndex) => renderFormField(field, fieldIndex))}
          </View>);
            default:
                return null;
        }
    };
    return <View style={themedStyles.bubble}>{content.map((item, index) => renderContent(item, index))}</View>;
};
