/**
 * Workflow Module Types
 *
 * This module provides a modular, pluggable architecture for handling different
 * workflow types in the chat interface. It allows switching between different
 * backends (Credo DIDComm, Manual workflows, OpenID, etc.) without changing the UI.
 */
/**
 * Supported workflow types
 */
export var WorkflowType;
(function (WorkflowType) {
    WorkflowType["Credential"] = "credential";
    WorkflowType["Proof"] = "proof";
    WorkflowType["BasicMessage"] = "basic-message";
    WorkflowType["ActionMenu"] = "action-menu";
    WorkflowType["Manual"] = "manual";
    WorkflowType["DIDComm"] = "didcomm";
    WorkflowType["OpenID"] = "openid";
})(WorkflowType || (WorkflowType = {}));
