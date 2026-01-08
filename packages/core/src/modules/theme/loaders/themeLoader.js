/**
 * Theme Loader
 *
 * Utilities for loading and resolving theme configurations.
 * Supports variable interpolation and theme inheritance.
 */
/**
 * Resolve variable references in a value
 * Supports ${colorPalette.brand.primary} style references
 */
export function resolveVariables(value, context) {
    if (typeof value === 'string') {
        // Match ${path.to.value} patterns
        const variablePattern = /\$\{([^}]+)\}/g;
        return value.replace(variablePattern, (_, path) => {
            const parts = path.split('.');
            let result = context;
            for (const part of parts) {
                if (result && typeof result === 'object' && part in result) {
                    result = result[part];
                }
                else {
                    return `\${${path}}`;
                }
            }
            return String(result);
        });
    }
    if (Array.isArray(value)) {
        return value.map((item) => resolveVariables(item, context));
    }
    if (value && typeof value === 'object') {
        const resolved = {};
        for (const [key, val] of Object.entries(value)) {
            resolved[key] = resolveVariables(val, context);
        }
        return resolved;
    }
    return value;
}
/**
 * Load a theme bundle from JSON config
 */
export function loadThemeBundle(config, variableContext) {
    // Resolve all variables in the config
    const resolved = variableContext
        ? resolveVariables(config, variableContext)
        : config;
    return {
        manifest: resolved.manifest,
        cardThemes: resolved.cardThemes || [],
        backgrounds: resolved.backgrounds || [],
        tabBar: resolved.tabBar,
    };
}
/**
 * Create a variable context from color palette
 */
export function createVariableContext(colorPalette) {
    return {
        colorPalette,
    };
}
/**
 * Parse YAML theme content (requires yaml package at build time)
 * For runtime, use pre-converted JSON
 */
export async function parseYamlTheme(yamlContent) {
    // Dynamic import to avoid bundling yaml parser if not needed
    try {
        const yaml = await import('yaml');
        return yaml.parse(yamlContent);
    }
    catch {
        throw new Error('YAML parsing not available. Use pre-converted JSON themes.');
    }
}
/**
 * Validate theme manifest structure
 */
export function validateThemeManifest(manifest) {
    if (!manifest || typeof manifest !== 'object') {
        return false;
    }
    const m = manifest;
    // Required fields
    if (!m.meta || typeof m.meta !== 'object')
        return false;
    if (!m.features || typeof m.features !== 'object')
        return false;
    const meta = m.meta;
    if (typeof meta.id !== 'string')
        return false;
    if (typeof meta.name !== 'string')
        return false;
    if (typeof meta.version !== 'string')
        return false;
    return true;
}
export default {
    resolveVariables,
    loadThemeBundle,
    createVariableContext,
    parseYamlTheme,
    validateThemeManifest,
};
