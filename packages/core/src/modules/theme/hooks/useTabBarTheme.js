/**
 * useTabBarTheme Hook
 *
 * Returns the current tab bar configuration.
 */
import { useMemo } from 'react';
import { useOptionalThemeRegistry } from './useThemeRegistry';
/**
 * Default tab bar configuration
 */
const defaultTabBarConfig = {
    variant: 'default',
    style: {
        height: 80,
        backgroundColor: '#313132',
        paddingBottom: 20,
        paddingTop: 10,
        borderTopWidth: 0,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -3 },
        shadowRadius: 6,
        shadowOpacity: 0.1,
    },
    tabItem: {
        container: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 8,
        },
        text: {
            fontSize: 10,
            fontWeight: '600',
            marginTop: 4,
        },
        icon: {
            size: 24,
        },
    },
    colors: {
        activeTintColor: '#FFFFFF',
        inactiveTintColor: '#FFFFFF66',
        activeBackgroundColor: 'transparent',
        inactiveBackgroundColor: 'transparent',
    },
    badge: {
        backgroundColor: '#EF4444',
        textColor: '#FFFFFF',
        size: 18,
        fontSize: 11,
        fontWeight: 'bold',
        borderRadius: 9,
        minWidth: 18,
        position: { top: -2, right: -6 },
    },
    tabs: [],
};
/**
 * Hook to get the current tab bar configuration
 *
 * @returns Tab bar configuration
 *
 * @example
 * ```tsx
 * const TabStack = () => {
 *   const tabBarConfig = useTabBarTheme()
 *
 *   return (
 *     <Tab.Navigator
 *       tabBar={(props) => (
 *         <ThemedTabBar {...props} config={tabBarConfig} />
 *       )}
 *     >
 *       {screens}
 *     </Tab.Navigator>
 *   )
 * }
 * ```
 */
export function useTabBarTheme() {
    const registry = useOptionalThemeRegistry();
    return useMemo(() => {
        if (!registry) {
            return defaultTabBarConfig;
        }
        const tabBarRegistry = registry.getTabBarRegistry();
        return tabBarRegistry.getConfig();
    }, [registry]);
}
/**
 * Hook to get the current tab bar style (resolved from variant)
 *
 * @returns Tab bar style
 */
export function useTabBarStyle() {
    const registry = useOptionalThemeRegistry();
    return useMemo(() => {
        if (!registry) {
            return defaultTabBarConfig.style;
        }
        const tabBarRegistry = registry.getTabBarRegistry();
        return tabBarRegistry.getActiveStyle();
    }, [registry]);
}
/**
 * Hook to get the current tab bar variant
 *
 * @returns Current variant
 */
export function useTabBarVariant() {
    const registry = useOptionalThemeRegistry();
    return useMemo(() => {
        if (!registry) {
            return 'default';
        }
        const tabBarRegistry = registry.getTabBarRegistry();
        return tabBarRegistry.getVariant();
    }, [registry]);
}
/**
 * Hook to get available tab bar variants
 *
 * @returns Array of variant names
 */
export function useTabBarVariants() {
    const registry = useOptionalThemeRegistry();
    return useMemo(() => {
        if (!registry) {
            return ['default'];
        }
        const tabBarRegistry = registry.getTabBarRegistry();
        return tabBarRegistry.listVariants();
    }, [registry]);
}
