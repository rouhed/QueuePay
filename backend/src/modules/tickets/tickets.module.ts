import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { Queue } from '../queues/entities/queue.entity';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { WebSocketModule } from '../websocket/websocket.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, Queue]),
    WebSocketModule,
    NotificationsModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
