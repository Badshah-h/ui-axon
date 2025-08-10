import { z } from 'zod';
export declare const WorkflowSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<{
        draft: "draft";
        active: "active";
        paused: "paused";
        archived: "archived";
    }>;
    definition: z.ZodRecord<z.ZodAny, z.core.SomeType>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodAny, z.core.SomeType>>;
    version: z.ZodNumber;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, z.core.$strip>;
export declare const WorkflowNodeSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<{
        ai_agent: "ai_agent";
        tool: "tool";
        trigger: "trigger";
        condition: "condition";
        action: "action";
        webhook: "webhook";
    }>;
    configuration: z.ZodRecord<z.ZodAny, z.core.SomeType>;
    position: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.core.$strip>;
    connections: z.ZodOptional<z.ZodRecord<z.ZodAny, z.core.SomeType>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, z.core.$strip>;
export declare const WorkflowExecutionSchema: z.ZodObject<{
    id: z.ZodString;
    status: z.ZodEnum<{
        pending: "pending";
        running: "running";
        completed: "completed";
        failed: "failed";
        cancelled: "cancelled";
    }>;
    input: z.ZodOptional<z.ZodRecord<z.ZodAny, z.core.SomeType>>;
    output: z.ZodOptional<z.ZodRecord<z.ZodAny, z.core.SomeType>>;
    logs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodAny, z.core.SomeType>>>;
    error: z.ZodOptional<z.ZodString>;
    startedAt: z.ZodOptional<z.ZodDate>;
    completedAt: z.ZodOptional<z.ZodDate>;
    duration: z.ZodNumber;
    workflowId: z.ZodString;
    triggeredById: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, z.core.$strip>;
export declare const CreateWorkflowSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        active: "active";
        paused: "paused";
        archived: "archived";
    }>>;
    definition: z.ZodRecord<z.ZodAny, z.core.SomeType>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodAny, z.core.SomeType>>;
}, z.core.$strip>;
export declare const UpdateWorkflowSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        active: "active";
        paused: "paused";
        archived: "archived";
    }>>>;
    definition: z.ZodOptional<z.ZodRecord<z.ZodAny, z.core.SomeType>>;
    metadata: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodAny, z.core.SomeType>>>;
}, z.core.$strip>;
