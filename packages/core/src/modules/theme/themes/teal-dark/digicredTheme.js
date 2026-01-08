/**
 * DigiCred Theme
 *
 * Converts the teal-dark modular theme to ITheme format for use in the app.
 */
import { createThemeFromModular } from '../../bridge';
import { colorPalette, branding } from './index';
/**
 * DigiCred theme configuration
 */
export const digicredTheme = createThemeFromModular({
    id: 'digicred',
    name: branding.appNameFull,
    colorPalette: colorPalette,
});
export default digicredTheme;
