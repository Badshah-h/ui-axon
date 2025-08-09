export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
  status?: NodeStatus;
  executionTime?: number;
  error?: string;
  output?: any;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
  data?: EdgeData;
}

export interface EdgeData {
  condition?: string;
  label?: string;
}

export interface NodeData {
  label: string;
  description?: string;
  config: NodeConfig;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
}

export interface NodeConfig {
  // Common properties
  label: string;
  description?: string;
  retries?: number;
  timeout?: number;
  continueOnError?: boolean;
  customId?: string;

  // Agent-specific
  agentId?: string;
  agentConfig?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;

  // Tool-specific
  toolId?: string;
  toolParams?: string;
  
  // Condition-specific
  condition?: string;
  
  // Parallel-specific
  branches?: number;
  aggregation?: 'all' | 'any' | 'majority';
  
  // Human input-specific
  prompt?: string;
  inputType?: 'text' | 'choice' | 'file';
  choices?: string;
  required?: boolean;
  
  // Delay-specific
  delayTime?: number;
  delayUnit?: 'seconds' | 'minutes' | 'hours';
  
  // Hybrid-specific
  toolIds?: string[];
  hybridConfig?: string;
  maxToolCalls?: number;
  autoFallback?: boolean;
}

export type NodeType = 
  | 'agent'
  | 'tool' 
  | 'condition'
  | 'parallel'
  | 'human_input'
  | 'delay'
  | 'hybrid'
  | 'start'
  | 'end'
  | 'webhook'
  | 'api_call'
  | 'data_transform'
  | 'loop'
  | 'switch';

export type NodeStatus = 
  | 'idle'
  | 'running'
  | 'success'
  | 'error'
  | 'waiting'
  | 'skipped'
  | 'timeout';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: Record<string, any>;
  settings: WorkflowSettings;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags?: string[];
  isPublic?: boolean;
  status: 'draft' | 'published' | 'archived';
}

export interface WorkflowSettings {
  maxExecutionTime?: number;
  retryPolicy?: RetryPolicy;
  errorHandling?: ErrorHandling;
  logging?: LoggingSettings;
  notifications?: NotificationSettings;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  baseDelay: number;
  maxDelay: number;
}

export interface ErrorHandling {
  onError: 'stop' | 'continue' | 'retry';
  fallbackWorkflow?: string;
  notifyOnError: boolean;
}

export interface LoggingSettings {
  level: 'debug' | 'info' | 'warn' | 'error';
  includeInputs: boolean;
  includeOutputs: boolean;
  retention: number; // days
}

export interface NotificationSettings {
  onStart: boolean;
  onComplete: boolean;
  onError: boolean;
  channels: NotificationChannel[];
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook';
  config: Record<string, any>;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  triggeredBy: string;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  nodeExecutions: NodeExecution[];
  logs: ExecutionLog[];
}

export type ExecutionStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export interface NodeExecution {
  id: string;
  nodeId: string;
  status: NodeStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  retryCount: number;
  logs: ExecutionLog[];
}

export interface ExecutionLog {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  nodeId?: string;
  data?: Record<string, any>;
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  provider: AIProvider;
  model: string;
  config: AgentConfig;
  tools?: string[];
  systemPrompt?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isActive: boolean;
}

export interface AgentConfig {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  streaming?: boolean;
  responseFormat?: 'text' | 'json';
}

export type AIProvider = 
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'mistral'
  | 'cohere'
  | 'huggingface'
  | 'local';

export interface Tool {
  id: string;
  name: string;
  description: string;
  type: ToolType;
  config: ToolConfig;
  schema: ToolSchema;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isActive: boolean;
}

export type ToolType = 
  | 'api'
  | 'database'
  | 'file'
  | 'email'
  | 'webhook'
  | 'custom'
  | 'builtin';

export interface ToolConfig {
  endpoint?: string;
  method?: string;
  headers?: Record<string, string>;
  authentication?: AuthConfig;
  timeout?: number;
  retries?: number;
}

export interface AuthConfig {
  type: 'none' | 'bearer' | 'basic' | 'api_key' | 'oauth2';
  credentials: Record<string, string>;
}

export interface ToolSchema {
  input: Record<string, ParameterSchema>;
  output: Record<string, ParameterSchema>;
}

export interface ParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  default?: any;
  enum?: any[];
  format?: string;
  properties?: Record<string, ParameterSchema>;
  items?: ParameterSchema;
}

export interface AxonPulsEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  source: string;
  target?: string;
  data: Record<string, any>;
  correlationId?: string;
  userId?: string;
  workflowId?: string;
  nodeId?: string;
}

export type EventType = 
  | 'workflow.started'
  | 'workflow.completed'
  | 'workflow.failed'
  | 'workflow.cancelled'
  | 'node.started'
  | 'node.completed'
  | 'node.failed'
  | 'node.waiting'
  | 'agent.message'
  | 'agent.stream'
  | 'tool.called'
  | 'tool.response'
  | 'user.input'
  | 'system.error'
  | 'system.warning';

export interface StreamingResponse {
  id: string;
  type: 'text' | 'function_call' | 'error' | 'complete';
  content: string;
  delta?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>;
  preview?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime?: number;
  isOfficial: boolean;
}

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  config: IntegrationConfig;
  status: 'active' | 'inactive' | 'error';
  lastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type IntegrationType = 
  | 'slack'
  | 'discord'
  | 'teams'
  | 'email'
  | 'webhook'
  | 'database'
  | 'api'
  | 'file_storage'
  | 'crm'
  | 'analytics';

export interface IntegrationConfig {
  credentials: Record<string, string>;
  settings: Record<string, any>;
  endpoints?: Record<string, string>;
  webhooks?: WebhookConfig[];
}

export interface WebhookConfig {
  url: string;
  events: EventType[];
  secret?: string;
  headers?: Record<string, string>;
}