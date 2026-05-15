import { Injectable } from '@nestjs/common';
import { QueueGateway } from './queue.gateway';

/**
 * Service centralisé pour émettre des événements WebSocket
 * depuis n'importe quel module (Tickets, Queues, etc.)
 */
@Injectable()
export class WebSocketService {
  constructor(private readonly gateway: QueueGateway) {}

  // ── Événements de file d'attente ──────────────

  /**
   * Émettre une mise à jour de position pour toute une file.
   * Tous les clients connectés à cette file reçoivent leurs nouvelles positions.
   */
  emitQueueUpdated(queueId: string, data: {
    queueId: string;
    queueName: string;
    totalInQueue: number;
    positions: Array<{
      ticketId: string;
      ticketNumber: string;
      position: number;
      estimatedWaitMinutes: number;
    }>;
  }) {
    this.gateway.server
      .to(`queue:${queueId}`)
      .emit('queue:updated', data);
  }

  /**
   * Notifier qu'un client est appelé au guichet.
   */
  emitTicketCalled(queueId: string, data: {
    ticketId: string;
    ticketNumber: string;
    clientName: string | null;
    counterNumber: number | null;
    agentName: string | null;
  }) {
    // Notifier toute la file (les autres voient leur position avancer)
    this.gateway.server
      .to(`queue:${queueId}`)
      .emit('ticket:called', data);

    // Notifier le ticket spécifique (alerte directe au client)
    this.gateway.server
      .to(`ticket:${data.ticketId}`)
      .emit('ticket:your-turn', {
        ...data,
        message: 'C\'est votre tour ! Présentez-vous au guichet.',
      });
  }

  /**
   * Notifier un changement de statut de ticket.
   */
  emitTicketStatusChanged(queueId: string, data: {
    ticketId: string;
    ticketNumber: string;
    previousStatus: string;
    newStatus: string;
  }) {
    this.gateway.server
      .to(`queue:${queueId}`)
      .emit('ticket:status-changed', data);

    this.gateway.server
      .to(`ticket:${data.ticketId}`)
      .emit('ticket:status-changed', data);
  }

  /**
   * Alerter un client que son tour approche.
   * Déclenché quand il reste N personnes avant lui.
   */
  emitTicketApproaching(ticketId: string, data: {
    ticketNumber: string;
    position: number;
    estimatedWaitMinutes: number;
    message: string;
  }) {
    this.gateway.server
      .to(`ticket:${ticketId}`)
      .emit('ticket:approaching', data);
  }

  // ── Événements de statistiques ────────────────

  /**
   * Émettre les statistiques temps réel d'une file (pour l'admin/agent).
   */
  emitQueueStats(queueId: string, data: {
    queueId: string;
    totalInQueue: number;
    averageWaitMinutes: number;
    ticketsCompletedToday: number;
    ticketsCancelledToday: number;
  }) {
    this.gateway.server
      .to(`queue:${queueId}:admin`)
      .emit('queue:stats', data);
  }

  /**
   * Émettre les statistiques globales (dashboard admin).
   */
  emitGlobalStats(data: {
    totalQueuesActive: number;
    totalTicketsToday: number;
    totalInQueue: number;
    revenueToday: number;
  }) {
    this.gateway.server
      .to('admin:dashboard')
      .emit('global:stats', data);
  }

  // ── Événements d'affichage public ─────────────

  /**
   * Mettre à jour l'écran public d'une entité (salle d'attente).
   */
  emitPublicDisplay(entityId: string, data: {
    calledTickets: Array<{
      ticketNumber: string;
      counterNumber: number;
      calledAt: string;
    }>;
    currentWaitTime: number;
  }) {
    this.gateway.server
      .to(`display:${entityId}`)
      .emit('display:updated', data);
  }
}
