import { z } from 'zod';

export const WorkflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Workflow name is required'),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'paused', 'archived']),
  definition: z.record(z.any()),
  metadata: z.record(z.any()).optional(),
  version: z.number().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const WorkflowNodeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Node name is required'),
  type: z.enum(['ai_agent', 'tool', 'trigger', 'condition', 'action', 'webhook']),
  configuration: z.record(z.any()),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  connections: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const WorkflowExecutionSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  input: z.record(z.any()).optional(),
  output: z.record(z.any()).optional(),
  logs: z.array(z.record(z.any())).optional(),
  error: z.string().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  duration: z.number(),
  workflowId: z.string().uuid(),
  triggeredById: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateWorkflowSchema = WorkflowSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  version: true,
}).partial({
  status: true,
});

export const UpdateWorkflowSchema = CreateWorkflowSchema.partial();