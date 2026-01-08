/**
 * useCardTheme Hook
 *
 * Returns the appropriate card theme for a credential based on matching patterns.
 */
import { useMemo } from 'react';
import { useOptionalThemeRegistry } from './useThemeRegistry';
/**
 * Default card theme (used when no registry is available)
 */
const defaultCardTheme = {
    id: 'default',
    matcher: { fallback: true },
    displayName: 'Default',
    layout: 'default',
    colors: {
        primary: '#42803E',
        secondary: '#FFFFFF',
        background: '#FFFFFF',
        text: '#1A1A1A',
        textSecondary: '#666666',
        bottomLine: '#42803E',
        accent: '#FCBA19',
    },
    typography: {
        issuerName: {
            fontSize: 12,
            fontWeight: '600',
            color: '#666666',
        },
        credentialName: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#1A1A1A',
        },
    },
    assets: {},
    layoutConfig: {
        container: {
            borderRadius: 12,
            padding: 16,
            aspectRatio: 1.6,
        },
        showIssuerName: true,
        showCredentialName: true,
        showTimestamp: true,
        showAttributes: true,
        maxAttributes: 3,
    },
};
/**
 * Hook to get card theme for a credential
 *
 * @param credential - Credential information for matching
 * @returns Matched card theme
 *
 * @example
 * ```tsx
 * const cardTheme = useCardTheme({
 *   credDefId: 'PCS:3:CL:123:student_id',
 *   issuerName: 'Pender County Schools',
 * })
 *
 * // Use theme colors
 * <View style={{ backgroundColor: cardTheme.colors.background }}>
 *   <Text style={{ color: cardTheme.colors.text }}>
 *     {credentialName}
 *   </Text>
 * </View>
 * ```
 */
export function useCardTheme(credential) {
    const registry = useOptionalThemeRegistry();
    return useMemo(() => {
        if (!registry) {
            return defaultCardTheme;
        }
        const cardThemeRegistry = registry.getCardThemeRegistry();
        return cardThemeRegistry.getTheme(credential);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        registry,
        credential,
        credential.credDefId,
        credential.issuerName,
        credential.schemaName,
        credential.connectionLabel,
    ]);
}
/**
 * Hook to get card theme by ID
 *
 * @param id - Card theme ID
 * @returns Card theme or default if not found
 */
export function useCardThemeById(id) {
    const registry = useOptionalThemeRegistry();
    return useMemo(() => {
        if (!registry) {
            return defaultCardTheme;
        }
        const cardThemeRegistry = registry.getCardThemeRegistry();
        return cardThemeRegistry.getById(id) ?? cardThemeRegistry.getDefault();
    }, [registry, id]);
}
/**
 * Hook to get all available card themes
 *
 * @returns Array of all registered card themes
 */
export function useCardThemes() {
    const registry = useOptionalThemeRegistry();
    return useMemo(() => {
        if (!registry) {
            return [defaultCardTheme];
        }
        return registry.getCardThemeRegistry().list();
    }, [registry]);
}
