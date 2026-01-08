import React from 'react';
import { View, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { DigiCredButton } from '../index';
import { DigiCredColors } from '../../theme';
import { useTranslation } from 'react-i18next';
const CredentialButtons = ({ isProcessing, onAccept, onDecline }) => {
    const { t } = useTranslation();
    return (<View style={styles.groupButton}>
      <DigiCredButton title={t('Global.DECLINE')} onPress={onDecline} variant="secondary" disabled={isProcessing} customStyle={styles.declineButton} customTextStyle={styles.declineButtonText}/>

      <View style={styles.acceptGradientWrapper}>
        <LinearGradient colors={DigiCredColors.homeNoChannels.buttonGradient} locations={DigiCredColors.homeNoChannels.buttonGradientLocations} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.acceptGradient}>
          <DigiCredButton title={t('Global.ACCEPT') + '  \u002B'} onPress={onAccept} variant="primary" disabled={isProcessing} customStyle={styles.acceptButton} customTextStyle={styles.acceptButtonText}/>
        </LinearGradient>
      </View>
    </View>);
};
const styles = StyleSheet.create({
    groupButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '90%',
        alignItems: 'center',
        marginTop: 10,
    },
    declineButton: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: DigiCredColors.text.homePrimary,
        borderRadius: 25,
        width: '43%',
        height: 45,
        padding: 0,
        justifyContent: 'center',
        marginLeft: 5,
    },
    declineButtonText: {
        color: DigiCredColors.text.homePrimary,
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 24,
    },
    acceptGradientWrapper: {
        width: '46%',
        height: 45,
        marginRight: 5,
    },
    acceptGradient: {
        borderRadius: 25,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
    },
    acceptButton: {
        backgroundColor: 'transparent',
        borderRadius: 25,
        width: '100%',
        height: '100%',
        padding: 0,
    },
    acceptButtonText: {
        color: DigiCredColors.text.homePrimary,
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 24,
        textTransform: 'uppercase',
    },
});
export default CredentialButtons;
