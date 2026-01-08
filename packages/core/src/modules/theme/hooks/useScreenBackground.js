/**
 * useScreenBackground Hook
 *
 * Returns the background configuration for a screen.
 */
import { useMemo } from 'react';
import { useOptionalThemeRegistry } from './useThemeRegistry';
/**
 * Default background (solid black)
 */
const defaultBackground = {
    id: 'default',
    type: 'solid',
    color: '#000000',
};
/**
 * Hook to get background configuration for a screen
 *
 * @param screenId - Screen identifier
 * @returns Background configuration
 *
 * @example
 * ```tsx
 * const HomeScreen = () => {
 *   const background = useScreenBackground('home')
 *
 *   return (
 *     <ThemedBackground config={background}>
 *       {children}
 *     </ThemedBackground>
 *   )
 * }
 * ```
 */
export function useScreenBackground(screenId) {
    const registry = useOptionalThemeRegistry();
    return useMemo(() => {
        if (!registry) {
            return defaultBackground;
        }
        const backgroundRegistry = registry.getBackgroundRegistry();
        return backgroundRegistry.getForScreen(screenId);
    }, [registry, screenId]);
}
/**
 * Hook to get a background configuration by ID
 *
 * @param id - Background ID
 * @returns Background configuration or default
 */
export function useBackgroundById(id) {
    const registry = useOptionalThemeRegistry();
    return useMemo(() => {
        if (!registry) {
            return defaultBackground;
        }
        const backgroundRegistry = registry.getBackgroundRegistry();
        return backgroundRegistry.get(id) ?? backgroundRegistry.getDefault();
    }, [registry, id]);
}
/**
 * Hook to get all available backgrounds
 *
 * @returns Array of all registered backgrounds
 */
export function useBackgrounds() {
    const registry = useOptionalThemeRegistry();
    return useMemo(() => {
        if (!registry) {
            return [defaultBackground];
        }
        return registry.getBackgroundRegistry().list();
    }, [registry]);
}
