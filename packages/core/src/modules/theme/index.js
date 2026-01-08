/**
 * Theme Module
 *
 * Modular theming system for Bifold Wallet.
 * Provides YAML-based theme configuration with registries for:
 * - Card themes (per-issuer credential styling)
 * - Backgrounds (screen backgrounds)
 * - Tab bars (navigation tab bar variants)
 *
 * @example
 * ```tsx
 * import {
 *   ThemeRegistry,
 *   ThemeRegistryProvider,
 *   useCardTheme,
 *   useScreenBackground,
 *   useTabBarTheme,
 *   ThemedBackground,
 *   ThemedTabBar,
 * } from '@bifold/core/modules/theme'
 * ```
 */
// Types
export * from './types';
// Registries
export { ThemeRegistry, createThemeRegistry, } from './registries/ThemeRegistry';
export { CardThemeRegistry, createCardThemeRegistry, } from './registries/CardThemeRegistry';
export { BackgroundRegistry, createBackgroundRegistry, } from './registries/BackgroundRegistry';
export { TabBarRegistry, createTabBarRegistry, } from './registries/TabBarRegistry';
// Context (separate file to avoid circular imports)
export { ThemeRegistryContext } from './contexts/ThemeRegistryContext';
// Hooks
export { useThemeRegistry, useOptionalThemeRegistry, } from './hooks/useThemeRegistry';
export { useCardTheme, useCardThemeById, useCardThemes, } from './hooks/useCardTheme';
export { useScreenBackground, useBackgroundById, useBackgrounds, } from './hooks/useScreenBackground';
export { useTabBarTheme, useTabBarStyle, useTabBarVariant, useTabBarVariants, } from './hooks/useTabBarTheme';
// Providers
export { ThemeRegistryProvider, } from './providers/ThemeRegistryProvider';
// Components
export { ThemedBackground, } from './components/ThemedBackground';
export { ThemedTabBar, } from './components/ThemedTabBar';
// Utilities
export { deepMerge, deepMergeAll } from './utils/deepMerge';
export { hexToRgb, rgbToHex, addOpacity, lighten, darken, isDark, getContrastColor, parseColorWithOpacity, } from './utils/colorUtils';
// Loaders
export { resolveVariables, loadThemeBundle, createVariableContext, parseYamlTheme, validateThemeManifest, } from './loaders/themeLoader';
// Pre-built Themes
export { tealDarkTheme, tealDarkColorPalette, TealDarkTheme, THEME_IDS, } from './themes';
