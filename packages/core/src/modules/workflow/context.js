/**
 * Workflow Context
 *
 * React context and hooks for accessing the workflow registry
 * throughout the application.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { TOKENS, useContainer } from '../../container-api';
import { WorkflowRegistry } from './WorkflowRegistry';
/**
 * Context for the workflow registry
 */
const WorkflowRegistryContext = createContext(undefined);
/**
 * Provider component for the workflow registry
 *
 * Wrap your app with this provider to make the workflow registry
 * available throughout the component tree.
 *
 * @example
 * ```tsx
 * <WorkflowRegistryProvider>
 *   <App />
 * </WorkflowRegistryProvider>
 * ```
 *
 * @example With custom registry
 * ```tsx
 * const customRegistry = new WorkflowRegistry()
 * customRegistry.register(new MyCustomHandler())
 *
 * <WorkflowRegistryProvider registry={customRegistry}>
 *   <App />
 * </WorkflowRegistryProvider>
 * ```
 */
export const WorkflowRegistryProvider = ({ registry, children }) => {
    const value = useMemo(() => {
        return registry ?? new WorkflowRegistry();
    }, [registry]);
    return <WorkflowRegistryContext.Provider value={value}>{children}</WorkflowRegistryContext.Provider>;
};
/**
 * Hook to access the workflow registry
 *
 * @throws Error if used outside of WorkflowRegistryProvider
 * @returns The workflow registry instance
 *
 * @example
 * ```tsx
 * const registry = useWorkflowRegistry()
 * const messages = registry.toMessages(records, connection, context)
 * ```
 */
export function useWorkflowRegistry() {
    const registry = useContext(WorkflowRegistryContext);
    if (!registry) {
        throw new Error('useWorkflowRegistry must be used within a WorkflowRegistryProvider');
    }
    return registry;
}
/**
 * Hook to access the workflow registry, returning undefined if not available
 *
 * Use this hook when the registry is optional or when you want to
 * gracefully handle the case where the provider is not present.
 *
 * This hook first checks React Context, then falls back to the DI container.
 *
 * @returns The workflow registry instance or undefined
 */
export function useOptionalWorkflowRegistry() {
    const contextRegistry = useContext(WorkflowRegistryContext);
    // Get container outside conditional to satisfy React hooks rules
    const container = useContainer();
    // If context has registry, use it
    if (contextRegistry) {
        return contextRegistry;
    }
    // Otherwise, try to get from DI container
    try {
        if (container) {
            return container.resolve(TOKENS.UTIL_WORKFLOW_REGISTRY);
        }
    }
    catch {
        // Container not available or registry not registered
    }
    return undefined;
}
