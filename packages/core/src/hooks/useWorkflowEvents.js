import { useEffect, useCallback, useRef } from 'react';
import { useAgent } from '@credo-ts/react-hooks';
// Event type constants (matching @ajna-inc/workflow WorkflowEventTypes enum)
// IMPORTANT: These must match EXACTLY - no "Event" suffix
export const WorkflowEventTypes = {
    WorkflowInstanceStateChanged: 'WorkflowInstanceStateChanged',
    WorkflowInstanceStatusChanged: 'WorkflowInstanceStatusChanged',
    WorkflowInstanceCompleted: 'WorkflowInstanceCompleted',
};
/**
 * Hook to subscribe to workflow events
 *
 * @example
 * ```tsx
 * useWorkflowEvents({
 *   onStateChanged: (event) => {
 *     console.log('Workflow state changed:', event.payload.newState)
 *     refresh()
 *   },
 *   onCreated: (event) => {
 *     console.log('New workflow created:', event.payload.instanceRecord.instanceId)
 *   },
 *   instanceId: 'my-instance-id', // Only listen to events for this instance
 * })
 * ```
 */
export function useWorkflowEvents(options = {}) {
    const { agent } = useAgent();
    const optionsRef = useRef(options);
    // Keep options ref updated
    useEffect(() => {
        optionsRef.current = options;
    }, [options]);
    // Helper to check if event is for our instance
    const isRelevantEvent = useCallback((event) => {
        const instanceId = optionsRef.current.instanceId;
        if (!instanceId)
            return true; // No filter, all events are relevant
        const eventInstanceId = event.payload?.instanceRecord?.instanceId;
        return eventInstanceId === instanceId;
    }, []);
    useEffect(() => {
        if (!agent)
            return;
        const unsubscribers = [];
        // Subscribe to state changed events
        // This also handles "created" events (when previousState is null)
        if (optionsRef.current.onStateChanged || optionsRef.current.onCreated) {
            const handler = (event) => {
                if (isRelevantEvent(event)) {
                    // Call onCreated if this is a new instance (previousState is null)
                    if (event.payload.previousState === null && optionsRef.current.onCreated) {
                        optionsRef.current.onCreated(event);
                    }
                    // Always call onStateChanged if provided
                    optionsRef.current.onStateChanged?.(event);
                }
            };
            agent.events.on(WorkflowEventTypes.WorkflowInstanceStateChanged, handler);
            unsubscribers.push(() => agent.events.off(WorkflowEventTypes.WorkflowInstanceStateChanged, handler));
        }
        // Subscribe to status changed events
        if (optionsRef.current.onStatusChanged) {
            const handler = (event) => {
                if (isRelevantEvent(event)) {
                    optionsRef.current.onStatusChanged?.(event);
                }
            };
            agent.events.on(WorkflowEventTypes.WorkflowInstanceStatusChanged, handler);
            unsubscribers.push(() => agent.events.off(WorkflowEventTypes.WorkflowInstanceStatusChanged, handler));
        }
        // Subscribe to completed events
        if (optionsRef.current.onCompleted) {
            const handler = (event) => {
                if (isRelevantEvent(event)) {
                    optionsRef.current.onCompleted?.(event);
                }
            };
            agent.events.on(WorkflowEventTypes.WorkflowInstanceCompleted, handler);
            unsubscribers.push(() => agent.events.off(WorkflowEventTypes.WorkflowInstanceCompleted, handler));
        }
        // Cleanup
        return () => {
            unsubscribers.forEach((unsub) => unsub());
        };
    }, [agent, isRelevantEvent]);
}
/**
 * Hook to subscribe to all workflow events for a specific instance
 */
export function useWorkflowInstanceEvents(instanceId, onEvent) {
    useWorkflowEvents({
        instanceId,
        onStateChanged: onEvent,
        onStatusChanged: onEvent,
        onCompleted: onEvent,
    });
}
/**
 * Hook to subscribe to new workflow creations
 * Listens for state changes where previousState is null
 */
export function useNewWorkflowEvents(onNewWorkflow) {
    useWorkflowEvents({
        onCreated: onNewWorkflow,
    });
}
