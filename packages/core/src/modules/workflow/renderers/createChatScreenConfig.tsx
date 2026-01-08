/**
 * createChatScreenConfig
 *
 * Helper function to create a complete chat screen configuration
 * with custom renderers.
 */

import { SvgProps } from 'react-native-svg'

import { IChatScreenConfig } from '../types'

import { ChatHeaderRenderer } from './ChatHeaderRenderer'
import {
  createDefaultCredentialRenderer,
  createVDCredentialRenderer,
  CredentialRendererOptions,
  VDCredentialRendererOptions,
} from './CredentialRenderer'
import { GradientBackgroundRenderer } from './GradientBackgroundRenderer'
import { createDefaultProofRenderer, ProofRendererOptions } from './ProofRenderer'

/**
 * Options for creating a chat screen configuration
 */
export interface ChatScreenConfigOptions {
  // Header options
  header?: {
    /** Logo component */
    LogoComponent?: React.FC<SvgProps>
    /** Bell icon component for menu trigger */
    BellIconComponent?: React.FC<SvgProps>
    /** Info icon component */
    InfoIconComponent?: React.FC<SvgProps>
    /** Background color */
    backgroundColor?: string
    /** Title color */
    titleColor?: string
  }

  // Background options
  background?: {
    /** Whether to use gradient background */
    useGradient?: boolean
  }

  // Credential renderer options
  credential?: CredentialRendererOptions | VDCredentialRendererOptions

  // Use VD-style credential cards (VDCard, TranscriptCard)
  useVDCredentialRenderer?: boolean

  // Proof renderer options
  proof?: ProofRendererOptions

  // Feature flags
  features?: {
    /** Show bell icon to trigger menu */
    showMenuButton?: boolean
    /** Show info button */
    showInfoButton?: boolean
  }
}

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
export function createChatScreenConfig(options: ChatScreenConfigOptions = {}): IChatScreenConfig {
  const config: IChatScreenConfig = {}

  // Create header renderer if header options provided
  if (options.header) {
    config.headerRenderer = new ChatHeaderRenderer({
      LogoComponent: options.header.LogoComponent,
      BellIconComponent: options.header.BellIconComponent,
      InfoIconComponent: options.header.InfoIconComponent,
      backgroundColor: options.header.backgroundColor,
      titleColor: options.header.titleColor,
    })
  }

  // Create background renderer if gradient enabled
  if (options.background?.useGradient) {
    config.backgroundRenderer = new GradientBackgroundRenderer()
  }

  // Create credential renderer
  if (options.useVDCredentialRenderer) {
    config.credentialRenderer = createVDCredentialRenderer(options.credential as VDCredentialRendererOptions)
  } else if (options.credential) {
    config.credentialRenderer = createDefaultCredentialRenderer(options.credential as CredentialRendererOptions)
  }

  // Create proof renderer
  if (options.proof) {
    config.proofRenderer = createDefaultProofRenderer(options.proof)
  }

  // Set feature flags
  if (options.features) {
    config.showMenuButton = options.features.showMenuButton
    config.showInfoButton = options.features.showInfoButton
  }

  return config
}

/**
 * Create a bifold-wallet-dc style chat screen configuration
 * This pre-configures all the options to match the DC wallet appearance
 */
export function createDCWalletChatConfig(options: {
  LogoComponent?: React.FC<SvgProps>
  BellIconComponent?: React.FC<SvgProps>
  InfoIconComponent?: React.FC<SvgProps>
  /** Callback when credential card is pressed */
  onCredentialPress?: (credential: any, context: any) => void
  onCredentialAccept?: (credential: any, context: any) => void
  onCredentialDecline?: (credential: any, context: any) => void
  /** Callback when proof card is pressed */
  onProofPress?: (proof: any, context: any) => void
}): IChatScreenConfig {
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
    },
    proof: {
      onPress: options.onProofPress,
    },
    features: {
      showMenuButton: true,
      showInfoButton: true,
    },
  })
}
