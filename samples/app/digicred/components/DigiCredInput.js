import React, { useState, forwardRef } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { DigiCredColors } from '../theme';
const DigiCredInput = forwardRef(({ placeholder, value, onChangeText, secureTextEntry = false, keyboardType = 'default', maxLength, testID, accessibilityLabel, autoFocus = false, customStyle, }, ref) => {
    const [isSecure, setIsSecure] = useState(secureTextEntry);
    return (<View style={[styles.container, customStyle]}>
        <TextInput ref={ref} style={styles.input} placeholder={placeholder} placeholderTextColor={DigiCredColors.text.secondary} value={value} onChangeText={onChangeText} secureTextEntry={isSecure} keyboardType={keyboardType} maxLength={maxLength} testID={testID} accessibilityLabel={accessibilityLabel} autoFocus={autoFocus} underlineColorAndroid="transparent"/>
        {secureTextEntry && (<TouchableOpacity style={styles.eyeButton} onPress={() => setIsSecure(!isSecure)} accessibilityLabel={isSecure ? 'Show password' : 'Hide password'}>
            <Icon name={isSecure ? 'eye' : 'eye-off'} size={24} color={DigiCredColors.text.secondary}/>
          </TouchableOpacity>)}
      </View>);
});
DigiCredInput.displayName = 'DigiCredInput';
const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: DigiCredColors.card.backgroundLight,
        borderRadius: 28,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: DigiCredColors.card.border,
    },
    input: {
        flex: 1,
        height: 56,
        paddingHorizontal: 20,
        fontSize: 16,
        color: DigiCredColors.text.primary,
    },
    eyeButton: {
        padding: 16,
        marginTop: -8,
    },
});
export default DigiCredInput;
