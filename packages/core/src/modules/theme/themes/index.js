/**
 * Theme Bundles
 *
 * Pre-built theme configurations ready for use.
 * Each theme exports its complete configuration including:
 * - Color palette
 * - Manifest
 * - Tab bar config
 * - Backgrounds
 * - Card themes
 * - Onboarding themes (card, toggle, checkbox, etc.)
 * - Button and input themes
 */
export { tealDarkTheme, branding as tealDarkBranding, colorPalette as tealDarkColorPalette, 
// Onboarding exports
onboardingCardTheme as tealDarkOnboardingCard, onboardingToggleTheme as tealDarkOnboardingToggle, onboardingCheckboxTheme as tealDarkOnboardingCheckbox, bulletListTheme as tealDarkBulletList, unlockScreenTheme as tealDarkUnlockScreen, termsContentTheme as tealDarkTermsContent, pinTextFieldTheme as tealDarkPinTextField, 
// Button and input exports
buttonThemes as tealDarkButtons, inputThemes as tealDarkInputs, } from './teal-dark';
export { default as TealDarkTheme } from './teal-dark';
// Theme IDs for reference
export const THEME_IDS = {
    TEAL_DARK: 'teal-dark',
};
