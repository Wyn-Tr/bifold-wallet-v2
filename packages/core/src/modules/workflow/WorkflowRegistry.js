/**
 * WorkflowRegistry Implementation
 *
 * Central registry that manages workflow handlers and routes records
 * to the appropriate handler for processing.
 */
import { WorkflowType, } from './types';
export class WorkflowRegistry {
    handlers = new Map();
    chatActions = new Map();
    chatScreenConfig;
    // ═══════════════════════════════════════════════════════════════════════════
    // REGISTRATION
    // ═══════════════════════════════════════════════════════════════════════════
    register(handler) {
        this.handlers.set(handler.type, handler);
    }
    unregister(type) {
        this.handlers.delete(type);
    }
    getHandlers() {
        return Array.from(this.handlers.values());
    }
    getHandlerByType(type) {
        return this.handlers.get(type);
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // RESOLUTION
    // ═══════════════════════════════════════════════════════════════════════════
    getHandler(record) {
        for (const handler of this.handlers.values()) {
            if (handler.canHandle(record)) {
                return handler;
            }
        }
        return undefined;
    }
    canHandle(record) {
        return this.getHandler(record) !== undefined;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // BULK OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════
    toMessages(records, connection, context) {
        const messages = [];
        for (const record of records) {
            const handler = this.getHandler(record);
            if (handler) {
                // Check if the record should be displayed
                if (handler.shouldDisplay && !handler.shouldDisplay(record)) {
                    continue;
                }
                try {
                    const message = handler.toMessage(record, connection, context);
                    messages.push(message);
                }
                catch {
                    // Failed to convert record to message - skip
                }
            }
        }
        return messages;
    }
    getNotifications(records) {
        const notifications = [];
        for (const record of records) {
            const handler = this.getHandler(record);
            if (handler && handler.isNotification && handler.toNotification) {
                if (handler.isNotification(record)) {
                    try {
                        const notification = handler.toNotification(record);
                        notifications.push(notification);
                    }
                    catch { /* notification conversion error */ }
                }
            }
        }
        return notifications;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // CHAT ACTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    getChatActions(context) {
        const actions = [];
        for (const actionOrFactory of this.chatActions.values()) {
            if (typeof actionOrFactory === 'function') {
                const action = actionOrFactory(context);
                if (action) {
                    actions.push(action);
                }
            }
            else {
                actions.push(actionOrFactory);
            }
        }
        return actions;
    }
    registerChatAction(action) {
        if (typeof action === 'function') {
            // Generate a unique ID for factory functions
            const id = `factory_${this.chatActions.size}`;
            this.chatActions.set(id, action);
        }
        else {
            this.chatActions.set(action.id, action);
        }
    }
    unregisterChatAction(actionId) {
        this.chatActions.delete(actionId);
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // CHAT SCREEN CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    setChatScreenConfig(config) {
        this.chatScreenConfig = config;
        // Apply renderers to handlers if provided
        if (config.credentialRenderer) {
            this.setCredentialRenderer(config.credentialRenderer);
        }
        if (config.proofRenderer) {
            this.setProofRenderer(config.proofRenderer);
        }
    }
    getChatScreenConfig() {
        return this.chatScreenConfig;
    }
    setCredentialRenderer(renderer) {
        const handler = this.handlers.get(WorkflowType.Credential);
        if (handler && handler.setRenderer) {
            handler.setRenderer(renderer);
        }
        // Also store in config
        if (!this.chatScreenConfig) {
            this.chatScreenConfig = {};
        }
        this.chatScreenConfig.credentialRenderer = renderer;
    }
    setProofRenderer(renderer) {
        const handler = this.handlers.get(WorkflowType.Proof);
        if (handler && handler.setRenderer) {
            handler.setRenderer(renderer);
        }
        // Also store in config
        if (!this.chatScreenConfig) {
            this.chatScreenConfig = {};
        }
        this.chatScreenConfig.proofRenderer = renderer;
    }
}
/**
 * Create a new WorkflowRegistry instance with default configuration
 */
export function createWorkflowRegistry() {
    return new WorkflowRegistry();
}
