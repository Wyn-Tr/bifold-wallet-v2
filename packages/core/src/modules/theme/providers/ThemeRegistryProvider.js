/**
 * Theme Registry Provider
 *
 * Provides the theme registry to the React component tree.
 */
import React, { useMemo, useEffect } from 'react';
import { ThemeRegistryContext } from '../contexts/ThemeRegistryContext';
/**
 * Theme Registry Provider Component
 *
 * @example
 * ```tsx
 * import { ThemeRegistry, ThemeRegistryProvider } from '@bifold/core/modules/theme'
 * import { bifoldTheme } from '@bifold/core/theme'
 *
 * const registry = new ThemeRegistry(bifoldTheme)
 *
 * const App = () => (
 *   <ThemeRegistryProvider
 *     registry={registry}
 *     initialThemeId="teal-dark"
 *     manifests={bundledThemes}
 *   >
 *     <MainApp />
 *   </ThemeRegistryProvider>
 * )
 * ```
 */
export const ThemeRegistryProvider = ({ registry, initialThemeId, manifests, cardThemes, backgrounds, screenBackgrounds, tabBarConfig, children, }) => {
    // Register manifests on mount
    useEffect(() => {
        if (manifests && manifests.length > 0) {
            registry.registerMultiple(manifests);
        }
    }, [registry, manifests]);
    // Register card themes
    useEffect(() => {
        if (cardThemes && cardThemes.length > 0) {
            registry.setCardThemes(cardThemes);
        }
    }, [registry, cardThemes]);
    // Register backgrounds
    useEffect(() => {
        if (backgrounds && backgrounds.length > 0) {
            registry.setBackgrounds(backgrounds);
        }
    }, [registry, backgrounds]);
    // Set screen backgrounds mapping
    useEffect(() => {
        if (screenBackgrounds) {
            registry.setScreenBackgrounds(screenBackgrounds);
        }
    }, [registry, screenBackgrounds]);
    // Set tab bar config
    useEffect(() => {
        if (tabBarConfig) {
            registry.setTabBarConfig(tabBarConfig);
        }
    }, [registry, tabBarConfig]);
    // Set initial theme
    useEffect(() => {
        if (initialThemeId && registry.has(initialThemeId)) {
            registry.setActive(initialThemeId);
        }
    }, [registry, initialThemeId]);
    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => registry, [registry]);
    return (<ThemeRegistryContext.Provider value={contextValue}>
      {children}
    </ThemeRegistryContext.Provider>);
};
export default ThemeRegistryProvider;
