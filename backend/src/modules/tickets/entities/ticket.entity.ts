import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TicketStatus, PaymentMethod } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';
import { Queue } from '../../queues/entities/queue.entity';
import { ServiceEntity } from '../../entities/entities/service-entity.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ── Numéro de ticket lisible (ex: "T-047") ────
  @Index({ unique: true })
  @Column({ name: 'ticket_number', length: 20, unique: true })
  ticketNumber!: string;

  // ── QR Code unique ────────────────────────────
  @Index({ unique: true })
  @Column({ name: 'qr_code', length: 255, unique: true })
  qrCode!: string;

  // ── Relations ─────────────────────────────────
  @Column({ name: 'queue_id', type: 'uuid' })
  queueId!: string;

  @ManyToOne(() => Queue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'queue_id' })
  queue!: Queue;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId!: string;

  @ManyToOne(() => ServiceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entity_id' })
  entity!: ServiceEntity;

  @Column({ name: 'client_id', type: 'uuid', nullable: true })
  clientId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'client_id' })
  client!: User | null;

  @Column({ name: 'served_by', type: 'uuid', nullable: true })
  servedBy!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'served_by' })
  agent!: User | null;

  // ── Position & statut ─────────────────────────
  @Column({ name: 'position_in_queue', default: 0 })
  positionInQueue!: number;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.PENDING,
  })
  status!: TicketStatus;

  // ── Paiement ──────────────────────────────────
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price!: number;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.FREE,
  })
  paymentMethod!: PaymentMethod;

  @Column({ name: 'is_paid', default: false })
  isPaid!: boolean;

  @Column({ name: 'payment_reference', type: 'varchar', length: 255, nullable: true })
  paymentReference!: string | null;

  // ── Infos client anonyme ──────────────────────
  @Column({ name: 'client_name', type: 'varchar', length: 200, nullable: true })
  clientName!: string | null;

  @Column({ name: 'client_phone', type: 'varchar', length: 20, nullable: true })
  clientPhone!: string | null;

  // ── Timing ────────────────────────────────────
  @Column({ name: 'estimated_time', type: 'timestamp', nullable: true })
  estimatedTime!: Date | null;

  @Column({ name: 'called_at', type: 'timestamp', nullable: true })
  calledAt!: Date | null;

  @Column({ name: 'served_at', type: 'timestamp', nullable: true })
  servedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt!: Date | null;

  // ── Notes internes ────────────────────────────
  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  // ── Guichet assigné ───────────────────────────
  @Column({ name: 'counter_number', type: 'int', nullable: true })
  counterNumber!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
