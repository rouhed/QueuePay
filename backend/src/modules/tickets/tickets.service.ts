import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Like,
  FindOptionsWhere,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Ticket } from './entities/ticket.entity';
import { Queue } from '../queues/entities/queue.entity';
import { CreateTicketDto, ValidateTicketDto, QueryTicketDto } from './dto';
import { TicketStatus, QueueStatus, PaymentMethod } from '../../common/enums';
import { WebSocketService } from '../websocket/websocket.service';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepo: Repository<Ticket>,
    @InjectRepository(Queue)
    private readonly queuesRepo: Repository<Queue>,
    private readonly wsService: WebSocketService,
  ) {}

  // ── Générer un numéro de ticket unique ────────
  private generateTicketNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `T-${timestamp.slice(-4)}${random}`;
  }

  // ── Émettre la mise à jour de position ────────
  private async emitQueueUpdate(queueId: string) {
    const queue = await this.queuesRepo.findOne({ where: { id: queueId } });
    if (!queue) return;

    const ticketsInQueue = await this.ticketsRepo.find({
      where: { queueId, status: TicketStatus.IN_QUEUE },
      order: { positionInQueue: 'ASC' },
    });

    const avgServiceTime = 5; // minutes par ticket (à rendre dynamique plus tard)

    this.wsService.emitQueueUpdated(queueId, {
      queueId,
      queueName: queue.name,
      totalInQueue: ticketsInQueue.length,
      positions: ticketsInQueue.map((t, index) => ({
        ticketId: t.id,
        ticketNumber: t.ticketNumber,
        position: index + 1,
        estimatedWaitMinutes: (index + 1) * avgServiceTime,
      })),
    });

    // Envoyer des alertes d'approche aux clients proches
    for (const ticket of ticketsInQueue) {
      const position = ticketsInQueue.indexOf(ticket) + 1;

      if (position <= 3 && position > 0) {
        const messages: Record<number, string> = {
          1: '🔔 C\'est bientôt votre tour ! Vous êtes le prochain.',
          2: '⏰ Plus que 2 personnes avant vous. Préparez-vous !',
          3: '📢 Plus que 3 personnes avant vous.',
        };

        this.wsService.emitTicketApproaching(ticket.id, {
          ticketNumber: ticket.ticketNumber,
          position,
          estimatedWaitMinutes: position * avgServiceTime,
          message: messages[position],
        });
      }
    }
  }

  // ── Créer un ticket ───────────────────────────
  async create(dto: CreateTicketDto): Promise<Ticket> {
    // Vérifier la file
    const queue = await this.queuesRepo.findOne({
      where: { id: dto.queueId },
      relations: ['entity'],
    });

    if (!queue) {
      throw new NotFoundException(`File #${dto.queueId} introuvable`);
    }

    if (queue.status !== QueueStatus.ACTIVE) {
      throw new BadRequestException('Cette file n\'est pas active');
    }

    // Vérifier la capacité
    const currentCount = await this.ticketsRepo.count({
      where: {
        queueId: dto.queueId,
        status: TicketStatus.IN_QUEUE,
      },
    });

    if (currentCount >= queue.maxCapacity) {
      throw new BadRequestException('File d\'attente pleine');
    }

    // Calculer la position
    const lastTicket = await this.ticketsRepo.findOne({
      where: { queueId: dto.queueId },
      order: { positionInQueue: 'DESC' },
    });
    const nextPosition = (lastTicket?.positionInQueue || 0) + 1;

    // Créer le ticket
    const ticket = this.ticketsRepo.create({
      ticketNumber: this.generateTicketNumber(),
      qrCode: uuidv4(),
      queueId: dto.queueId,
      entityId: queue.entityId,
      clientId: dto.clientId || null,
      clientName: dto.clientName || null,
      clientPhone: dto.clientPhone || null,
      positionInQueue: nextPosition,
      status: TicketStatus.IN_QUEUE,
      price: Number(queue.ticketPrice),
      paymentMethod: dto.paymentMethod || (queue.isFree ? PaymentMethod.FREE : PaymentMethod.MVOLA),
      isPaid: queue.isFree,
    });

    const savedTicket = await this.ticketsRepo.save(ticket);

    // Incrémenter le compteur de la file
    await this.queuesRepo.update(dto.queueId, {
      currentPosition: nextPosition,
    });

    // 🔌 WebSocket : notifier toute la file de la mise à jour
    await this.emitQueueUpdate(dto.queueId);

    return this.findOne(savedTicket.id);
  }

  // ── Trouver tous les tickets (paginé) ─────────
  async findAll(query: QueryTicketDto) {
    const {
      search,
      queueId,
      entityId,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = query;

    const qb = this.ticketsRepo.createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.queue', 'queue')
      .leftJoinAndSelect('ticket.entity', 'entity')
      .leftJoinAndSelect('ticket.client', 'client')
      .leftJoinAndSelect('ticket.agent', 'agent');

    if (search) {
      qb.andWhere(
        '(ticket.ticketNumber ILIKE :search OR ticket.clientName ILIKE :search OR ticket.clientPhone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (queueId) {
      qb.andWhere('ticket.queueId = :queueId', { queueId });
    }

    if (entityId) {
      qb.andWhere('ticket.entityId = :entityId', { entityId });
    }

    if (status) {
      qb.andWhere('ticket.status = :status', { status });
    }

    if (dateFrom) {
      qb.andWhere('ticket.createdAt >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }

    if (dateTo) {
      qb.andWhere('ticket.createdAt <= :dateTo', { dateTo: new Date(dateTo) });
    }

    qb.orderBy('ticket.createdAt', 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Trouver par ID ────────────────────────────
  async findOne(id: string): Promise<Ticket> {
    const ticket = await this.ticketsRepo.findOne({
      where: { id },
      relations: ['queue', 'entity', 'client', 'agent'],
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket #${id} introuvable`);
    }
    return ticket;
  }

  // ── Trouver par numéro de ticket ──────────────
  async findByTicketNumber(ticketNumber: string): Promise<Ticket> {
    const ticket = await this.ticketsRepo.findOne({
      where: { ticketNumber },
      relations: ['queue', 'entity', 'client', 'agent'],
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketNumber} introuvable`);
    }
    return ticket;
  }

  // ── Trouver par QR Code ───────────────────────
  async findByQrCode(qrCode: string): Promise<Ticket> {
    const ticket = await this.ticketsRepo.findOne({
      where: { qrCode },
      relations: ['queue', 'entity', 'client', 'agent'],
    });
    if (!ticket) {
      throw new NotFoundException('QR Code invalide');
    }
    return ticket;
  }

  // ── Appeler le prochain client ────────────────
  async callNext(queueId: string, agentId: string): Promise<Ticket | null> {
    const nextTicket = await this.ticketsRepo.findOne({
      where: { queueId, status: TicketStatus.IN_QUEUE },
      order: { positionInQueue: 'ASC' },
      relations: ['queue', 'entity', 'client'],
    });

    if (!nextTicket) {
      return null;
    }

    nextTicket.status = TicketStatus.CALLED;
    nextTicket.servedBy = agentId;
    nextTicket.calledAt = new Date();

    const savedTicket = await this.ticketsRepo.save(nextTicket);

    // 🔌 WebSocket : notifier que le client est appelé
    this.wsService.emitTicketCalled(queueId, {
      ticketId: savedTicket.id,
      ticketNumber: savedTicket.ticketNumber,
      clientName: savedTicket.clientName,
      counterNumber: savedTicket.counterNumber,
      agentName: null, // TODO: récupérer le nom de l'agent
    });

    // 🔌 WebSocket : mettre à jour les positions de toute la file
    await this.emitQueueUpdate(queueId);

    return savedTicket;
  }

  // ── Valider un ticket (agent) ─────────────────
  async validate(id: string, dto: ValidateTicketDto, agentId: string): Promise<Ticket> {
    const ticket = await this.findOne(id);
    const previousStatus = ticket.status;

    switch (dto.action) {
      case 'complete':
        ticket.status = TicketStatus.COMPLETED;
        ticket.completedAt = new Date();
        ticket.servedAt = ticket.servedAt || new Date();
        break;
      case 'no_show':
        ticket.status = TicketStatus.NO_SHOW;
        break;
      case 'cancel':
        ticket.status = TicketStatus.CANCELLED;
        ticket.cancelledAt = new Date();
        break;
      case 'transfer':
        if (!dto.transferQueueId) {
          throw new BadRequestException('File de transfert requise');
        }
        // Recréer un ticket dans la nouvelle file
        await this.create({
          queueId: dto.transferQueueId,
          clientId: ticket.clientId || undefined,
          clientName: ticket.clientName || undefined,
          clientPhone: ticket.clientPhone || undefined,
          paymentMethod: ticket.paymentMethod,
        });
        ticket.status = TicketStatus.CANCELLED;
        ticket.cancelledAt = new Date();
        break;
    }

    if (dto.notes) {
      ticket.notes = dto.notes;
    }
    ticket.servedBy = agentId;

    const savedTicket = await this.ticketsRepo.save(ticket);

    // 🔌 WebSocket : notifier le changement de statut
    this.wsService.emitTicketStatusChanged(ticket.queueId, {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      previousStatus,
      newStatus: ticket.status,
    });

    // 🔌 WebSocket : mettre à jour les positions
    await this.emitQueueUpdate(ticket.queueId);

    return savedTicket;
  }

  // ── Annuler un ticket (client) ────────────────
  async cancel(id: string): Promise<Ticket> {
    const ticket = await this.findOne(id);

    if (![TicketStatus.PENDING, TicketStatus.IN_QUEUE].includes(ticket.status)) {
      throw new BadRequestException('Ce ticket ne peut plus être annulé');
    }

    const previousStatus = ticket.status;
    ticket.status = TicketStatus.CANCELLED;
    ticket.cancelledAt = new Date();

    const savedTicket = await this.ticketsRepo.save(ticket);

    // 🔌 WebSocket : notifier le changement de statut
    this.wsService.emitTicketStatusChanged(ticket.queueId, {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      previousStatus,
      newStatus: TicketStatus.CANCELLED,
    });

    // 🔌 WebSocket : mettre à jour les positions
    await this.emitQueueUpdate(ticket.queueId);

    return savedTicket;
  }

  // ── Statistiques ──────────────────────────────
  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalToday, completedToday, cancelledToday, inQueue, statusCounts] =
      await Promise.all([
        this.ticketsRepo.count({
          where: { createdAt: MoreThanOrEqual(today) },
        }),
        this.ticketsRepo.count({
          where: {
            status: TicketStatus.COMPLETED,
            completedAt: MoreThanOrEqual(today),
          },
        }),
        this.ticketsRepo.count({
          where: {
            status: TicketStatus.CANCELLED,
            cancelledAt: MoreThanOrEqual(today),
          },
        }),
        this.ticketsRepo.count({
          where: { status: TicketStatus.IN_QUEUE },
        }),
        this.ticketsRepo
          .createQueryBuilder('ticket')
          .select('ticket.status', 'status')
          .addSelect('COUNT(*)', 'count')
          .groupBy('ticket.status')
          .getRawMany(),
      ]);

    // Revenus du jour
    const revenueResult = await this.ticketsRepo
      .createQueryBuilder('ticket')
      .select('COALESCE(SUM(ticket.price), 0)', 'total')
      .where('ticket.isPaid = :isPaid', { isPaid: true })
      .andWhere('ticket.createdAt >= :today', { today })
      .getRawOne();

    return {
      totalToday,
      completedToday,
      cancelledToday,
      inQueue,
      revenueToday: Number(revenueResult?.total || 0),
      statusCounts,
    };
  }

  // ── Tickets d'une file ────────────────────────
  async findByQueue(queueId: string): Promise<Ticket[]> {
    return this.ticketsRepo.find({
      where: { queueId, status: TicketStatus.IN_QUEUE },
      order: { positionInQueue: 'ASC' },
      relations: ['client'],
    });
  }

  // ── Comptage total ────────────────────────────
  async countTotal(): Promise<number> {
    return this.ticketsRepo.count();
  }
}
