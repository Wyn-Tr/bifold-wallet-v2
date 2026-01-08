/**
 * BaseWorkflowHandler
 *
 * Abstract base class that provides common functionality for workflow handlers.
 * Extend this class to create new workflow handlers.
 */
/**
 * Abstract base class for workflow handlers
 *
 * Provides default implementations for optional methods and
 * helper methods for common operations.
 */
export class BaseWorkflowHandler {
    // ═══════════════════════════════════════════════════════════════════════════
    // DEFAULT IMPLEMENTATIONS - Can be overridden by subclasses
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Default: no actions available
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getActions(record, context) {
        return [];
    }
    /**
     * Default: no action handling
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async handleAction(record, actionId, data) {
        // Default: do nothing
    }
    /**
     * Default: not a notification
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isNotification(record) {
        return false;
    }
    /**
     * Default: no notification conversion
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    toNotification(record) {
        throw new Error('toNotification not implemented');
    }
    /**
     * Default: always display
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    shouldDisplay(record) {
        return true;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Helper to get the record ID
     */
    getRecordId(record) {
        return record.id ?? '';
    }
    /**
     * Helper to get the record creation date
     */
    getCreatedAt(record) {
        return record.createdAt ?? new Date();
    }
    /**
     * Helper to get the record type string
     */
    getRecordType(record) {
        return record.type ?? this.type;
    }
    /**
     * Helper to create a basic chat message structure
     */
    createBaseMessage(record, context, renderEvent) {
        const role = this.getRole(record);
        return {
            _id: this.getRecordId(record),
            text: this.getLabel(record, context.t),
            renderEvent,
            createdAt: this.getCreatedAt(record),
            user: { _id: role },
        };
    }
}
