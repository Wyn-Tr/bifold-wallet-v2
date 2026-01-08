import React from 'react';
import { StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
const GradientBackground = ({ children, style }) => {
    return (<LinearGradient colors={['#004D4D', '#005F5F', '#1A0F3D']} locations={[0, 0.5, 1]} style={[styles.gradient, style]} start={{ x: -0.28, y: 0.3 }} end={{ x: 1.28, y: 0.7 }}>
      {children}
    </LinearGradient>);
};
const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
});
export default GradientBackground;
