import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  organizationName: z.string().optional(),
});

export const WorkflowSchema = z.object({
  name: z.string().min(1, 'Workflow name is required'),
  description: z.string().optional(),
  definition: z.record(z.any()),
  metadata: z.record(z.any()).optional(),
});

export const WorkflowNodeSchema = z.object({
  name: z.string().min(1, 'Node name is required'),
  type: z.enum(['ai_agent', 'tool', 'trigger', 'condition', 'action', 'webhook']),
  configuration: z.record(z.any()),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  connections: z.record(z.any()).optional(),
});