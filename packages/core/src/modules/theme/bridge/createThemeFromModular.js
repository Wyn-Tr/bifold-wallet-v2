/**
 * Theme Bridge
 *
 * Converts modular theme configuration to the legacy ITheme format
 * for backward compatibility with existing components.
 */
import { borderRadius, heavyOpacity, borderWidth, maxFontSizeMultiplier, lightOpacity, mediumOpacity, createTextTheme, createInputsTheme, createButtonsTheme, createListItemsTheme, createTabTheme, createNavigationTheme, createHomeTheme, createSettingsTheme, createChatTheme, createOnboardingTheme, createDialogTheme, createLoadingTheme, createPINInputTheme, createSeparatedPINInputTheme, createInputInlineMessageTheme, Assets as DefaultAssets, } from '../../../theme';
/**
 * Convert modular color palette to legacy IColorPalette
 */
function convertColorPalette(modular) {
    const grayscale = {
        black: '#000000',
        darkGrey: modular.background.darker,
        mediumGrey: modular.text.muted,
        lightGrey: modular.text.secondary,
        veryLightGrey: '#F2F2F2',
        white: '#FFFFFF',
        digicredBackgroundModal: '#25272A',
    };
    const brand = {
        primary: modular.brand.primary,
        primaryDisabled: `rgba(${hexToRgb(modular.brand.primary)}, ${lightOpacity})`,
        secondary: modular.background.dark, // Used for input toolbars, should be dark
        secondaryDisabled: `rgba(${hexToRgb(modular.brand.primary)}, ${heavyOpacity})`,
        tertiary: modular.text.primary,
        tertiaryDisabled: `rgba(${hexToRgb(modular.brand.primary)}, ${heavyOpacity})`,
        primaryLight: `rgba(${hexToRgb(modular.brand.primary)}, ${lightOpacity})`,
        highlight: modular.brand.accent || modular.ui.warning,
        primaryBackground: modular.background.darker,
        secondaryBackground: modular.background.dark,
        tertiaryBackground: modular.background.medium,
        modalPrimary: modular.brand.primary,
        modalSecondary: modular.text.primary,
        modalTertiary: modular.text.primary,
        modalPrimaryBackground: modular.background.darker,
        modalSecondaryBackground: modular.background.dark,
        modalTertiaryBackground: modular.background.medium,
        modalIcon: grayscale.white,
        unorderedList: grayscale.white,
        unorderedListModal: grayscale.white,
        link: modular.brand.accent || modular.brand.primary,
        credentialLink: modular.brand.primary,
        text: modular.text.primary,
        icon: modular.text.primary,
        headerIcon: modular.text.primary,
        headerText: modular.text.primary,
        buttonText: modular.text.primary,
        tabBarInactive: modular.text.muted,
        inlineError: modular.ui.error,
        inlineWarning: modular.ui.warning,
    };
    const semantic = {
        error: modular.ui.error,
        success: modular.ui.success,
        focus: modular.brand.accent || modular.brand.primary,
    };
    const notification = {
        success: modular.background.dark,
        successBorder: modular.ui.success,
        successIcon: modular.ui.success,
        successText: modular.text.primary,
        info: modular.background.dark,
        infoBorder: modular.ui.info,
        infoIcon: modular.ui.info,
        infoText: modular.text.primary,
        warn: modular.background.dark,
        warnBorder: modular.ui.warning,
        warnIcon: modular.ui.warning,
        warnText: modular.text.primary,
        error: modular.background.dark,
        errorBorder: modular.ui.error,
        errorIcon: modular.ui.error,
        errorText: modular.text.primary,
        popupOverlay: `rgba(0, 0, 0, ${mediumOpacity})`,
    };
    return {
        brand,
        semantic,
        notification,
        grayscale,
    };
}
/**
 * Helper to convert hex to RGB values
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result)
        return '0, 0, 0';
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
/**
 * Create a full ITheme from modular theme configuration
 */
export function createThemeFromModular(config) {
    const ColorPalette = convertColorPalette(config.colorPalette);
    const TextTheme = createTextTheme({ ColorPalette });
    const Assets = config.assets ? { ...DefaultAssets, ...config.assets } : DefaultAssets;
    const Spacing = {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 40,
    };
    const CredentialCardShadowTheme = {
        shadowColor: config.colorPalette.card.shadow,
        shadowOffset: { width: 1, height: 1 },
        shadowOpacity: 0.3,
    };
    const SelectedCredTheme = {
        borderWidth: 5,
        borderRadius: 15,
        borderColor: ColorPalette.semantic.focus,
    };
    const PINEnterTheme = {
        image: {
            alignSelf: 'center',
            marginBottom: 20,
        },
    };
    return {
        themeName: config.id,
        Spacing,
        ColorPalette,
        TextTheme,
        InputInlineMessage: createInputInlineMessageTheme({ TextTheme, Assets }),
        Inputs: createInputsTheme({ ColorPalette, TextTheme, borderRadius }),
        Buttons: createButtonsTheme({ ColorPalette, TextTheme }),
        ListItems: createListItemsTheme({ ColorPalette, TextTheme }),
        TabTheme: createTabTheme({ ColorPalette, TextTheme }),
        NavigationTheme: createNavigationTheme({ ColorPalette }),
        HomeTheme: createHomeTheme({ ColorPalette, TextTheme }),
        SettingsTheme: createSettingsTheme({ ColorPalette, TextTheme }),
        ChatTheme: createChatTheme({ ColorPalette, TextTheme }),
        OnboardingTheme: createOnboardingTheme({ ColorPalette, TextTheme }),
        DialogTheme: createDialogTheme({ ColorPalette }),
        LoadingTheme: createLoadingTheme({ ColorPalette }),
        PINEnterTheme,
        PINInputTheme: createPINInputTheme({ ColorPalette }),
        SeparatedPINInputTheme: createSeparatedPINInputTheme({ ColorPalette }),
        CredentialCardShadowTheme,
        SelectedCredTheme,
        heavyOpacity,
        borderRadius,
        borderWidth,
        maxFontSizeMultiplier,
        Assets,
    };
}
export default createThemeFromModular;
