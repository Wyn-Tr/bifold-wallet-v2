/**
 * Background Registry
 *
 * Manages background configurations for screens.
 */
/**
 * Create default background configuration
 */
function createDefaultBackground() {
    return {
        id: 'default',
        type: 'solid',
        color: '#000000',
    };
}
/**
 * Background Registry Implementation
 */
export class BackgroundRegistry {
    backgrounds = new Map();
    screenMapping = {};
    defaultBackground;
    constructor() {
        this.defaultBackground = createDefaultBackground();
        // Register default
        this.backgrounds.set('default', this.defaultBackground);
    }
    // ============================================================================
    // REGISTRATION
    // ============================================================================
    register(config) {
        this.backgrounds.set(config.id, config);
    }
    unregister(id) {
        if (id !== 'default') {
            this.backgrounds.delete(id);
        }
    }
    clear() {
        this.backgrounds.clear();
        this.screenMapping = {};
        this.defaultBackground = createDefaultBackground();
        this.backgrounds.set('default', this.defaultBackground);
    }
    // ============================================================================
    // RETRIEVAL
    // ============================================================================
    get(id) {
        return this.backgrounds.get(id);
    }
    getForScreen(screenId) {
        const backgroundId = this.screenMapping[screenId];
        if (backgroundId) {
            const bg = this.backgrounds.get(backgroundId);
            if (bg)
                return bg;
        }
        return this.defaultBackground;
    }
    getDefault() {
        return this.defaultBackground;
    }
    list() {
        return Array.from(this.backgrounds.values());
    }
    // ============================================================================
    // SCREEN MAPPING
    // ============================================================================
    setScreenMapping(mapping) {
        this.screenMapping = { ...mapping };
    }
    getScreenMapping() {
        return { ...this.screenMapping };
    }
    // ============================================================================
    // CONFIGURATION
    // ============================================================================
    setDefault(config) {
        this.defaultBackground = config;
        this.backgrounds.set('default', config);
    }
}
/**
 * Factory function
 */
export function createBackgroundRegistry() {
    return new BackgroundRegistry();
}
