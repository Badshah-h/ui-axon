import { z } from 'zod';
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const RegisterSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    organizationName: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const WorkflowSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    definition: z.ZodRecord<z.ZodAny, z.core.SomeType>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodAny, z.core.SomeType>>;
}, z.core.$strip>;
export declare const WorkflowNodeSchema: z.ZodObject<{
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
}, z.core.$strip>;
