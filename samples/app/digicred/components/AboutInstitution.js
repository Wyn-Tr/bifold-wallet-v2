import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
const AboutInstitution = ({ title, content }) => {
    return (<View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.content}>{content}</Text>
    </View>);
};
const styles = StyleSheet.create({
    card: {
        display: 'flex',
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        alignSelf: 'stretch',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#004D4D',
        backgroundColor: '#25272A',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        elevation: 3,
        width: '90%',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        margin: 0,
    },
    content: {
        fontSize: 14,
        color: '#fff',
        margin: 0,
    },
});
export default AboutInstitution;
