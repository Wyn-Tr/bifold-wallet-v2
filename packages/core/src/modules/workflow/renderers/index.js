/**
 * Workflow Renderers
 *
 * Custom renderers for chat UI components.
 * These renderers implement the interfaces defined in types.ts
 * and can be registered with the WorkflowRegistry.
 */
// Background renderers
export { GradientBackgroundRenderer, createGradientBackgroundRenderer } from './GradientBackgroundRenderer';
// Header renderers
export { ChatHeaderRenderer, createChatHeaderRenderer } from './ChatHeaderRenderer';
// Credential renderers
export { DefaultCredentialRenderer, createDefaultCredentialRenderer, VDCredentialRenderer, createVDCredentialRenderer, detectCredentialType, CredentialDisplayType, } from './CredentialRenderer';
// Proof renderers
export { DefaultProofRenderer, createDefaultProofRenderer } from './ProofRenderer';
// Helper to create full chat screen config
export { createChatScreenConfig } from './createChatScreenConfig';
// Card components for custom renderers
export * from './components';
