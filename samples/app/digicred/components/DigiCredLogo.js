import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { DigiCredColors } from '../theme';
const DigiCredLogo = ({ style, size = 'large', showText = true, }) => {
    const iconSize = size === 'large' ? 80 : size === 'medium' ? 60 : 40;
    const titleSize = size === 'large' ? 32 : size === 'medium' ? 24 : 18;
    const subtitleSize = size === 'large' ? 18 : size === 'medium' ? 14 : 12;
    return (<View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        {/* Wallet/Card Stack Icon */}
        <Icon name="wallet" size={iconSize} color={DigiCredColors.text.primary}/>
      </View>
      {showText && (<>
          <Text style={[styles.title, { fontSize: titleSize }]}>DigiCred</Text>
          <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>Wallet</Text>
        </>)}
    </View>);
};
const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        marginBottom: 16,
    },
    title: {
        color: DigiCredColors.text.primary,
        fontWeight: '700',
        letterSpacing: 1,
    },
    subtitle: {
        color: DigiCredColors.text.secondary,
        marginTop: 4,
        letterSpacing: 2,
    },
});
export default DigiCredLogo;
