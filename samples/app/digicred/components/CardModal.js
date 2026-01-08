import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DigiCredColors } from '../theme';
const CardModal = ({ children, style, customStyle, fullHeight = false, centered = false, }) => {
    const cardStyle = [
        styles.card,
        fullHeight && styles.fullHeight,
        centered && styles.centered,
        customStyle,
        style,
    ];
    return <View style={cardStyle}>{children}</View>;
};
const styles = StyleSheet.create({
    card: {
        backgroundColor: DigiCredColors.homeNoChannels.itemBackground,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 40,
    },
    fullHeight: {
        flex: 1,
        marginTop: 60,
    },
    centered: {
        borderRadius: 24,
    },
});
export default CardModal;
