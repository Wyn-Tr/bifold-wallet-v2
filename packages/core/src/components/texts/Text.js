import React from 'react';
import { Text as T, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/theme';
const Text = ({ children, style }) => {
    const { TextTheme } = useTheme();
    const styles = StyleSheet.create({
        text: {
            color: TextTheme.normal.color,
        },
    });
    return <T style={[styles.text, style]}>{children}</T>;
};
export default Text;
