"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionStatus = exports.WorkflowStatus = exports.NodeType = void 0;
var NodeType;
(function (NodeType) {
    NodeType["AI_AGENT"] = "ai_agent";
    NodeType["TOOL"] = "tool";
    NodeType["TRIGGER"] = "trigger";
    NodeType["CONDITION"] = "condition";
    NodeType["ACTION"] = "action";
    NodeType["WEBHOOK"] = "webhook";
})(NodeType || (exports.NodeType = NodeType = {}));
var WorkflowStatus;
(function (WorkflowStatus) {
    WorkflowStatus["DRAFT"] = "draft";
    WorkflowStatus["ACTIVE"] = "active";
    WorkflowStatus["PAUSED"] = "paused";
    WorkflowStatus["ARCHIVED"] = "archived";
})(WorkflowStatus || (exports.WorkflowStatus = WorkflowStatus = {}));
var ExecutionStatus;
(function (ExecutionStatus) {
    ExecutionStatus["PENDING"] = "pending";
    ExecutionStatus["RUNNING"] = "running";
    ExecutionStatus["COMPLETED"] = "completed";
    ExecutionStatus["FAILED"] = "failed";
    ExecutionStatus["CANCELLED"] = "cancelled";
})(ExecutionStatus || (exports.ExecutionStatus = ExecutionStatus = {}));
