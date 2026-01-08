import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import CloseSnackMessage from '../assets/CloseSnackMessage.svg';
const SnackMessage = ({ message, type }) => {
    const [isVisible, setIsVisible] = useState(true);
    const backgroundColor = {
        error: '#FF4445',
        success: '#6666CC',
        info: '#007AFF',
        warning: '#FF9533',
    }[type];
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 6000);
        return () => {
            clearTimeout(timer);
        };
    }, []);
    const handleDismiss = () => {
        setIsVisible(false);
    };
    if (!isVisible)
        return null;
    return (<View style={[styles.container, { backgroundColor }]}>
      <Text style={styles.messageText}>{message}</Text>
      <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
        <CloseSnackMessage width={16} height={16}/>
      </TouchableOpacity>
    </View>);
};
const styles = StyleSheet.create({
    container: {
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginHorizontal: 16,
        marginVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    messageText: {
        color: '#FFF',
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        marginRight: 8,
    },
    closeButton: {
        padding: 4,
    },
});
export default SnackMessage;
