import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

/**
 * Gateway WebSocket principal de QueuePay.
 *
 * Les clients se connectent et rejoignent des "rooms" pour recevoir
 * les mises à jour en temps réel :
 *
 *  - queue:{queueId}         → Suivi d'une file (clients en file)
 *  - ticket:{ticketId}       → Suivi d'un ticket spécifique
 *  - queue:{queueId}:admin   → Stats admin d'une file
 *  - admin:dashboard         → Dashboard global admin
 *  - display:{entityId}      → Écran public d'une entité
 */
@WebSocketGateway({
  cors: {
    origin: [
      process.env.ADMIN_URL || 'http://localhost:3000',
      process.env.CLIENT_URL || 'http://localhost:3002',
      process.env.AGENT_URL || 'http://localhost:3003',
      'http://localhost:3000',
      'http://localhost:3002',
      'http://localhost:3003',
    ],
    credentials: true,
  },
  namespace: '/ws',
  transports: ['websocket', 'polling'],
})
export class QueueGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger('QueueGateway');

  // ── Lifecycle hooks ───────────────────────────

  afterInit() {
    this.logger.log('🔌 WebSocket Gateway initialisé (namespace: /ws)');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connecté: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client déconnecté: ${client.id}`);
  }

  // ── Rejoindre une file d'attente ──────────────

  @SubscribeMessage('join:queue')
  handleJoinQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { queueId: string },
  ) {
    const room = `queue:${data.queueId}`;
    client.join(room);
    this.logger.debug(`${client.id} a rejoint la room: ${room}`);
    return { event: 'joined', room };
  }

  @SubscribeMessage('leave:queue')
  handleLeaveQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { queueId: string },
  ) {
    const room = `queue:${data.queueId}`;
    client.leave(room);
    this.logger.debug(`${client.id} a quitté la room: ${room}`);
    return { event: 'left', room };
  }

  // ── Suivre un ticket spécifique ───────────────

  @SubscribeMessage('join:ticket')
  handleJoinTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    const room = `ticket:${data.ticketId}`;
    client.join(room);
    this.logger.debug(`${client.id} suit le ticket: ${room}`);
    return { event: 'joined', room };
  }

  @SubscribeMessage('leave:ticket')
  handleLeaveTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    const room = `ticket:${data.ticketId}`;
    client.leave(room);
    return { event: 'left', room };
  }

  // ── Admin : surveiller une file ───────────────

  @SubscribeMessage('join:queue:admin')
  handleJoinQueueAdmin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { queueId: string },
  ) {
    const room = `queue:${data.queueId}:admin`;
    client.join(room);
    this.logger.debug(`Admin ${client.id} surveille: ${room}`);
    return { event: 'joined', room };
  }

  // ── Admin : dashboard global ──────────────────

  @SubscribeMessage('join:admin:dashboard')
  handleJoinDashboard(@ConnectedSocket() client: Socket) {
    client.join('admin:dashboard');
    this.logger.debug(`Admin ${client.id} sur le dashboard`);
    return { event: 'joined', room: 'admin:dashboard' };
  }

  // ── Affichage public : écran de salle ─────────

  @SubscribeMessage('join:display')
  handleJoinDisplay(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { entityId: string },
  ) {
    const room = `display:${data.entityId}`;
    client.join(room);
    this.logger.debug(`Écran public ${client.id}: ${room}`);
    return { event: 'joined', room };
  }

  // ── Ping/Pong pour maintenir la connexion ─────

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { event: 'pong', timestamp: new Date().toISOString() };
  }
}
