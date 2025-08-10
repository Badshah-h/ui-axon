import { Injectable } from '@nestjs/common';
import { AxonPulsGateway } from './axon-puls.gateway';
import { AxonPulsEvent, EventType } from '@shared/types/websocket';

@Injectable()
export class WebsocketService {
  constructor(private axonPulsGateway: AxonPulsGateway) {}

  emitWorkflowStarted(workflowId: string, userId: string, data: any) {
    const event: AxonPulsEvent = {
      id: `${Date.now()}-workflow-started`,
      type: EventType.WORKFLOW_STARTED,
      payload: data,
      timestamp: new Date(),
      userId,
      workflowId,
    };
    
    this.axonPulsGateway.broadcastWorkflowEvent(event);
  }

  emitWorkflowCompleted(workflowId: string, userId: string, data: any) {
    const event: AxonPulsEvent = {
      id: `${Date.now()}-workflow-completed`,
      type: EventType.WORKFLOW_COMPLETED,
      payload: data,
      timestamp: new Date(),
      userId,
      workflowId,
    };
    
    this.axonPulsGateway.broadcastWorkflowEvent(event);
  }

  emitWorkflowFailed(workflowId: string, userId: string, error: string) {
    const event: AxonPulsEvent = {
      id: `${Date.now()}-workflow-failed`,
      type: EventType.WORKFLOW_FAILED,
      payload: { error },
      timestamp: new Date(),
      userId,
      workflowId,
    };
    
    this.axonPulsGateway.broadcastWorkflowEvent(event);
  }

  emitNodeExecuted(workflowId: string, userId: string, nodeData: any) {
    const event: AxonPulsEvent = {
      id: `${Date.now()}-node-executed`,
      type: EventType.NODE_EXECUTED,
      payload: nodeData,
      timestamp: new Date(),
      userId,
      workflowId,
    };
    
    this.axonPulsGateway.broadcastWorkflowEvent(event);
  }

  emitToUser(userId: string, event: string, data: any) {
    this.axonPulsGateway.broadcastToUser(userId, event, data);
  }
}