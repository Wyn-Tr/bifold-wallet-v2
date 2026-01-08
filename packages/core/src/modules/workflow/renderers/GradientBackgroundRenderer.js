/**
 * GradientBackgroundRenderer
 *
 * Renders a gradient background for the chat screen.
 * Ported from bifold-wallet-dc.
 */
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../contexts/theme';
// Note: LinearGradient from react-native-linear-gradient may need to be installed
// If not available, falls back to View with background color
let LinearGradient;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    LinearGradient = require('react-native-linear-gradient').default;
}
catch {
    LinearGradient = null;
}
/**
 * Gradient background component
 */
export const GradientBackground = ({ children, style }) => {
    const theme = useTheme();
    // Try to get gradient config, fallback to solid color if not available
    const gradientConfig = theme.OnboardingTheme.gradientBackground;
    if (LinearGradient && gradientConfig) {
        const { colors, start, end } = gradientConfig;
        return (<LinearGradient colors={colors} start={start} end={end} style={[{ flex: 1 }, style]}>
        {children}
      </LinearGradient>);
    }
    // Fallback to simple View with background color
    return (<View style={[{ flex: 1, backgroundColor: theme.ColorPalette.brand.primaryBackground }, style]}>
      {children}
    </View>);
};
/**
 * Gradient background renderer class implementing IChatBackgroundRenderer
 */
export class GradientBackgroundRenderer {
    style;
    constructor(style) {
        this.style = style;
    }
    render(children) {
        return <GradientBackground style={this.style}>{children}</GradientBackground>;
    }
}
/**
 * Factory function to create a GradientBackgroundRenderer
 */
export function createGradientBackgroundRenderer(style) {
    return new GradientBackgroundRenderer(style);
}
export default GradientBackground;
