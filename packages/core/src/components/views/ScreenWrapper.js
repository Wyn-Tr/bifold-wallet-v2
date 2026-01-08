import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import KeyboardView from './KeyboardView';
import { useTheme } from '../../contexts/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
/**
 * Wraps content in a SafeAreaView and optionally a KeyboardView, and provides a container for controls.
 */
const ScreenWrapper = ({ children, controls, keyboardActive = false, edges = ['bottom', 'left', 'right'], style, scrollable = true, scrollViewContainerStyle, controlsContainerStyle, padded = true, }) => {
    const { Spacing, ColorPalette } = useTheme();
    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: ColorPalette.brand.primaryBackground,
        },
    });
    // Build scroll content style
    const scrollStyle = [padded && { padding: Spacing.md }, scrollViewContainerStyle];
    // Build controls style with automatic gap between buttons
    const controlsStyle = [
        { gap: Spacing.md },
        padded && { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
        controlsContainerStyle,
    ];
    const renderScrollableContent = () => {
        if (!scrollable) {
            return children;
        }
        return (<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={scrollStyle}>
        {children}
      </ScrollView>);
    };
    // KeyboardView has its own SafeAreaView, so we don't need to double-wrap
    if (keyboardActive) {
        return (<SafeAreaView style={[styles.container, style]} edges={edges}>
        <KeyboardView>
          <View style={scrollStyle}>{children}</View>
          {controls && <View style={[controlsStyle, { marginTop: 'auto' }]}>{controls}</View>}
        </KeyboardView>
      </SafeAreaView>);
    }
    return (<SafeAreaView style={[styles.container, style]} edges={edges}>
      {renderScrollableContent()}
      {controls && <View style={controlsStyle}>{controls}</View>}
    </SafeAreaView>);
};
export default ScreenWrapper;
