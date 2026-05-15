import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { QueueStatus, PriorityType } from '../../../common/enums';
import { ServiceEntity } from '../../entities/entities/service-entity.entity';

@Entity('queues')
export class Queue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId!: string;

  @ManyToOne(() => ServiceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entity_id' })
  entity!: ServiceEntity;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'max_capacity', default: 100 })
  maxCapacity!: number;

  @Column({ name: 'current_position', default: 0 })
  currentPosition!: number;

  @Column({ name: 'ticket_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  ticketPrice!: number;

  @Column({ name: 'is_free', default: true })
  isFree!: boolean;

  @Column({
    type: 'enum',
    enum: QueueStatus,
    default: QueueStatus.ACTIVE,
  })
  status!: QueueStatus;

  @Column({
    name: 'priority_type',
    type: 'enum',
    enum: PriorityType,
    default: PriorityType.STANDARD,
  })
  priorityType!: PriorityType;

  @Column({ name: 'cancel_delay_minutes', default: 30 })
  cancelDelayMinutes!: number;

  @Column({ type: 'jsonb', nullable: true })
  schedule!: Record<string, { open: string; close: string }> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
