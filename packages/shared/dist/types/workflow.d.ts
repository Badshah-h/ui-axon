export interface WorkflowNode {
    id: string;
    name: string;
    type: NodeType;
    configuration: Record<string, any>;
    position: {
        x: number;
        y: number;
    };
    connections: Record<string, any>;
}
export interface Workflow {
    id: string;
    name: string;
    description?: string;
    status: WorkflowStatus;
    definition: Record<string, any>;
    metadata?: Record<string, any>;
    version: number;
    nodes: WorkflowNode[];
    createdAt: Date;
    updatedAt: Date;
}
export interface WorkflowExecution {
    id: string;
    status: ExecutionStatus;
    input?: Record<string, any>;
    output?: Record<string, any>;
    logs?: Record<string, any>[];
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
    duration: number;
    workflowId: string;
    triggeredById: string;
}
export declare enum NodeType {
    AI_AGENT = "ai_agent",
    TOOL = "tool",
    TRIGGER = "trigger",
    CONDITION = "condition",
    ACTION = "action",
    WEBHOOK = "webhook"
}
export declare enum WorkflowStatus {
    DRAFT = "draft",
    ACTIVE = "active",
    PAUSED = "paused",
    ARCHIVED = "archived"
}
export declare enum ExecutionStatus {
    PENDING = "pending",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
