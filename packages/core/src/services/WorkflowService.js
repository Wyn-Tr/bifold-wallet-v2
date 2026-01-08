import { WorkflowInstanceRepository } from '@ajna-inc/workflow';
/**
 * Mobile Workflow Service
 *
 * Provides high-level workflow operations by calling the agent's workflow module directly.
 * Unlike the backend which exposes these via REST API, the mobile app uses this service
 * to interact with workflows without any HTTP layer.
 */
export class MobileWorkflowService {
    agent;
    constructor(agent) {
        this.agent = agent;
    }
    /**
     * Check if workflow module is available
     */
    get isAvailable() {
        return !!this.agent.modules.workflow;
    }
    /**
     * Get the workflow module API from agent
     * The workflow module exposes its functionality via an 'api' property
     */
    get workflowApi() {
        if (!this.agent.modules.workflow) {
            throw new Error('Workflow module is not available on this agent');
        }
        // The module.api gives us the WorkflowApi instance
        return this.agent.modules.workflow;
    }
    /**
     * Get the workflow instance repository for direct queries
     */
    get instanceRepository() {
        return this.agent.context.dependencyManager.resolve(WorkflowInstanceRepository);
    }
    // ============================================
    // Template Operations
    // ============================================
    /**
     * List all locally stored workflow templates
     */
    async listTemplates() {
        return this.workflowApi.listTemplates();
    }
    /**
     * Get a specific template by ID and optionally version
     */
    async getTemplate(templateId, version) {
        return this.workflowApi.getTemplate(templateId, version);
    }
    /**
     * Discover templates from a connected peer via DIDComm
     * Note: This is async and doesn't return templates directly - they arrive via events
     */
    async discoverTemplates(connectionId, options) {
        await this.workflowApi.discoverTemplates(connectionId, {
            template_id: options?.templateId,
            version: options?.templateVersion,
        });
    }
    /**
     * Ensure a template is available locally, fetching from peer if needed
     * Uses the API's built-in ensureTemplate method which handles discovery and waiting
     */
    async ensureTemplate(connectionId, templateId, version, waitMs = 5000) {
        // Try using the API's ensureTemplate method which handles discovery
        try {
            const template = await this.workflowApi.ensureTemplate({
                connection_id: connectionId,
                template_id: templateId,
                template_version: version,
                waitMs,
            });
            return template;
        }
        catch {
            return null;
        }
    }
    // ============================================
    // Instance Operations
    // ============================================
    /**
     * Start a new workflow instance
     */
    async start(params) {
        const { templateId, templateVersion, connectionId, participants, context } = params;
        return this.workflowApi.start({
            template_id: templateId,
            template_version: templateVersion,
            connection_id: connectionId,
            participants: participants,
            context,
        });
    }
    /**
     * Advance a workflow instance to the next state
     */
    async advance(params) {
        const { instanceId, event, input, idempotencyKey } = params;
        return this.workflowApi.advance({
            instance_id: instanceId,
            event,
            input,
            idempotency_key: idempotencyKey,
        });
    }
    /**
     * Get the current status of a workflow instance
     */
    async getStatus(instanceId, options) {
        const result = await this.workflowApi.status({
            instance_id: instanceId,
            include_actions: options?.includeActions,
            include_ui: options?.includeUi,
            ui_profile: options?.uiProfile,
        });
        return result;
    }
    /**
     * List all workflow instances, optionally filtered by connection
     * Uses the repository directly since the API doesn't expose list methods
     */
    async listInstances(connectionId) {
        const repo = this.instanceRepository;
        if (connectionId) {
            return repo.findByConnection(this.agent.context, connectionId);
        }
        return repo.getAll(this.agent.context);
    }
    /**
     * Get a single workflow instance by ID
     */
    async getInstance(instanceId) {
        try {
            return await this.instanceRepository.getByInstanceId(this.agent.context, instanceId);
        }
        catch {
            return null;
        }
    }
    /**
     * Pause a workflow instance
     */
    async pause(instanceId) {
        await this.workflowApi.pause({ instance_id: instanceId });
    }
    /**
     * Resume a paused workflow instance
     */
    async resume(instanceId) {
        await this.workflowApi.resume({ instance_id: instanceId });
    }
    /**
     * Cancel a workflow instance
     */
    async cancel(instanceId) {
        await this.workflowApi.cancel({ instance_id: instanceId });
    }
    // ============================================
    // Helper Methods
    // ============================================
    /**
     * Determine the UI profile (sender/receiver) based on the agent's DID
     */
    async deriveUiProfile(instanceId) {
        const status = await this.getStatus(instanceId);
        // Check if we're the holder (receiver) or issuer (sender)
        const holderDid = status.participants?.holder?.did;
        const issuerDid = status.participants?.issuer?.did;
        // If we're the holder, we're the receiver
        if (holderDid && this.isOurDid(holderDid)) {
            return 'receiver';
        }
        // If we're the issuer, we're the sender
        if (issuerDid && this.isOurDid(issuerDid)) {
            return 'sender';
        }
        // Default to receiver for mobile (typically the holder)
        return 'receiver';
    }
    /**
     * Check if a DID belongs to this agent
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isOurDid(did) {
        // This is a simplified check - in production you'd check against agent's DIDs
        try {
            // For now, just return false and let the caller handle it
            return false;
        }
        catch {
            return false;
        }
    }
    /**
     * Get workflows that need user attention (pending actions)
     */
    async getPendingWorkflows() {
        const instances = await this.listInstances();
        // Filter for instances that need user input
        const pending = [];
        for (const instance of instances) {
            try {
                const uiProfile = await this.deriveUiProfile(instance.id);
                const status = await this.getStatus(instance.id, {
                    includeActions: true,
                    uiProfile,
                });
                // If there are actions available (action_menu), it needs attention
                const actionMenu = status.action_menu ?? status.actions;
                if (actionMenu && actionMenu.length > 0) {
                    pending.push(instance);
                }
            }
            catch {
                // Skip instances we can't get status for
            }
        }
        return pending;
    }
    /**
     * Generate an idempotency key for an advance operation
     */
    generateIdempotencyKey(event, instanceId) {
        return `mobile:${event}:${instanceId}:${Date.now()}`;
    }
}
