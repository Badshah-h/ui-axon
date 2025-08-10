import { Module } from '@nestjs/common';
import { AxonPulsGateway } from './axon-puls.gateway';
import { WebsocketService } from './websocket.service';

@Module({
  providers: [AxonPulsGateway, WebsocketService],
  exports: [WebsocketService],
})
export class WebsocketsModule {}