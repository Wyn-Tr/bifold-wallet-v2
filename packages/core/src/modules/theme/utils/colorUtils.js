/**
 * Color Utilities
 *
 * Helper functions for color manipulation.
 */
/**
 * Parse a hex color to RGB components
 *
 * @param hex - Hex color string (e.g., "#FF5733" or "#F53")
 * @returns RGB object or null if invalid
 */
export function hexToRgb(hex) {
    // Remove # if present
    const cleanHex = hex.replace(/^#/, '');
    // Handle shorthand hex (e.g., #F53)
    let fullHex = cleanHex;
    if (cleanHex.length === 3) {
        fullHex = cleanHex
            .split('')
            .map((c) => c + c)
            .join('');
    }
    // Validate hex length
    if (fullHex.length !== 6) {
        return null;
    }
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
}
/**
 * Convert RGB to hex color
 *
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns Hex color string
 */
export function rgbToHex(r, g, b) {
    return ('#' +
        [r, g, b]
            .map((x) => {
            const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        })
            .join(''));
}
/**
 * Add opacity to a hex color
 *
 * @param hex - Hex color string
 * @param opacity - Opacity value (0-1)
 * @returns Hex color with alpha (e.g., "#FF573380")
 */
export function addOpacity(hex, opacity) {
    const cleanHex = hex.replace(/^#/, '');
    const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
        .toString(16)
        .padStart(2, '0');
    return `#${cleanHex}${alpha}`;
}
/**
 * Lighten a hex color
 *
 * @param hex - Hex color string
 * @param amount - Amount to lighten (0-1)
 * @returns Lightened hex color
 */
export function lighten(hex, amount) {
    const rgb = hexToRgb(hex);
    if (!rgb)
        return hex;
    const factor = 1 + amount;
    return rgbToHex(Math.round(rgb.r * factor), Math.round(rgb.g * factor), Math.round(rgb.b * factor));
}
/**
 * Darken a hex color
 *
 * @param hex - Hex color string
 * @param amount - Amount to darken (0-1)
 * @returns Darkened hex color
 */
export function darken(hex, amount) {
    const rgb = hexToRgb(hex);
    if (!rgb)
        return hex;
    const factor = 1 - amount;
    return rgbToHex(Math.round(rgb.r * factor), Math.round(rgb.g * factor), Math.round(rgb.b * factor));
}
/**
 * Check if a color is dark (for determining text color)
 *
 * @param hex - Hex color string
 * @returns True if color is dark
 */
export function isDark(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb)
        return false;
    // Using relative luminance formula
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance < 0.5;
}
/**
 * Get contrasting text color (black or white)
 *
 * @param backgroundColor - Hex color string
 * @returns "#FFFFFF" or "#000000"
 */
export function getContrastColor(backgroundColor) {
    return isDark(backgroundColor) ? '#FFFFFF' : '#000000';
}
/**
 * Parse a color string that may include opacity suffix
 * e.g., "#FF573380" or "#FF5733" with separate opacity
 *
 * @param color - Color string
 * @returns Object with color and opacity
 */
export function parseColorWithOpacity(color) {
    const cleanColor = color.replace(/^#/, '');
    if (cleanColor.length === 8) {
        // Has alpha channel
        const hex = cleanColor.substring(0, 6);
        const alpha = cleanColor.substring(6, 8);
        return {
            color: `#${hex}`,
            opacity: parseInt(alpha, 16) / 255,
        };
    }
    return {
        color: `#${cleanColor}`,
        opacity: 1,
    };
}
