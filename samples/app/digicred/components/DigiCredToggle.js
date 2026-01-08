import React from 'react';
import { StyleSheet, Text, View, Switch } from 'react-native';
import { DigiCredColors } from '../theme';
const DigiCredToggle = ({ label, value, onValueChange, style, testID, }) => {
    return (<View style={[styles.container, style]}>
      <Switch value={value} onValueChange={onValueChange} trackColor={{
            false: DigiCredColors.toggle.inactive,
            true: DigiCredColors.toggle.active,
        }} thumbColor={DigiCredColors.toggle.thumb} ios_backgroundColor={DigiCredColors.toggle.inactive} testID={testID} accessibilityRole="switch" accessibilityLabel={label}/>
      <Text style={styles.label}>{label}</Text>
    </View>);
};
const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
    },
    label: {
        color: DigiCredColors.text.primary,
        fontSize: 16,
        marginLeft: 12,
    },
});
export default DigiCredToggle;
