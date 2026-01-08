/**
 * Workflow Module
 *
 * Provides a modular, pluggable architecture for handling different
 * workflow types in the chat interface.
 *
 * @example
 * ```tsx
 * import {
 *   WorkflowRegistry,
 *   WorkflowRegistryProvider,
 *   useWorkflowRegistry,
 *   CredentialWorkflowHandler,
 *   ProofWorkflowHandler,
 *   createChatScreenConfig,
 * } from './modules/workflow'
 *
 * // Create and configure registry
 * const registry = new WorkflowRegistry()
 * registry.register(new CredentialWorkflowHandler())
 * registry.register(new ProofWorkflowHandler())
 *
 * // Configure chat screen with custom renderers
 * registry.setChatScreenConfig(createChatScreenConfig({
 *   header: {
 *     LogoComponent: MyLogo,
 *     BellIconComponent: BellIcon,
 *   },
 *   background: { useGradient: true },
 *   features: { showMenuButton: true },
 * }))
 *
 * // Use in app
 * <WorkflowRegistryProvider registry={registry}>
 *   <App />
 * </WorkflowRegistryProvider>
 * ```
 */
// Types
export * from './types';
// Registry
export { WorkflowRegistry, createWorkflowRegistry } from './WorkflowRegistry';
// Context and hooks
export { WorkflowRegistryProvider, useWorkflowRegistry, useOptionalWorkflowRegistry } from './context';
// Handlers
export * from './handlers';
// Actions
export * from './actions';
// Renderers
export * from './renderers';
