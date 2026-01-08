import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { DigiCredColors } from '../theme';
const CredentialCard = ({ title, subtitle, date, notificationText, logoSource, onPress, testID, }) => {
    return (<TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8} testID={testID} accessibilityRole="button" accessibilityLabel={`${title} credential`}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        {logoSource ? (typeof logoSource === 'string' ? (<View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>{logoSource}</Text>
            </View>) : (<Image source={logoSource} style={styles.logo} resizeMode="contain"/>)) : (<View style={styles.logoPlaceholder}>
            <Icon name="card-account-details" size={24} color={DigiCredColors.text.primary}/>
          </View>)}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle && (<Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>)}
        {date && (<Text style={styles.date}>{date}</Text>)}
        {notificationText && (<Text style={styles.notification} numberOfLines={1}>{notificationText}</Text>)}
      </View>

      {/* Chevron */}
      <View style={styles.chevronContainer}>
        <Icon name="chevron-right" size={24} color={DigiCredColors.text.secondary}/>
      </View>
    </TouchableOpacity>);
};
const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: DigiCredColors.card.background,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    logoContainer: {
        marginRight: 12,
    },
    logo: {
        width: 48,
        height: 48,
        borderRadius: 8,
    },
    logoPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: DigiCredColors.card.backgroundLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoText: {
        color: DigiCredColors.text.primary,
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: DigiCredColors.text.primary,
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 14,
        color: DigiCredColors.text.secondary,
        marginBottom: 2,
    },
    date: {
        fontSize: 12,
        color: DigiCredColors.text.secondary,
        marginBottom: 4,
    },
    notification: {
        fontSize: 12,
        color: DigiCredColors.text.secondary,
        fontStyle: 'italic',
    },
    chevronContainer: {
        marginLeft: 8,
    },
});
export default CredentialCard;
