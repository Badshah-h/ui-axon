"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowNodeSchema = exports.WorkflowSchema = exports.RegisterSchema = exports.LoginSchema = void 0;
const zod_1 = require("zod");
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
exports.RegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    firstName: zod_1.z.string().min(1, 'First name is required'),
    lastName: zod_1.z.string().min(1, 'Last name is required'),
    organizationName: zod_1.z.string().optional(),
});
exports.WorkflowSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Workflow name is required'),
    description: zod_1.z.string().optional(),
    definition: zod_1.z.record(zod_1.z.any()),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.WorkflowNodeSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Node name is required'),
    type: zod_1.z.enum(['ai_agent', 'tool', 'trigger', 'condition', 'action', 'webhook']),
    configuration: zod_1.z.record(zod_1.z.any()),
    position: zod_1.z.object({
        x: zod_1.z.number(),
        y: zod_1.z.number(),
    }),
    connections: zod_1.z.record(zod_1.z.any()).optional(),
});
