import { io, Socket } from 'socket.io-client';
import { AxonPulsEvent, EventType } from '@/types/workflow';

export class AxonPulsClient {
  private socket: Socket | null = null;
  private eventHandlers: Map<EventType, Set<(event: AxonPulsEvent) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;

  constructor(private serverUrl: string, private authToken?: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.serverUrl, {
          auth: {
            token: this.authToken,
          },
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
        });

        this.socket.on('connect', () => {
          console.log('AxonPuls connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('disconnect', (reason: any) => {
          console.log('AxonPuls disconnected:', reason);
          this.isConnected = false;
        });

        this.socket.on('connect_error', (error: any) => {
          console.error('AxonPuls connection error:', error);
          this.isConnected = false;
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(error);
          }
        });

        this.socket.on('reconnect', (attemptNumber: any) => {
          console.log(`AxonPuls reconnected after ${attemptNumber} attempts`);
          this.isConnected = true;
        });

        this.socket.on('reconnect_error', (error: any) => {
          console.error('AxonPuls reconnection error:', error);
          this.reconnectAttempts++;
        });

        // Listen for all AxonPuls events
        this.socket.on('axon:event', (event: AxonPulsEvent) => {
          this.handleEvent(event);
        });

        // Listen for streaming events
        this.socket.on('axon:stream', (data: any) => {
          this.handleStreamEvent(data);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Subscribe to specific event types
  subscribe(eventType: EventType, handler: (event: AxonPulsEvent) => void): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    
    this.eventHandlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(eventType);
        }
      }
    };
  }

  // Subscribe to workflow-specific events
  subscribeToWorkflow(workflowId: string, handler: (event: AxonPulsEvent) => void): () => void {
    if (this.socket) {
      this.socket.emit('join:workflow', workflowId);
    }

    const unsubscribers: (() => void)[] = [];

    // Subscribe to all workflow-related events
    const workflowEvents: EventType[] = [
      'workflow.started',
      'workflow.completed',
      'workflow.failed',
      'workflow.cancelled',
      'node.started',
      'node.completed',
      'node.failed',
      'node.waiting',
    ];

    workflowEvents.forEach(eventType => {
      const unsubscribe = this.subscribe(eventType, (event) => {
        if (event.workflowId === workflowId) {
          handler(event);
        }
      });
      unsubscribers.push(unsubscribe);
    });

    // Return function to unsubscribe from all workflow events
    return () => {
      unsubscribers.forEach(unsub => unsub());
      if (this.socket) {
        this.socket.emit('leave:workflow', workflowId);
      }
    };
  }

  // Subscribe to node-specific events
  subscribeToNode(nodeId: string, handler: (event: AxonPulsEvent) => void): () => void {
    const nodeEvents: EventType[] = [
      'node.started',
      'node.completed',
      'node.failed',
      'node.waiting',
      'agent.message',
      'agent.stream',
      'tool.called',
      'tool.response',
    ];

    const unsubscribers: (() => void)[] = [];

    nodeEvents.forEach(eventType => {
      const unsubscribe = this.subscribe(eventType, (event) => {
        if (event.nodeId === nodeId) {
          handler(event);
        }
      });
      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  // Emit events to the server
  emit(eventType: string, data: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(eventType, data);
    } else {
      console.warn('AxonPuls not connected, cannot emit event:', eventType);
    }
  }

  // Send user input for human input nodes
  sendUserInput(nodeId: string, workflowId: string, input: any): void {
    this.emit('user:input', {
      nodeId,
      workflowId,
      input,
      timestamp: new Date(),
    });
  }

  // Request workflow execution
  executeWorkflow(workflowId: string, input?: Record<string, any>): void {
    this.emit('workflow:execute', {
      workflowId,
      input,
      timestamp: new Date(),
    });
  }

  // Cancel workflow execution
  cancelWorkflow(workflowId: string, executionId: string): void {
    this.emit('workflow:cancel', {
      workflowId,
      executionId,
      timestamp: new Date(),
    });
  }

  // Pause workflow execution
  pauseWorkflow(workflowId: string, executionId: string): void {
    this.emit('workflow:pause', {
      workflowId,
      executionId,
      timestamp: new Date(),
    });
  }

  // Resume workflow execution
  resumeWorkflow(workflowId: string, executionId: string): void {
    this.emit('workflow:resume', {
      workflowId,
      executionId,
      timestamp: new Date(),
    });
  }

  private handleEvent(event: AxonPulsEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('Error handling AxonPuls event:', error);
        }
      });
    }
  }

  private handleStreamEvent(data: any): void {
    // Handle streaming events (e.g., agent responses)
    const streamEvent: AxonPulsEvent = {
      id: data.id || `stream-${Date.now()}`,
      type: 'agent.stream',
      timestamp: new Date(),
      source: data.source || 'agent',
      data: data,
      workflowId: data.workflowId,
      nodeId: data.nodeId,
    };

    this.handleEvent(streamEvent);
  }

  // Get connection status
  getConnectionStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
    };
  }

  // Update authentication token
  updateAuthToken(token: string): void {
    this.authToken = token;
    if (this.socket) {
      this.socket.auth = { token };
    }
  }
}

// Singleton instance for global use
let axonPulsInstance: AxonPulsClient | null = null;

export const getAxonPulsClient = (serverUrl?: string, authToken?: string): AxonPulsClient => {
  if (!axonPulsInstance && serverUrl) {
    axonPulsInstance = new AxonPulsClient(serverUrl, authToken);
  }
  
  if (!axonPulsInstance) {
    throw new Error('AxonPuls client not initialized. Call with serverUrl first.');
  }

  return axonPulsInstance;
};

// React hook for using AxonPuls in components
export const useAxonPuls = () => {
  const client = getAxonPulsClient();
  
  return {
    client,
    subscribe: client.subscribe.bind(client),
    subscribeToWorkflow: client.subscribeToWorkflow.bind(client),
    subscribeToNode: client.subscribeToNode.bind(client),
    emit: client.emit.bind(client),
    executeWorkflow: client.executeWorkflow.bind(client),
    cancelWorkflow: client.cancelWorkflow.bind(client),
    sendUserInput: client.sendUserInput.bind(client),
    getConnectionStatus: client.getConnectionStatus.bind(client),
  };
};