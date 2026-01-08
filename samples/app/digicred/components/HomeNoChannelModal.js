import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { GradientBackground, DigiCredButton } from '../components';
import { DigiCredColors } from '../theme';
const SCREEN_WIDTH = Dimensions.get('window').width;
const HomeNoChannelModal = ({ visible, onClose, content }) => {
    const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
    useEffect(() => {
        if (visible) {
            slideAnim.setValue(SCREEN_WIDTH);
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [slideAnim, visible]);
    const handleClose = () => {
        Animated.timing(slideAnim, {
            toValue: SCREEN_WIDTH,
            duration: 500,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };
    if (!visible)
        return null;
    return (<Animated.View style={[styles.modalContainer, { transform: [{ translateX: slideAnim }] }]}>
      <GradientBackground>
        <View style={styles.modalContentWrapper}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{content.title}</Text>
            <Text style={styles.modalDescription}>{content.description}</Text>
            <DigiCredButton title="CLOSE" onPress={handleClose} variant="secondary" customStyle={styles.closeButton} customTextStyle={styles.closeButtonText}/>
          </View>
        </View>
      </GradientBackground>
    </Animated.View>);
};
const styles = StyleSheet.create({
    modalContainer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 0,
        width: '100%',
        zIndex: 1000,
    },
    modalContentWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    modalContent: {
        backgroundColor: DigiCredColors.homeNoChannels.itemBackground,
        borderRadius: 16,
        padding: 24,
        width: '95%',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 0.48,
        shadowRadius: 12,
        elevation: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: DigiCredColors.text.homePrimary,
        marginBottom: 12,
        textAlign: 'left',
    },
    modalDescription: {
        fontSize: 16,
        fontWeight: '400',
        color: DigiCredColors.homeNoChannels.itemDescription,
        lineHeight: 20,
        marginBottom: 24,
        textAlign: 'left',
    },
    closeButton: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: DigiCredColors.text.homePrimary,
        borderRadius: 25,
        paddingHorizontal: 32,
        paddingVertical: 12,
        alignSelf: 'flex-start',
        height: 45,
    },
    closeButtonText: {
        color: DigiCredColors.text.homePrimary,
        fontSize: 16,
        fontWeight: '600',
    },
});
export default HomeNoChannelModal;
