/**
 * CredentialButtons
 *
 * Accept/Decline buttons component for credential offers and proof requests.
 * Ported from bifold-wallet-dc with modular architecture.
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../contexts/theme';
import { ThemedText } from '../../../../components/texts/ThemedText';
export const CredentialButtons = ({ isProcessing, onAccept, onDecline, onChange, isChangedBtn = false, isTranscript = false, isShareDisabled = false, isShare = false, }) => {
    const { t } = useTranslation();
    const { SettingsTheme, ColorPalette } = useTheme();
    return (<View style={isTranscript ? styles.groupButtonTran : styles.groupButton}>
      <>
        <TouchableOpacity onPress={onDecline} style={[
            styles.decline,
            { backgroundColor: SettingsTheme.newSettingColors.headerTitle },
            isTranscript && styles.btnTran,
        ]} disabled={isProcessing}>
          <ThemedText style={[styles.declineText, { color: ColorPalette.grayscale.white }]}>{t('Global.Decline')}</ThemedText>
        </TouchableOpacity>

        {isChangedBtn && (<TouchableOpacity onPress={onChange} style={[
                styles.change,
                { backgroundColor: SettingsTheme.newSettingColors.headerTitle },
                isTranscript && styles.btnTran,
            ]}>
            <ThemedText style={[styles.declineText, { color: ColorPalette.grayscale.white }]}>
              {t('Global.Change')} {t('Global.Credential')}
            </ThemedText>
          </TouchableOpacity>)}
        <TouchableOpacity onPress={onAccept} style={[
            styles.accept,
            { backgroundColor: SettingsTheme.newSettingColors.buttonColor },
            isTranscript && styles.btnTran,
        ]} disabled={isProcessing || (isShare && isShareDisabled)}>
          <ThemedText style={[styles.acceptText, { color: ColorPalette.grayscale.white }]}>{isShare ? t('Global.Share') : t('Global.Accept')}</ThemedText>
        </TouchableOpacity>
      </>
    </View>);
};
const styles = StyleSheet.create({
    groupButton: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        maxWidth: 250,
        alignItems: 'center',
        marginTop: 6,
        alignSelf: 'flex-start',
        minHeight: 44,
    },
    groupButtonTran: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 5,
        minHeight: 44,
    },
    decline: {
        padding: 10,
        minWidth: 85,
        borderRadius: 4,
        marginHorizontal: 5,
    },
    change: {
        padding: 10,
        minWidth: 150,
        borderRadius: 4,
        marginHorizontal: 5,
    },
    declineText: {
        color: 'white',
        lineHeight: 20,
        textAlign: 'center',
        flexWrap: 'nowrap',
        fontSize: Platform.OS === 'ios' ? 12 : 14,
    },
    accept: {
        padding: 10,
        minWidth: 85,
        borderRadius: 4,
        marginHorizontal: 5,
    },
    acceptText: {
        color: 'white',
        lineHeight: 20,
        textAlign: 'center',
        fontSize: Platform.OS === 'ios' ? 12 : 14,
    },
    btnTran: {
        marginHorizontal: 10,
    },
    loadingIndicator: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        bottom: '300%',
        alignSelf: 'center',
        left: 0,
        right: 0,
        zIndex: 10,
    },
});
export default CredentialButtons;
