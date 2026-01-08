import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ActivityIndicator, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { DigiCredColors } from '../theme';
const DigiCredButton = ({ title, onPress, variant = 'primary', disabled = false, loading = false, style, customStyle, textStyle, customTextStyle, testID, accessibilityLabel, fullWidth = false, iconName, iconSize = 24, iconColor, }) => {
    const isPrimary = variant === 'primary';
    const buttonStyles = [
        styles.button,
        isPrimary ? styles.primaryButton : styles.secondaryButton,
        disabled && styles.disabledButton,
        fullWidth && styles.fullWidth,
        customStyle,
        style,
    ];
    const textStyles = [
        styles.buttonText,
        !isPrimary && styles.secondaryButtonText,
        disabled && styles.disabledButtonText,
        customTextStyle,
        textStyle,
    ];
    const finalIconColor = iconColor ?? (isPrimary ? DigiCredColors.text.primary : DigiCredColors.text.secondary);
    return (<TouchableOpacity style={buttonStyles} onPress={onPress} disabled={disabled || loading} testID={testID} accessibilityLabel={accessibilityLabel} accessibilityRole="button">
      {loading ? (<View style={{ marginHorizontal: 50 }}>
          <ActivityIndicator color={finalIconColor}/>
        </View>) : (<View style={styles.content}>
          <Text style={textStyles}>{title}</Text>
          {iconName && <Icon name={iconName} size={iconSize} color={finalIconColor} style={styles.icon}/>}
        </View>)}
    </TouchableOpacity>);
};
const styles = StyleSheet.create({
    button: {
        borderRadius: 28,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginLeft: 8,
    },
    primaryButton: {
        backgroundColor: DigiCredColors.button.primary,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: DigiCredColors.button.secondaryBorder,
    },
    disabledButton: {
        backgroundColor: DigiCredColors.button.primaryDisabled,
        opacity: 0.6,
    },
    fullWidth: {
        width: '100%',
    },
    buttonText: {
        color: DigiCredColors.text.primary,
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    secondaryButtonText: {
        color: DigiCredColors.text.primary,
    },
    disabledButtonText: {
        opacity: 0.7,
    },
});
export default DigiCredButton;
