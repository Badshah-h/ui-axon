export interface AxonPulsEvent {
  id: string;
  type: EventType;
  payload: Record<string, any>;
  timestamp: Date;
  userId?: string;
  workflowId?: string;
}

export interface WebSocketMessage {
  event: string;
  data: any;
  timestamp: Date;
}

export enum EventType {
  WORKFLOW_STARTED = 'workflow_started',
  WORKFLOW_COMPLETED = 'workflow_completed',
  WORKFLOW_FAILED = 'workflow_failed',
  NODE_EXECUTED = 'node_executed',
  USER_CONNECTED = 'user_connected',
  USER_DISCONNECTED = 'user_disconnected',
  COLLABORATION_UPDATE = 'collaboration_update',
}