import React, { useState, useEffect } from 'react';
import { Modal, Animated, Text, TouchableOpacity, View, StyleSheet, Easing } from 'react-native';
import CloseSnackMessage from '../assets/CloseSnackMessage.svg';
const SnackbarModal = ({ message, visible, onDismiss, type = 'error' }) => {
    const [slideAnim] = useState(new Animated.Value(100));
    const [isVisible, setIsVisible] = useState(visible);
    const backgroundColor = {
        error: '#FF4445',
        success: '#6666CC',
        info: '#007AFF',
        warning: '#FF9533',
    }[type];
    useEffect(() => {
        let timer;
        if (visible) {
            setIsVisible(true);
            showSnackbar();
            // ⏲ Auto-dismiss after 4 seconds
            timer = setTimeout(() => {
                hideSnackbar();
            }, 6000);
        }
        return () => clearTimeout(timer);
    }, [visible]); // eslint-disable-line
    const showSnackbar = () => {
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();
    };
    const hideSnackbar = () => {
        Animated.timing(slideAnim, {
            toValue: 100,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start(() => {
            setIsVisible(false);
            onDismiss();
        });
    };
    const handleDismiss = () => {
        hideSnackbar();
    };
    if (!isVisible)
        return null;
    return (<Modal transparent={true} visible={isVisible} onRequestClose={hideSnackbar} animationType="none">
      <View style={styles.container}>
        <Animated.View style={[styles.snackbar, { backgroundColor, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.snackbarText} numberOfLines={3}>
            {message}
          </Text>
          <TouchableOpacity onPress={handleDismiss}>
            <CloseSnackMessage width={20}/>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>);
};
const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 10,
        left: 0,
        right: 0,
        padding: 16,
    },
    snackbar: {
        borderRadius: 8,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    snackbarText: {
        color: '#FFF',
        flex: 1,
        marginRight: 8,
    },
});
export default SnackbarModal;
