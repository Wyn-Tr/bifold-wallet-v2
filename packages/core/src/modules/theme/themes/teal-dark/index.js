/**
 * Teal Dark Theme
 *
 * Reference theme featuring:
 * - Dark teal gradient backgrounds
 * - Floating tab bar
 * - Teal-accented credential cards
 */
/**
 * Branding Configuration
 */
export const branding = {
    appName: 'DigiCred',
    appNameFull: 'DigiCred Wallet',
    tagline: 'Your Digital Identity',
    logo: {
        primary: 'logo', // References logo.svg in assets
        secondary: 'digicred-logo', // References digicred-logo.svg
    },
};
/**
 * Color Palette
 */
export const colorPalette = {
    brand: {
        primary: '#0D7377',
        primaryDark: '#14FFEC',
        secondary: '#0A2E2E',
        accent: '#14FFEC',
    },
    background: {
        dark: '#0A2E2E',
        darker: '#051616',
        medium: '#0D3D3D',
        light: '#1A5A5A',
    },
    text: {
        primary: '#FFFFFF',
        secondary: '#B8E8E8',
        muted: '#6BA3A3',
        inverse: '#0A2E2E',
    },
    ui: {
        success: '#14FFEC',
        warning: '#FFD700',
        error: '#FF6B6B',
        info: '#0D7377',
    },
    card: {
        background: '#0D4D4D',
        border: '#14FFEC',
        shadow: '#000000',
    },
};
/**
 * Theme Manifest
 */
export const manifest = {
    meta: {
        id: 'teal-dark',
        name: 'Teal Dark',
        version: '1.0.0',
        description: 'Dark teal gradient theme with floating navigation',
        author: 'Bifold',
    },
    features: {
        darkMode: true,
        gradientBackgrounds: true,
        floatingTabBar: true,
        cardAnimations: true,
    },
    imports: {
        extendsTheme: undefined,
        colorPalette: 'embedded',
    },
};
/**
 * Tab Bar Configuration
 */
export const tabBarConfig = {
    variant: 'floating',
    style: {
        backgroundColor: 'rgba(13, 77, 77, 0.95)',
        height: 65,
        borderTopWidth: 0,
        borderTopColor: 'transparent',
        paddingBottom: 0,
        paddingTop: 8,
        paddingHorizontal: 16,
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        borderRadius: 32,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        shadowOpacity: 0.3,
        elevation: 8,
    },
    tabItem: {
        container: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 8,
            paddingHorizontal: 12,
        },
        icon: {
            size: 24,
            marginBottom: 4,
        },
        text: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 2,
        },
    },
    colors: {
        activeTintColor: '#14FFEC',
        inactiveTintColor: '#6BA3A3',
        activeBackgroundColor: 'transparent',
        inactiveBackgroundColor: 'transparent',
    },
    badge: {
        backgroundColor: '#FF6B6B',
        textColor: '#FFFFFF',
        size: 18,
        fontSize: 10,
        fontWeight: 'bold',
        borderRadius: 9,
        minWidth: 18,
        position: {
            top: -4,
            right: -8,
        },
    },
    tabs: [
        { id: 'home', label: 'Home', showBadge: true },
        { id: 'credentials', label: 'Credentials', showBadge: false },
        { id: 'settings', label: 'Settings', showBadge: false },
    ],
};
/**
 * Background Configurations
 */
export const backgrounds = [
    {
        id: 'default',
        type: 'gradient',
        gradient: {
            type: 'linear',
            colors: ['#0A2E2E', '#051616'],
            start: { x: 0, y: 0 },
            end: { x: 0, y: 1 },
        },
        screenIds: ['*'],
    },
    {
        id: 'home',
        type: 'gradient',
        gradient: {
            type: 'linear',
            colors: ['#0D3D3D', '#0A2E2E', '#051616'],
            start: { x: 0.5, y: 0 },
            end: { x: 0.5, y: 1 },
            locations: [0, 0.5, 1],
        },
        screenIds: ['home', 'dashboard'],
    },
    {
        id: 'credentials',
        type: 'gradient',
        gradient: {
            type: 'linear',
            colors: ['#0A2E2E', '#0D4D4D', '#0A2E2E'],
            start: { x: 0, y: 0 },
            end: { x: 1, y: 1 },
        },
        screenIds: ['credentials', 'credential-details'],
    },
    {
        id: 'onboarding',
        type: 'gradient',
        gradient: {
            type: 'radial',
            colors: ['#1A5A5A', '#0D3D3D', '#0A2E2E'],
            center: { x: 0.5, y: 0.3 },
        },
        screenIds: ['onboarding', 'preface', 'splash'],
    },
    {
        id: 'modal',
        type: 'solid',
        color: 'rgba(10, 46, 46, 0.98)',
        screenIds: ['modal', 'sheet'],
    },
];
/**
 * Card Theme Configurations
 */
export const cardThemes = [
    {
        id: 'default',
        matcher: {
            default: true,
        },
        displayName: 'Default Card',
        layout: 'standard',
        colors: {
            background: {
                primary: '#0D4D4D',
                secondary: '#0A3D3D',
                accent: '#14FFEC',
            },
            text: {
                primary: '#FFFFFF',
                secondary: '#B8E8E8',
                accent: '#14FFEC',
            },
            border: '#14FFEC',
        },
        typography: {
            title: {
                fontSize: 18,
                fontWeight: 'bold',
                color: '#FFFFFF',
            },
            subtitle: {
                fontSize: 14,
                fontWeight: '500',
                color: '#B8E8E8',
            },
            body: {
                fontSize: 12,
                fontWeight: 'normal',
                color: '#B8E8E8',
            },
            label: {
                fontSize: 10,
                fontWeight: '600',
                color: '#6BA3A3',
                textTransform: 'uppercase',
            },
        },
        assets: {},
        layoutConfig: {
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            shadowConfig: {
                color: '#000000',
                offset: { width: 0, height: 4 },
                radius: 8,
                opacity: 0.3,
            },
        },
    },
    {
        id: 'government-id',
        matcher: {
            issuerPatterns: [/government/i, /gov\./i, /\.gov$/i],
            credentialTypes: ['GovernmentID', 'NationalID', 'DriversLicense'],
        },
        displayName: 'Government ID',
        layout: 'horizontal',
        colors: {
            background: {
                primary: '#1A3D5C',
                secondary: '#0D2840',
                accent: '#4A90D9',
            },
            text: {
                primary: '#FFFFFF',
                secondary: '#B8D4F0',
                accent: '#4A90D9',
            },
            border: '#4A90D9',
        },
        typography: {
            title: {
                fontSize: 20,
                fontWeight: 'bold',
                color: '#FFFFFF',
            },
            subtitle: {
                fontSize: 14,
                fontWeight: '500',
                color: '#B8D4F0',
            },
            body: {
                fontSize: 12,
                fontWeight: 'normal',
                color: '#B8D4F0',
            },
            label: {
                fontSize: 10,
                fontWeight: '600',
                color: '#7AA8D9',
                textTransform: 'uppercase',
            },
        },
        assets: {},
        layoutConfig: {
            padding: 20,
            borderRadius: 12,
            borderWidth: 2,
            shadowConfig: {
                color: '#000000',
                offset: { width: 0, height: 6 },
                radius: 12,
                opacity: 0.4,
            },
        },
    },
    {
        id: 'education',
        matcher: {
            issuerPatterns: [/university/i, /college/i, /\.edu$/i, /education/i],
            credentialTypes: ['EducationCredential', 'Diploma', 'Degree', 'StudentID'],
        },
        displayName: 'Education Credential',
        layout: 'standard',
        colors: {
            background: {
                primary: '#2D1B4E',
                secondary: '#1A0D30',
                accent: '#9D4EDD',
            },
            text: {
                primary: '#FFFFFF',
                secondary: '#D4B8F0',
                accent: '#9D4EDD',
            },
            border: '#9D4EDD',
        },
        typography: {
            title: {
                fontSize: 18,
                fontWeight: 'bold',
                color: '#FFFFFF',
            },
            subtitle: {
                fontSize: 14,
                fontWeight: '500',
                color: '#D4B8F0',
            },
            body: {
                fontSize: 12,
                fontWeight: 'normal',
                color: '#D4B8F0',
            },
            label: {
                fontSize: 10,
                fontWeight: '600',
                color: '#A87DD9',
                textTransform: 'uppercase',
            },
        },
        assets: {},
        layoutConfig: {
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            shadowConfig: {
                color: '#2D1B4E',
                offset: { width: 0, height: 4 },
                radius: 10,
                opacity: 0.4,
            },
        },
    },
    {
        id: 'healthcare',
        matcher: {
            issuerPatterns: [/health/i, /medical/i, /hospital/i, /clinic/i],
            credentialTypes: ['HealthCard', 'MedicalRecord', 'Vaccination', 'Insurance'],
        },
        displayName: 'Healthcare Credential',
        layout: 'standard',
        colors: {
            background: {
                primary: '#1B4D3E',
                secondary: '#0D3028',
                accent: '#4ADE80',
            },
            text: {
                primary: '#FFFFFF',
                secondary: '#B8F0D4',
                accent: '#4ADE80',
            },
            border: '#4ADE80',
        },
        typography: {
            title: {
                fontSize: 18,
                fontWeight: 'bold',
                color: '#FFFFFF',
            },
            subtitle: {
                fontSize: 14,
                fontWeight: '500',
                color: '#B8F0D4',
            },
            body: {
                fontSize: 12,
                fontWeight: 'normal',
                color: '#B8F0D4',
            },
            label: {
                fontSize: 10,
                fontWeight: '600',
                color: '#7DD9A8',
                textTransform: 'uppercase',
            },
        },
        assets: {},
        layoutConfig: {
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            shadowConfig: {
                color: '#1B4D3E',
                offset: { width: 0, height: 4 },
                radius: 8,
                opacity: 0.35,
            },
        },
    },
    {
        id: 'employment',
        matcher: {
            issuerPatterns: [/corp/i, /inc/i, /ltd/i, /company/i],
            credentialTypes: ['EmploymentCredential', 'EmployeeID', 'WorkPermit'],
        },
        displayName: 'Employment Credential',
        layout: 'horizontal',
        colors: {
            background: {
                primary: '#3D2E1B',
                secondary: '#28200D',
                accent: '#FFB347',
            },
            text: {
                primary: '#FFFFFF',
                secondary: '#F0D8B8',
                accent: '#FFB347',
            },
            border: '#FFB347',
        },
        typography: {
            title: {
                fontSize: 18,
                fontWeight: 'bold',
                color: '#FFFFFF',
            },
            subtitle: {
                fontSize: 14,
                fontWeight: '500',
                color: '#F0D8B8',
            },
            body: {
                fontSize: 12,
                fontWeight: 'normal',
                color: '#F0D8B8',
            },
            label: {
                fontSize: 10,
                fontWeight: '600',
                color: '#D9A87D',
                textTransform: 'uppercase',
            },
        },
        assets: {},
        layoutConfig: {
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            shadowConfig: {
                color: '#3D2E1B',
                offset: { width: 0, height: 4 },
                radius: 8,
                opacity: 0.35,
            },
        },
    },
];
// ============================================================================
// BUTTON THEMES
// ============================================================================
/**
 * Button Themes
 */
export const buttonThemes = {
    /** Primary button - Teal filled */
    primary: {
        container: {
            backgroundColor: '#0D7377',
            borderRadius: 24,
            paddingVertical: 14,
            paddingHorizontal: 32,
            minHeight: 48,
        },
        text: {
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '600',
            textTransform: 'uppercase',
        },
        disabled: {
            backgroundColor: '#0D7377',
            opacity: 0.5,
        },
    },
    /** Secondary button - Outlined teal */
    secondary: {
        container: {
            backgroundColor: 'transparent',
            borderRadius: 24,
            borderWidth: 1,
            borderColor: '#0D7377',
            paddingVertical: 14,
            paddingHorizontal: 32,
            minHeight: 48,
        },
        text: {
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '600',
            textTransform: 'uppercase',
        },
        disabled: {
            borderColor: '#0D7377',
            opacity: 0.5,
        },
    },
    /** Tertiary button - Purple/violet filled */
    tertiary: {
        container: {
            backgroundColor: '#6B5B95',
            borderRadius: 24,
            paddingVertical: 14,
            paddingHorizontal: 32,
            minHeight: 48,
        },
        text: {
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '600',
            textTransform: 'uppercase',
        },
        disabled: {
            backgroundColor: '#6B5B95',
            opacity: 0.5,
        },
    },
};
// ============================================================================
// INPUT THEMES
// ============================================================================
/**
 * Input Themes
 */
export const inputThemes = {
    /** Rounded input style for onboarding PIN */
    rounded: {
        container: {
            backgroundColor: 'transparent',
            borderRadius: 24,
            borderWidth: 1,
            borderColor: '#0D7377',
            paddingVertical: 14,
            paddingHorizontal: 20,
            minHeight: 52,
        },
        text: {
            color: '#FFFFFF',
            fontSize: 16,
        },
        placeholder: {
            color: '#6BA3A3',
        },
        focused: {
            borderColor: '#14FFEC',
            borderWidth: 1.5,
        },
        error: {
            borderColor: '#FF6B6B',
        },
        icon: {
            color: '#6BA3A3',
            size: 22,
        },
    },
};
// ============================================================================
// ONBOARDING THEME
// ============================================================================
/**
 * Onboarding Card Theme
 * Dark semi-transparent card for onboarding steps
 */
export const onboardingCardTheme = {
    container: {
        backgroundColor: 'rgba(30, 45, 45, 0.95)',
        borderRadius: 24,
        padding: 24,
        paddingTop: 28,
        paddingBottom: 28,
        paddingHorizontal: 24,
        marginHorizontal: 16,
        marginBottom: 40,
        position: 'bottom',
        maxHeightPercent: 70,
    },
    shadow: {
        color: '#000000',
        offset: { width: 0, height: -4 },
        radius: 20,
        opacity: 0.3,
        elevation: 10,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 12,
    },
    subtitle: {
        color: '#0D7377',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 16,
        lineHeight: 20,
    },
    accentText: {
        color: '#14FFEC',
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
    bodyText: {
        color: '#9CBBBB',
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 22,
    },
    scrollArea: {
        maxHeight: 280,
        paddingRight: 8,
        scrollIndicatorColor: '#0D7377',
    },
    button: {
        marginTop: 24,
    },
};
/**
 * Onboarding Toggle Theme
 * Purple toggle switch for biometry/notifications
 */
export const onboardingToggleTheme = {
    track: {
        onColor: '#6B5B95',
        offColor: '#3D4D4D',
    },
    thumb: {
        color: '#FFFFFF',
    },
    label: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 12,
    },
    container: {
        marginTop: 20,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
};
/**
 * Onboarding Checkbox Theme
 * For terms acceptance
 */
export const onboardingCheckboxTheme = {
    unchecked: {
        borderColor: '#6BA3A3',
        borderWidth: 1.5,
        backgroundColor: 'transparent',
        borderRadius: 4,
        size: 22,
    },
    checked: {
        borderColor: '#14FFEC',
        backgroundColor: '#0D7377',
        checkColor: '#FFFFFF',
    },
    label: {
        color: '#9CBBBB',
        fontSize: 13,
        fontWeight: '400',
        marginLeft: 12,
        flex: 1,
        lineHeight: 18,
    },
    container: {
        marginTop: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
};
/**
 * Bullet List Theme
 * For push notifications list
 */
export const bulletListTheme = {
    container: {
        marginTop: 8,
        marginBottom: 16,
    },
    item: {
        marginBottom: 8,
        flexDirection: 'row',
    },
    bullet: {
        character: '•',
        color: '#6BA3A3',
        fontSize: 16,
        marginRight: 10,
        lineHeight: 22,
    },
    text: {
        color: '#9CBBBB',
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 22,
        flex: 1,
    },
};
// ============================================================================
// UNLOCK SCREEN THEME
// ============================================================================
/**
 * Unlock/Splash Screen Theme
 */
export const unlockScreenTheme = {
    logo: {
        width: 180,
        height: 140,
        marginBottom: 16,
        tintColor: '#FFFFFF',
    },
    appName: {
        color: '#FFFFFF',
        fontSize: 42,
        fontWeight: '300',
        marginBottom: 4,
    },
    tagline: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '400',
        marginBottom: 60,
    },
    buttonsContainer: {
        marginTop: 40,
        paddingHorizontal: 40,
        width: '100%',
    },
    primaryButton: {
        container: {
            borderWidth: 1,
            borderColor: '#0D7377',
            borderRadius: 24,
            paddingVertical: 14,
            paddingHorizontal: 32,
            backgroundColor: 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
        },
        text: {
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 1,
        },
    },
    secondaryButton: {
        container: {
            borderRadius: 24,
            paddingVertical: 14,
            paddingHorizontal: 32,
            backgroundColor: '#6B5B95',
            alignItems: 'center',
            justifyContent: 'center',
        },
        text: {
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 1,
        },
    },
    divider: {
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            marginVertical: 16,
        },
        line: {
            flex: 1,
            height: 1,
            backgroundColor: '#3D5A5A',
        },
        text: {
            color: '#6BA3A3',
            fontSize: 12,
            fontWeight: '400',
            marginHorizontal: 16,
        },
    },
};
// ============================================================================
// TERMS SCREEN THEME
// ============================================================================
/**
 * Terms Content Theme
 */
export const termsContentTheme = {
    sectionHeader: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    paragraph: {
        color: '#9CBBBB',
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 22,
        marginBottom: 12,
    },
    emphasis: {
        color: '#B8E8E8',
        fontWeight: '500',
    },
};
// ============================================================================
// PIN CREATE SCREEN THEME
// ============================================================================
/**
 * PIN Create Text Field Theme
 */
export const pinTextFieldTheme = {
    container: {
        backgroundColor: 'transparent',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#0D7377',
        paddingVertical: 14,
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    focused: {
        borderColor: '#14FFEC',
        borderWidth: 1.5,
    },
    error: {
        borderColor: '#FF6B6B',
    },
    text: {
        color: '#FFFFFF',
        fontSize: 16,
    },
    placeholder: {
        color: '#6BA3A3',
    },
    visibilityIcon: {
        size: 22,
        color: '#6BA3A3',
        activeColor: '#14FFEC',
    },
};
// ============================================================================
// COMPLETE THEME BUNDLE EXPORT
// ============================================================================
/**
 * Complete Theme Bundle Export
 */
export const tealDarkTheme = {
    branding,
    colorPalette,
    manifest,
    tabBarConfig,
    backgrounds,
    cardThemes,
    // Onboarding themes
    onboardingCardTheme,
    onboardingToggleTheme,
    onboardingCheckboxTheme,
    bulletListTheme,
    unlockScreenTheme,
    termsContentTheme,
    pinTextFieldTheme,
    // Button and input themes
    buttonThemes,
    inputThemes,
};
export default tealDarkTheme;
