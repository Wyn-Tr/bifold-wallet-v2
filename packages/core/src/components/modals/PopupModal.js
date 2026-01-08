import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../contexts/theme';
import InfoBox from '../misc/InfoBox';
import SafeAreaModal from './SafeAreaModal';
const PopupModal = ({ title, bodyContent, description, message, onCallToActionPressed, notificationType, onCallToActionLabel, }) => {
    const { ColorPalette } = useTheme();
    const styles = StyleSheet.create({
        modalCenter: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: ColorPalette.notification.popupOverlay,
            padding: 20,
        },
    });
    return (<SafeAreaModal transparent>
      <View style={styles.modalCenter}>
        <InfoBox notificationType={notificationType} title={title} description={description} message={message} bodyContent={bodyContent} onCallToActionLabel={onCallToActionLabel} onCallToActionPressed={onCallToActionPressed}/>
      </View>
    </SafeAreaModal>);
};
export default PopupModal;
