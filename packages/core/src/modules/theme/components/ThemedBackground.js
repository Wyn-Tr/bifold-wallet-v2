/**
 * Themed Background Component
 *
 * Renders a background based on the theme configuration.
 * Supports solid colors, gradients, and images.
 *
 * NOTE: This component is designed to be standalone to avoid circular imports.
 * It creates its own context reference inline rather than importing from the module.
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
// Note: Standalone context was removed as it was unused
// Optional: LinearGradient from react-native-linear-gradient
// We'll make it optional to avoid hard dependency
let LinearGradient = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    LinearGradient = require('react-native-linear-gradient').default;
}
catch {
    // Linear gradient not available
}
/**
 * Render a solid color background
 */
const SolidBackground = ({ color, style, children }) => (<View style={[styles.container, { backgroundColor: color }, style]}>
    {children}
  </View>);
/**
 * Render a gradient background
 */
const GradientBackground = ({ config, style, children }) => {
    if (!LinearGradient || !config.gradient) {
        // Fallback to first color as solid if LinearGradient not available
        const fallbackColor = config.gradient?.colors?.[0] || config.color || '#000000';
        return (<SolidBackground color={fallbackColor} style={style}>
        {children}
      </SolidBackground>);
    }
    const { colors, start, end, locations } = config.gradient;
    return (<LinearGradient colors={colors} start={start || { x: 0, y: 0 }} end={end || { x: 0, y: 1 }} locations={locations} style={[styles.container, style]}>
      {children}
    </LinearGradient>);
};
/**
 * Render an image background
 */
const ImageBackgroundComponent = ({ config, style, children }) => {
    if (!config.source) {
        return (<SolidBackground color="#000000" style={style}>
        {children}
      </SolidBackground>);
    }
    // For local assets, you'd need to handle require() differently
    // This handles remote URLs
    const source = config.source.startsWith('http')
        ? { uri: config.source }
        : { uri: config.source }; // Local would need different handling
    const imageStyle = [
        styles.container,
        style,
        config.opacity !== undefined && { opacity: config.opacity },
    ];
    return (<ImageBackground source={source} style={imageStyle} resizeMode={config.resizeMode || 'cover'}>
      {config.overlay ? (<ThemedBackgroundFromConfig config={{ ...config.overlay, id: 'overlay' }}>
          {children}
        </ThemedBackgroundFromConfig>) : (children)}
    </ImageBackground>);
};
/**
 * Render background from config
 */
const ThemedBackgroundFromConfig = ({ config, style, children }) => {
    switch (config.type) {
        case 'gradient':
            return (<GradientBackground config={config} style={style}>
          {children}
        </GradientBackground>);
        case 'image':
            return (<ImageBackgroundComponent config={config} style={style}>
          {children}
        </ImageBackgroundComponent>);
        case 'solid':
        default:
            return (<SolidBackground color={config.color || '#000000'} style={style}>
          {children}
        </SolidBackground>);
    }
};
/**
 * Default backgrounds for common screens (teal-dark theme)
 * These are hardcoded to avoid any external imports
 */
const screenBackgrounds = {
    default: {
        id: 'default',
        type: 'gradient',
        gradient: {
            type: 'linear',
            colors: ['#0A2E2E', '#051616'],
            start: { x: 0, y: 0 },
            end: { x: 0, y: 1 },
        },
    },
    home: {
        id: 'home',
        type: 'gradient',
        gradient: {
            type: 'linear',
            colors: ['#0D3D3D', '#0A2E2E', '#051616'],
            start: { x: 0.5, y: 0 },
            end: { x: 0.5, y: 1 },
            locations: [0, 0.5, 1],
        },
    },
    onboarding: {
        id: 'onboarding',
        type: 'gradient',
        gradient: {
            type: 'linear',
            colors: ['#1A5A5A', '#0D3D3D', '#0A2E2E'],
            start: { x: 0.5, y: 0.3 },
            end: { x: 0.5, y: 1 },
        },
    },
    splash: {
        id: 'splash',
        type: 'gradient',
        gradient: {
            type: 'linear',
            colors: ['#1A5A5A', '#0D3D3D', '#0A2E2E'],
            start: { x: 0.5, y: 0.3 },
            end: { x: 0.5, y: 1 },
        },
    },
    credentials: {
        id: 'credentials',
        type: 'gradient',
        gradient: {
            type: 'linear',
            colors: ['#0A2E2E', '#0D4D4D', '#0A2E2E'],
            start: { x: 0, y: 0 },
            end: { x: 1, y: 1 },
        },
    },
};
/**
 * Get background config for a screen ID
 */
function getBackgroundForScreen(screenId) {
    return screenBackgrounds[screenId] || screenBackgrounds.default;
}
/**
 * Themed Background Component
 *
 * @example
 * ```tsx
 * // Using screen ID (looks up from built-in backgrounds)
 * <ThemedBackground screenId="home">
 *   <HomeContent />
 * </ThemedBackground>
 *
 * // Using direct config
 * <ThemedBackground config={{
 *   id: 'custom',
 *   type: 'gradient',
 *   gradient: {
 *     type: 'linear',
 *     colors: ['#0A2E2E', '#1A4A4A'],
 *     start: { x: 0, y: 0 },
 *     end: { x: 0, y: 1 },
 *   }
 * }}>
 *   <Content />
 * </ThemedBackground>
 * ```
 */
export const ThemedBackground = ({ screenId, config: directConfig, style, children, }) => {
    // Get background from built-in screen backgrounds
    const builtInBackground = useMemo(() => {
        return getBackgroundForScreen(screenId || 'default');
    }, [screenId]);
    // Use direct config if provided, otherwise use built-in background
    const config = directConfig || builtInBackground;
    return (<ThemedBackgroundFromConfig config={config} style={style}>
      {children}
    </ThemedBackgroundFromConfig>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
export default ThemedBackground;
