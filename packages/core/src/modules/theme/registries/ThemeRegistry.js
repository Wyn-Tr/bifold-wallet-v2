/**
 * Theme Registry
 *
 * Central registry for managing theme manifests and building resolved themes.
 * Follows the same patterns as WorkflowRegistry.
 */
import { CardThemeRegistry } from './CardThemeRegistry';
import { BackgroundRegistry } from './BackgroundRegistry';
import { TabBarRegistry } from './TabBarRegistry';
/**
 * Default tab bar configuration
 */
const createDefaultTabBarConfig = () => ({
    variant: 'default',
    style: {
        height: 80,
        backgroundColor: '#313132',
        paddingBottom: 20,
    },
    tabItem: {
        container: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        text: {
            fontSize: 10,
            fontWeight: 'bold',
        },
        icon: {
            size: 24,
        },
    },
    colors: {
        activeTintColor: '#FFFFFF',
        inactiveTintColor: '#666666',
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
});
/**
 * Theme Registry Implementation
 */
export class ThemeRegistry {
    manifests = new Map();
    builtThemes = new Map();
    activeThemeId;
    // Sub-registries
    cardThemeRegistry;
    backgroundRegistry;
    tabBarRegistry;
    constructor() {
        this.cardThemeRegistry = new CardThemeRegistry();
        this.backgroundRegistry = new BackgroundRegistry();
        this.tabBarRegistry = new TabBarRegistry();
    }
    // ============================================================================
    // REGISTRATION
    // ============================================================================
    register(manifest) {
        this.manifests.set(manifest.meta.id, manifest);
        // Invalidate cache
        this.builtThemes.delete(manifest.meta.id);
        // Set as active if it's the first theme
        if (!this.activeThemeId) {
            this.activeThemeId = manifest.meta.id;
        }
    }
    registerMultiple(manifests) {
        manifests.forEach((m) => this.register(m));
    }
    unregister(id) {
        this.manifests.delete(id);
        this.builtThemes.delete(id);
        // Clear active if it was unregistered
        if (this.activeThemeId === id) {
            this.activeThemeId = undefined;
        }
    }
    // ============================================================================
    // RETRIEVAL
    // ============================================================================
    get(id) {
        if (!this.manifests.has(id)) {
            return undefined;
        }
        return this.build(id);
    }
    getManifest(id) {
        return this.manifests.get(id);
    }
    list() {
        return Array.from(this.manifests.values()).map((m) => ({
            id: m.meta.id,
            name: m.meta.name,
            version: m.meta.version,
            description: m.meta.description,
        }));
    }
    has(id) {
        return this.manifests.has(id);
    }
    // ============================================================================
    // ACTIVE THEME
    // ============================================================================
    setActive(id) {
        if (!this.manifests.has(id)) {
            return;
        }
        this.activeThemeId = id;
        // Build and update sub-registries
        const resolved = this.build(id);
        if (resolved) {
            this.updateSubRegistries(resolved);
        }
    }
    getActive() {
        if (!this.activeThemeId) {
            return undefined;
        }
        return this.build(this.activeThemeId);
    }
    getActiveId() {
        return this.activeThemeId;
    }
    // ============================================================================
    // BUILDING
    // ============================================================================
    build(manifestId) {
        // Check cache
        if (this.builtThemes.has(manifestId)) {
            return this.builtThemes.get(manifestId);
        }
        const manifest = this.manifests.get(manifestId);
        if (!manifest) {
            return undefined;
        }
        // Create resolved theme
        const resolved = {
            id: manifest.meta.id,
            name: manifest.meta.name,
            manifest,
            cardThemes: [],
            backgrounds: [],
            screenBackgrounds: {},
            tabBarConfig: createDefaultTabBarConfig(),
            screenThemes: new Map(),
        };
        // Cache
        this.builtThemes.set(manifestId, resolved);
        return resolved;
    }
    // ============================================================================
    // SUB-REGISTRIES
    // ============================================================================
    getCardThemeRegistry() {
        return this.cardThemeRegistry;
    }
    getBackgroundRegistry() {
        return this.backgroundRegistry;
    }
    getTabBarRegistry() {
        return this.tabBarRegistry;
    }
    // ============================================================================
    // CONFIGURATION INJECTION
    // ============================================================================
    setCardThemes(themes) {
        this.cardThemeRegistry.clear();
        themes.forEach((t) => this.cardThemeRegistry.register(t));
        // Update active resolved theme
        if (this.activeThemeId && this.builtThemes.has(this.activeThemeId)) {
            const resolved = this.builtThemes.get(this.activeThemeId);
            resolved.cardThemes = themes;
        }
    }
    setBackgrounds(backgrounds) {
        this.backgroundRegistry.clear();
        backgrounds.forEach((b) => this.backgroundRegistry.register(b));
        // Build screen mapping from screenIds in each background config
        const screenMapping = {};
        backgrounds.forEach((bg) => {
            if (bg.screenIds) {
                bg.screenIds.forEach((screenId) => {
                    if (screenId !== '*') {
                        screenMapping[screenId] = bg.id;
                    }
                });
            }
        });
        this.backgroundRegistry.setScreenMapping(screenMapping);
        // Update active resolved theme
        if (this.activeThemeId && this.builtThemes.has(this.activeThemeId)) {
            const resolved = this.builtThemes.get(this.activeThemeId);
            resolved.backgrounds = backgrounds;
            resolved.screenBackgrounds = screenMapping;
        }
    }
    setScreenBackgrounds(mapping) {
        this.backgroundRegistry.setScreenMapping(mapping);
        // Update active resolved theme
        if (this.activeThemeId && this.builtThemes.has(this.activeThemeId)) {
            const resolved = this.builtThemes.get(this.activeThemeId);
            resolved.screenBackgrounds = mapping;
        }
    }
    setTabBarConfig(config) {
        this.tabBarRegistry.setConfig(config);
        // Update active resolved theme
        if (this.activeThemeId && this.builtThemes.has(this.activeThemeId)) {
            const resolved = this.builtThemes.get(this.activeThemeId);
            resolved.tabBarConfig = config;
        }
    }
    // ============================================================================
    // PRIVATE METHODS
    // ============================================================================
    updateSubRegistries(resolved) {
        // Update card themes
        if (resolved.cardThemes.length > 0) {
            this.cardThemeRegistry.clear();
            resolved.cardThemes.forEach((t) => this.cardThemeRegistry.register(t));
        }
        // Update backgrounds
        if (resolved.backgrounds.length > 0) {
            this.backgroundRegistry.clear();
            resolved.backgrounds.forEach((b) => this.backgroundRegistry.register(b));
        }
        // Update screen backgrounds
        if (Object.keys(resolved.screenBackgrounds).length > 0) {
            this.backgroundRegistry.setScreenMapping(resolved.screenBackgrounds);
        }
        // Update tab bar
        if (resolved.tabBarConfig) {
            this.tabBarRegistry.setConfig(resolved.tabBarConfig);
        }
    }
}
/**
 * Factory function to create a ThemeRegistry
 */
export function createThemeRegistry() {
    return new ThemeRegistry();
}
