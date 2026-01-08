/**
 * createChatScreenConfig
 *
 * Helper function to create a complete chat screen configuration
 * with custom renderers.
 */
import { ChatHeaderRenderer } from './ChatHeaderRenderer';
import { createDefaultCredentialRenderer, createVDCredentialRenderer, } from './CredentialRenderer';
import { GradientBackgroundRenderer } from './GradientBackgroundRenderer';
import { createDefaultProofRenderer } from './ProofRenderer';
/**
 * Create a complete chat screen configuration
 *
 * @example
 * ```tsx
 * const config = createChatScreenConfig({
 *   header: {
 *     LogoComponent: MyLogo,
 *     BellIconComponent: BellIcon,
 *   },
 *   background: {
 *     useGradient: true,
 *   },
 *   features: {
 *     showMenuButton: true,
 *   },
 * })
 *
 * registry.setChatScreenConfig(config)
 * ```
 */
export function createChatScreenConfig(options = {}) {
    const config = {};
    // Create header renderer if header options provided
    if (options.header) {
        config.headerRenderer = new ChatHeaderRenderer({
            LogoComponent: options.header.LogoComponent,
            BellIconComponent: options.header.BellIconComponent,
            InfoIconComponent: options.header.InfoIconComponent,
            backgroundColor: options.header.backgroundColor,
            titleColor: options.header.titleColor,
        });
    }
    // Create background renderer if gradient enabled
    if (options.background?.useGradient) {
        config.backgroundRenderer = new GradientBackgroundRenderer();
    }
    // Create credential renderer
    if (options.useVDCredentialRenderer) {
        config.credentialRenderer = createVDCredentialRenderer(options.credential);
    }
    else if (options.credential) {
        config.credentialRenderer = createDefaultCredentialRenderer(options.credential);
    }
    // Create proof renderer
    if (options.proof) {
        config.proofRenderer = createDefaultProofRenderer(options.proof);
    }
    // Set feature flags
    if (options.features) {
        config.showMenuButton = options.features.showMenuButton;
        config.showInfoButton = options.features.showInfoButton;
    }
    return config;
}
/**
 * Create a bifold-wallet-dc style chat screen configuration
 * This pre-configures all the options to match the DC wallet appearance
 */
export function createDCWalletChatConfig(options) {
    return createChatScreenConfig({
        header: {
            LogoComponent: options.LogoComponent,
            BellIconComponent: options.BellIconComponent,
            InfoIconComponent: options.InfoIconComponent,
        },
        background: {
            useGradient: false,
        },
        useVDCredentialRenderer: true,
        credential: {
            onPress: options.onCredentialPress,
            onAccept: options.onCredentialAccept,
            onDecline: options.onCredentialDecline,
        },
        proof: {
            onPress: options.onProofPress,
        },
        features: {
            showMenuButton: true,
            showInfoButton: true,
        },
    });
}
