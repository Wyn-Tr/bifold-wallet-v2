/**
 * useThemeRegistry Hook
 *
 * Provides access to the theme registry from React components.
 */
import { useContext } from 'react';
import { ThemeRegistryContext } from '../contexts/ThemeRegistryContext';
// Note: ThemeRegistryContext is exported from contexts/ThemeRegistryContext.ts directly
// Do NOT re-export here to avoid circular import issues
/**
 * Hook to get the theme registry
 * @throws Error if used outside ThemeRegistryProvider
 */
export function useThemeRegistry() {
    const registry = useContext(ThemeRegistryContext);
    if (!registry) {
        throw new Error('useThemeRegistry must be used within a ThemeRegistryProvider');
    }
    return registry;
}
/**
 * Hook to optionally get the theme registry (returns undefined if not available)
 */
export function useOptionalThemeRegistry() {
    return useContext(ThemeRegistryContext);
}
