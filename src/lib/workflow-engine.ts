import { 
  Workflow, 
  WorkflowNode, 
  WorkflowEdge, 
  WorkflowExecution, 
  NodeExecution, 
  ExecutionLog,
  NodeStatus,
  ExecutionStatus,
  AxonPulsEvent 
} from '@/types/workflow';
import { errorMonitoring } from './error-monitoring';
import { getAxonPulsClient } from './axon-puls';

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  userId: string;
  input: Record<string, any>;
  variables: Record<string, any>;
  nodeOutputs: Record<string, any>;
  startTime: Date;
  timeout?: number;
}

export interface NodeExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  logs: ExecutionLog[];
  duration: number;
  retryCount: number;
}

export interface ExecutionOptions {
  timeout?: number;
  maxRetries?: number;
  continueOnError?: boolean;
  variables?: Record<string, any>;
  debugMode?: boolean;
}

export class WorkflowExecutionEngine {
  private static instance: WorkflowExecutionEngine;
  private activeExecutions = new Map<string, ExecutionContext>();
  private nodeExecutors = new Map<string, NodeExecutor>();
  private eventEmitter = getAxonPulsClient();

  private constructor() {
    this.registerDefaultNodeExecutors();
  }

  static getInstance(): WorkflowExecutionEngine {
    if (!WorkflowExecutionEngine.instance) {
      WorkflowExecutionEngine.instance = new WorkflowExecutionEngine();
    }
    return WorkflowExecutionEngine.instance;
  }

  private registerDefaultNodeExecutors(): void {
    this.nodeExecutors.set('agent', new AgentNodeExecutor());
    this.nodeExecutors.set('tool', new ToolNodeExecutor());
    this.nodeExecutors.set('condition', new ConditionNodeExecutor());
    this.nodeExecutors.set('parallel', new ParallelNodeExecutor());
    this.nodeExecutors.set('human_input', new HumanInputNodeExecutor());
    this.nodeExecutors.set('delay', new DelayNodeExecutor());
    this.nodeExecutors.set('hybrid', new HybridNodeExecutor());
    this.nodeExecutors.set('start', new StartNodeExecutor());
    this.nodeExecutors.set('end', new EndNodeExecutor());
  }

  async executeWorkflow(
    workflow: Workflow,
    input: Record<string, any> = {},
    options: ExecutionOptions = {}
  ): Promise<WorkflowExecution> {
    const executionId = this.generateExecutionId();
    const startTime = new Date();

    const context: ExecutionContext = {
      workflowId: workflow.id,
      executionId,
      userId: 'current-user', // Get from auth context
      input,
      variables: { ...workflow.variables, ...options.variables },
      nodeOutputs: {},
      startTime,
      timeout: options.timeout || workflow.settings.maxExecutionTime,
    };

    this.activeExecutions.set(executionId, context);

    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      status: 'running',
      startedAt: startTime,
      triggeredBy: context.userId,
      input,
      nodeExecutions: [],
      logs: [],
    };

    try {
      // Emit workflow started event
      this.emitEvent({
        id: this.generateEventId(),
        type: 'workflow.started',
        timestamp: new Date(),
        source: 'execution-engine',
        workflowId: workflow.id,
        data: { executionId, input },
      });

      // Find start node
      const startNode = workflow.nodes.find(node => node.type === 'start');
      if (!startNode) {
        throw new Error('Workflow must have a start node');
      }

      // Execute workflow
      const result = await this.executeNode(startNode, workflow, context, options);
      
      execution.status = result.success ? 'completed' : 'failed';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - startTime.getTime();
      execution.output = result.output;
      execution.error = result.error;

      // Emit workflow completed event
      this.emitEvent({
        id: this.generateEventId(),
        type: result.success ? 'workflow.completed' : 'workflow.failed',
        timestamp: new Date(),
        source: 'execution-engine',
        workflowId: workflow.id,
        data: { 
          executionId, 
          duration: execution.duration,
          output: execution.output,
          error: execution.error 
        },
      });

    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - startTime.getTime();
      execution.error = error instanceof Error ? error.message : 'Unknown error';

      errorMonitoring.captureWorkflowError(
        error as Error,
        workflow.id,
        undefined,
        executionId
      );

      this.emitEvent({
        id: this.generateEventId(),
        type: 'workflow.failed',
        timestamp: new Date(),
        source: 'execution-engine',
        workflowId: workflow.id,
        data: { executionId, error: execution.error },
      });

    } finally {
      this.activeExecutions.delete(executionId);
    }

    return execution;
  }

  private async executeNode(
    node: WorkflowNode,
    workflow: Workflow,
    context: ExecutionContext,
    options: ExecutionOptions,
    visitedNodes = new Set<string>()
  ): Promise<NodeExecutionResult> {
    // Prevent infinite loops
    if (visitedNodes.has(node.id)) {
      throw new Error(`Circular dependency detected at node ${node.id}`);
    }
    visitedNodes.add(node.id);

    const startTime = Date.now();
    const logs: ExecutionLog[] = [];

    // Check timeout
    if (context.timeout && Date.now() - context.startTime.getTime() > context.timeout) {
      throw new Error('Workflow execution timeout');
    }

    try {
      // Emit node started event
      this.emitEvent({
        id: this.generateEventId(),
        type: 'node.started',
        timestamp: new Date(),
        source: 'execution-engine',
        workflowId: context.workflowId,
        nodeId: node.id,
        data: { executionId: context.executionId },
      });

      // Get node executor
      const executor = this.nodeExecutors.get(node.type);
      if (!executor) {
        throw new Error(`No executor found for node type: ${node.type}`);
      }

      // Execute node with retries
      const maxRetries = node.data.config.retries || options.maxRetries || 0;
      let lastError: Error | null = null;
      let retryCount = 0;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await executor.execute(node, context, {
            ...options,
            attempt,
            maxRetries,
          });

          // Store node output
          context.nodeOutputs[node.id] = result.output;

          const duration = Date.now() - startTime;

          // Emit node completed event
          this.emitEvent({
            id: this.generateEventId(),
            type: 'node.completed',
            timestamp: new Date(),
            source: 'execution-engine',
            workflowId: context.workflowId,
            nodeId: node.id,
            data: { 
              executionId: context.executionId,
              duration,
              output: result.output,
              retryCount: attempt
            },
          });

          // Execute next nodes
          const nextNodes = this.getNextNodes(node, workflow, context);
          if (nextNodes.length === 0) {
            // End of workflow
            return {
              success: true,
              output: result.output,
              logs: [...logs, ...result.logs],
              duration,
              retryCount: attempt,
            };
          }

          // Execute next nodes
          let finalResult = result;
          for (const nextNode of nextNodes) {
            const nextResult = await this.executeNode(
              nextNode,
              workflow,
              context,
              options,
              new Set(visitedNodes)
            );
            
            if (!nextResult.success && !options.continueOnError) {
              return nextResult;
            }
            
            finalResult = nextResult;
          }

          return finalResult;

        } catch (error) {
          lastError = error as Error;
          retryCount = attempt;

          if (attempt < maxRetries) {
            // Wait before retry with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
            await this.sleep(delay);
            
            logs.push({
              id: this.generateLogId(),
              timestamp: new Date(),
              level: 'warn',
              message: `Node execution failed, retrying (${attempt + 1}/${maxRetries + 1}): ${error.message}`,
              nodeId: node.id,
            });
          }
        }
      }

      // All retries failed
      const duration = Date.now() - startTime;
      const errorMessage = lastError?.message || 'Node execution failed';

      // Emit node failed event
      this.emitEvent({
        id: this.generateEventId(),
        type: 'node.failed',
        timestamp: new Date(),
        source: 'execution-engine',
        workflowId: context.workflowId,
        nodeId: node.id,
        data: { 
          executionId: context.executionId,
          error: errorMessage,
          duration,
          retryCount
        },
      });

      return {
        success: false,
        error: errorMessage,
        logs,
        duration,
        retryCount,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      errorMonitoring.captureWorkflowError(
        error as Error,
        context.workflowId,
        node.id,
        context.executionId
      );

      return {
        success: false,
        error: errorMessage,
        logs,
        duration,
        retryCount: 0,
      };
    }
  }

  private getNextNodes(
    currentNode: WorkflowNode,
    workflow: Workflow,
    context: ExecutionContext
  ): WorkflowNode[] {
    const outgoingEdges = workflow.edges.filter(edge => edge.source === currentNode.id);
    const nextNodes: WorkflowNode[] = [];

    for (const edge of outgoingEdges) {
      // Check edge condition if present
      if (edge.data?.condition) {
        try {
          const conditionResult = this.evaluateCondition(
            edge.data.condition,
            context.nodeOutputs[currentNode.id],
            context.variables
          );
          
          if (!conditionResult) {
            continue;
          }
        } catch (error) {
          console.error(`Error evaluating edge condition: ${error}`);
          continue;
        }
      }

      const nextNode = workflow.nodes.find(node => node.id === edge.target);
      if (nextNode) {
        nextNodes.push(nextNode);
      }
    }

    return nextNodes;
  }

  private evaluateCondition(
    condition: string,
    nodeOutput: any,
    variables: Record<string, any>
  ): boolean {
    try {
      // Create a safe evaluation context
      const context = {
        output: nodeOutput,
        result: nodeOutput,
        variables,
        ...variables,
      };

      // Simple expression evaluation (in production, use a proper expression engine)
      const func = new Function(...Object.keys(context), `return ${condition}`);
      return Boolean(func(...Object.values(context)));
    } catch (error) {
      console.error('Condition evaluation error:', error);
      return false;
    }
  }

  async cancelExecution(executionId: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      throw new Error('Execution not found');
    }

    this.activeExecutions.delete(executionId);

    this.emitEvent({
      id: this.generateEventId(),
      type: 'workflow.cancelled',
      timestamp: new Date(),
      source: 'execution-engine',
      workflowId: context.workflowId,
      data: { executionId },
    });
  }

  getActiveExecutions(): ExecutionContext[] {
    return Array.from(this.activeExecutions.values());
  }

  private emitEvent(event: AxonPulsEvent): void {
    try {
      this.eventEmitter.emit('axon:event', event);
    } catch (error) {
      console.error('Failed to emit event:', error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Base class for node executors
export abstract class NodeExecutor {
  abstract execute(
    node: WorkflowNode,
    context: ExecutionContext,
    options: ExecutionOptions & { attempt: number; maxRetries: number }
  ): Promise<NodeExecutionResult>;

  protected createLog(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    nodeId: string,
    data?: Record<string, any>
  ): ExecutionLog {
    return {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      message,
      nodeId,
      data,
    };
  }
}

// Specific node executors
class StartNodeExecutor extends NodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    return {
      success: true,
      output: context.input,
      logs: [this.createLog('info', 'Workflow started', node.id)],
      duration: 0,
      retryCount: 0,
    };
  }
}

class EndNodeExecutor extends NodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    return {
      success: true,
      output: context.nodeOutputs,
      logs: [this.createLog('info', 'Workflow completed', node.id)],
      duration: 0,
      retryCount: 0,
    };
  }
}

class AgentNodeExecutor extends NodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const logs: ExecutionLog[] = [];

    try {
      const config = node.data.config;
      
      if (!config.agentId) {
        throw new Error('Agent ID is required');
      }

      // TODO: Implement actual agent execution
      // This would integrate with the AI providers
      logs.push(this.createLog('info', `Executing agent: ${config.agentId}`, node.id));

      // Simulate agent execution
      await new Promise(resolve => setTimeout(resolve, 1000));

      const output = {
        response: 'Agent response placeholder',
        tokens: { input: 100, output: 50 },
        model: config.model || 'gpt-4',
      };

      return {
        success: true,
        output,
        logs,
        duration: Date.now() - startTime,
        retryCount: 0,
      };

    } catch (error) {
      logs.push(this.createLog('error', `Agent execution failed: ${error}`, node.id));
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Agent execution failed',
        logs,
        duration: Date.now() - startTime,
        retryCount: 0,
      };
    }
  }
}

class ToolNodeExecutor extends NodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const logs: ExecutionLog[] = [];

    try {
      const config = node.data.config;
      
      if (!config.toolId) {
        throw new Error('Tool ID is required');
      }

      logs.push(this.createLog('info', `Executing tool: ${config.toolId}`, node.id));

      // TODO: Implement actual tool execution
      // This would call the tool API or function
      await new Promise(resolve => setTimeout(resolve, 500));

      const output = {
        result: 'Tool execution result placeholder',
        metadata: { toolId: config.toolId },
      };

      return {
        success: true,
        output,
        logs,
        duration: Date.now() - startTime,
        retryCount: 0,
      };

    } catch (error) {
      logs.push(this.createLog('error', `Tool execution failed: ${error}`, node.id));
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
        logs,
        duration: Date.now() - startTime,
        retryCount: 0,
      };
    }
  }
}

class ConditionNodeExecutor extends NodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const logs: ExecutionLog[] = [];

    try {
      const config = node.data.config;
      
      if (!config.condition) {
        throw new Error('Condition expression is required');
      }

      logs.push(this.createLog('info', `Evaluating condition: ${config.condition}`, node.id));

      // Get the previous node's output for evaluation
      const previousOutputs = Object.values(context.nodeOutputs);
      const lastOutput = previousOutputs[previousOutputs.length - 1];

      const result = this.evaluateCondition(config.condition, lastOutput, context.variables);

      return {
        success: true,
        output: { conditionResult: result, evaluatedExpression: config.condition },
        logs,
        duration: Date.now() - startTime,
        retryCount: 0,
      };

    } catch (error) {
      logs.push(this.createLog('error', `Condition evaluation failed: ${error}`, node.id));
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Condition evaluation failed',
        logs,
        duration: Date.now() - startTime,
        retryCount: 0,
      };
    }
  }

  private evaluateCondition(
    condition: string,
    input: any,
    variables: Record<string, any>
  ): boolean {
    try {
      const context = { input, result: input, variables, ...variables };
      const func = new Function(...Object.keys(context), `return ${condition}`);
      return Boolean(func(...Object.values(context)));
    } catch (error) {
      throw new Error(`Invalid condition expression: ${error}`);
    }
  }
}

class ParallelNodeExecutor extends NodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const logs: ExecutionLog[] = [];

    try {
      const config = node.data.config;
      const branches = config.branches || 2;
      const aggregation = config.aggregation || 'all';

      logs.push(this.createLog('info', `Starting parallel execution with ${branches} branches`, node.id));

      // TODO: Implement actual parallel execution
      // This would execute multiple branches concurrently
      const results = await Promise.allSettled(
        Array.from({ length: branches }, async (_, i) => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
          return { branch: i, result: `Branch ${i} result` };
        })
      );

      const successfulResults = results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);

      const output = {
        aggregation,
        branches: successfulResults.length,
        results: successfulResults,
      };

      return {
        success: true,
        output,
        logs,
        duration: Date.now() - startTime,
        retryCount: 0,
      };

    } catch (error) {
      logs.push(this.createLog('error', `Parallel execution failed: ${error}`, node.id));
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Parallel execution failed',
        logs,
        duration: Date.now() - startTime,
        retryCount: 0,
      };
    }
  }
}

class HumanInputNodeExecutor extends NodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const logs: ExecutionLog[] = [];

    try {
      const config = node.data.config;
      
      logs.push(this.createLog('info', 'Waiting for human input', node.id));

      // TODO: Implement actual human input waiting
      // This would emit an event and wait for user response
      const timeout = (config.timeout || 60) * 60 * 1000; // Convert minutes to ms
      
      // Simulate waiting for input
      await new Promise(resolve => setTimeout(resolve, 2000));

      const output = {
        userInput: 'Simulated user input',
        inputType: config.inputType || 'text',
        receivedAt: new Date(),
      };

      return {
        success: true,
        output,
        logs,
        duration: Date.now() - startTime,
        retryCount: 0,
      };

    } catch (error) {
      logs.push(this.createLog('error', `Human input failed: ${error}`, node.id));
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Human input failed',
        logs,
        duration: Date.now() - startTime,
        retryCount: 0,
      };
    }
  }
}

class DelayNodeExecutor extends NodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const logs: ExecutionLog[] = [];

    try {
      const config = node.data.config;
      const delayTime = config.delayTime || 5;
      const delayUnit = config.delayUnit || 'seconds';
      
      let delayMs = delayTime * 1000; // Default to seconds
      if (delayUnit === 'minutes') delayMs = delayTime * 60 * 1000;
      if (delayUnit === 'hours') delayMs = delayTime * 60 * 60 * 1000;

      logs.push(this.createLog('info', `Delaying for ${delayTime} ${delayUnit}`, node.id));

      await new Promise(resolve => setTimeout(resolve, delayMs));

      return {
        success: true,
        output: { delayTime, delayUnit, actualDelay: Date.now() - startTime },
        logs,
        duration: Date.now() - startTime,
        retryCount: 0,
      };

    } catch (error) {
      logs.push(this.createLog('error', `Delay execution failed: ${error}`, node.id));
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delay execution failed',
        logs,
        duration: Date.now() - startTime,
        retryCount: 0,
      };
    }
  }
}

class HybridNodeExecutor extends NodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const logs: ExecutionLog[] = [];

    try {
      const config = node.data.config;
      
      if (!config.agentId) {
        throw new Error('Base agent ID is required for hybrid node');
      }

      logs.push(this.createLog('info', `Executing hybrid node with agent: ${config.agentId}`, node.id));

      // TODO: Implement actual hybrid execution
      // This would combine agent and tool capabilities
      const toolIds = config.toolIds || [];
      
      const output = {
        agentResponse: 'Hybrid agent response',
        toolsUsed: toolIds,
        hybridConfig: config.hybridConfig,
      };

      return {
        success: true,
        output,
        logs,
        duration: Date.now() - startTime,
        retryCount: 0,
      };

    } catch (error) {
      logs.push(this.createLog('error', `Hybrid execution failed: ${error}`, node.id));
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Hybrid execution failed',
        logs,
        duration: Date.now() - startTime,
        retryCount: 0,
      };
    }
  }
}

// Export singleton instance
export const workflowEngine = WorkflowExecutionEngine.getInstance();