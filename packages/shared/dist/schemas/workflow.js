"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateWorkflowSchema = exports.CreateWorkflowSchema = exports.WorkflowExecutionSchema = exports.WorkflowNodeSchema = exports.WorkflowSchema = void 0;
const zod_1 = require("zod");
exports.WorkflowSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1, 'Workflow name is required'),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(['draft', 'active', 'paused', 'archived']),
    definition: zod_1.z.record(zod_1.z.any()),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    version: zod_1.z.number().min(1),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.WorkflowNodeSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1, 'Node name is required'),
    type: zod_1.z.enum(['ai_agent', 'tool', 'trigger', 'condition', 'action', 'webhook']),
    configuration: zod_1.z.record(zod_1.z.any()),
    position: zod_1.z.object({
        x: zod_1.z.number(),
        y: zod_1.z.number(),
    }),
    connections: zod_1.z.record(zod_1.z.any()).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.WorkflowExecutionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    status: zod_1.z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
    input: zod_1.z.record(zod_1.z.any()).optional(),
    output: zod_1.z.record(zod_1.z.any()).optional(),
    logs: zod_1.z.array(zod_1.z.record(zod_1.z.any())).optional(),
    error: zod_1.z.string().optional(),
    startedAt: zod_1.z.date().optional(),
    completedAt: zod_1.z.date().optional(),
    duration: zod_1.z.number(),
    workflowId: zod_1.z.string().uuid(),
    triggeredById: zod_1.z.string().uuid(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.CreateWorkflowSchema = exports.WorkflowSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    version: true,
}).partial({
    status: true,
});
exports.UpdateWorkflowSchema = exports.CreateWorkflowSchema.partial();
