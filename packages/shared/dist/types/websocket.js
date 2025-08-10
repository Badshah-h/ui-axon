"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventType = void 0;
var EventType;
(function (EventType) {
    EventType["WORKFLOW_STARTED"] = "workflow_started";
    EventType["WORKFLOW_COMPLETED"] = "workflow_completed";
    EventType["WORKFLOW_FAILED"] = "workflow_failed";
    EventType["NODE_EXECUTED"] = "node_executed";
    EventType["USER_CONNECTED"] = "user_connected";
    EventType["USER_DISCONNECTED"] = "user_disconnected";
    EventType["COLLABORATION_UPDATE"] = "collaboration_update";
})(EventType || (exports.EventType = EventType = {}));
