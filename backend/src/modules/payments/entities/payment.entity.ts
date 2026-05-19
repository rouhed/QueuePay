import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PaymentProvider {
  MVOLA = 'mvola',
  ORANGE_MONEY = 'orange_money',
}

export enum PaymentStatus {
  INITIATED = 'initiated',
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentPurpose {
  WALLET_DEPOSIT = 'wallet_deposit',
  TICKET_PURCHASE = 'ticket_purchase',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  reference!: string;

  @Column({ nullable: true })
  providerReference!: string;

  @Column({ type: 'enum', enum: PaymentProvider })
  provider!: PaymentProvider;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.INITIATED })
  status!: PaymentStatus;

  @Column({ type: 'enum', enum: PaymentPurpose })
  purpose!: PaymentPurpose;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column()
  phoneNumber!: string;

  @Column({ nullable: true })
  userId!: string;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ nullable: true })
  ticketId!: string;

  @Column({ nullable: true })
  walletId!: string;

  @Column({ type: 'jsonb', nullable: true })
  webhookPayload!: Record<string, any>;

  @Column({ nullable: true })
  errorMessage!: string;

  @Column({ nullable: true })
  description!: string;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  confirmedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
