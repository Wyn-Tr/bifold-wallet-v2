import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAgent } from '@credo-ts/react-hooks';
import { MobileWorkflowService } from '../services/WorkflowService';
/**
 * Hook to manage a single workflow instance
 */
export function useWorkflowInstance(instanceId) {
    const { agent } = useAgent();
    const [instance, setInstance] = useState(null);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [advancing, setAdvancing] = useState(false);
    const [error, setError] = useState(null);
    const service = useMemo(() => {
        if (!agent)
            return null;
        return new MobileWorkflowService(agent);
    }, [agent]);
    const refresh = useCallback(async () => {
        if (!service || !instanceId)
            return;
        setLoading(true);
        setError(null);
        try {
            // Get instance record
            const instanceRecord = await service.getInstance(instanceId);
            setInstance(instanceRecord);
            if (instanceRecord) {
                // Derive UI profile
                const uiProfile = await service.deriveUiProfile(instanceId);
                // Get status with UI and actions
                const statusData = (await service.getStatus(instanceId, {
                    includeUi: true,
                    includeActions: true,
                    uiProfile,
                }));
                // Get context from instance record (status API doesn't include it)
                // The context contains collected form data needed for review steps
                const instanceContext = instanceRecord.context ?? {};
                setStatus({
                    instance_id: statusData.instance_id ?? instanceId,
                    template_id: statusData.template_id ?? '',
                    state: statusData.state ?? '',
                    section: statusData.section ?? '',
                    status: statusData.status ?? '',
                    context: instanceContext,
                    actions: statusData.actions,
                    ui: statusData.ui,
                    uiProfile,
                });
            }
            else {
                setStatus(null);
            }
        }
        catch (e) {
            setError(e);
            setInstance(null);
            setStatus(null);
        }
        finally {
            setLoading(false);
        }
    }, [service, instanceId]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    const advance = useCallback(async (event, input) => {
        if (!service || !instanceId) {
            throw new Error('Workflow service or instance not available');
        }
        setAdvancing(true);
        setError(null);
        try {
            const idempotencyKey = service.generateIdempotencyKey(event, instanceId);
            await service.advance({
                instanceId,
                event,
                input,
                idempotencyKey,
            });
            // Refresh status after advance
            await refresh();
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setAdvancing(false);
        }
    }, [service, instanceId, refresh]);
    const pause = useCallback(async () => {
        if (!service || !instanceId) {
            throw new Error('Workflow service or instance not available');
        }
        try {
            await service.pause(instanceId);
            await refresh();
        }
        catch (e) {
            setError(e);
            throw e;
        }
    }, [service, instanceId, refresh]);
    const resume = useCallback(async () => {
        if (!service || !instanceId) {
            throw new Error('Workflow service or instance not available');
        }
        try {
            await service.resume(instanceId);
            await refresh();
        }
        catch (e) {
            setError(e);
            throw e;
        }
    }, [service, instanceId, refresh]);
    const cancel = useCallback(async () => {
        if (!service || !instanceId) {
            throw new Error('Workflow service or instance not available');
        }
        try {
            await service.cancel(instanceId);
            await refresh();
        }
        catch (e) {
            setError(e);
            throw e;
        }
    }, [service, instanceId, refresh]);
    // Extract available actions from status
    const actions = useMemo(() => {
        return status?.actions ?? [];
    }, [status]);
    // Extract UI hints from status
    const uiHints = useMemo(() => {
        return status?.ui ?? [];
    }, [status]);
    // Check if workflow is in a final state
    const isComplete = useMemo(() => {
        if (!status)
            return false;
        const finalStates = ['done', 'completed', 'cancelled', 'failed', 'error'];
        return finalStates.includes(status.state?.toLowerCase() ?? '');
    }, [status]);
    // Check if there are pending actions
    const hasPendingActions = useMemo(() => {
        return actions.length > 0;
    }, [actions]);
    return {
        instance,
        status,
        loading,
        advancing,
        error,
        refresh,
        advance,
        pause,
        resume,
        cancel,
        actions,
        uiHints,
        isComplete,
        hasPendingActions,
        uiProfile: status?.uiProfile,
    };
}
