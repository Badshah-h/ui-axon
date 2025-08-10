import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { AxonPulsEvent, EventType } from '@shared/types/websocket';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
@Injectable()
export class AxonPulsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AxonPulsGateway.name);
  private connectedUsers = new Map<string, Socket>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    // Store user connection
    const userId = client.handshake.auth?.userId;
    if (userId) {
      this.connectedUsers.set(userId, client);
      
      // Broadcast user connection
      this.broadcastEvent({
        id: `${Date.now()}-${client.id}`,
        type: EventType.USER_CONNECTED,
        payload: { userId, socketId: client.id },
        timestamp: new Date(),
        userId,
      });
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Remove user connection
    const userId = client.handshake.auth?.userId;
    if (userId) {
      this.connectedUsers.delete(userId);
      
      // Broadcast user disconnection
      this.broadcastEvent({
        id: `${Date.now()}-${client.id}`,
        type: EventType.USER_DISCONNECTED,
        payload: { userId, socketId: client.id },
        timestamp: new Date(),
        userId,
      });
    }
  }

  @SubscribeMessage('workflow_update')
  handleWorkflowUpdate(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast workflow updates to all connected clients
    client.broadcast.emit('workflow_updated', data);
  }

  @SubscribeMessage('collaboration_update')
  handleCollaborationUpdate(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast collaboration updates
    this.broadcastEvent({
      id: `${Date.now()}-${client.id}`,
      type: EventType.COLLABORATION_UPDATE,
      payload: data,
      timestamp: new Date(),
      userId: client.handshake.auth?.userId,
      workflowId: data.workflowId,
    });
  }

  // Public methods for broadcasting events
  broadcastWorkflowEvent(event: AxonPulsEvent) {
    this.server.emit('workflow_event', event);
  }

  broadcastToUser(userId: string, event: string, data: any) {
    const userSocket = this.connectedUsers.get(userId);
    if (userSocket) {
      userSocket.emit(event, data);
    }
  }

  private broadcastEvent(event: AxonPulsEvent) {
    this.server.emit('axon_puls_event', event);
  }
}