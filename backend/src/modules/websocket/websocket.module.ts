import { Module } from '@nestjs/common';
import { QueueGateway } from './queue.gateway';
import { WebSocketService } from './websocket.service';

@Module({
  providers: [QueueGateway, WebSocketService],
  exports: [WebSocketService],
})
export class WebSocketModule {}
