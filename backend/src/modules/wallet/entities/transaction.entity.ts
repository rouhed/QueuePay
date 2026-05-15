import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Wallet } from './wallet.entity';
import { TransactionStatus, PaymentMethod } from '../../../common/enums';

/**
 * Types de transaction du wallet.
 */
export enum TransactionType {
  DEPOSIT = 'deposit',           // Dépôt (MVola, Orange Money)
  TICKET_PURCHASE = 'ticket_purchase', // Achat de ticket
  REFUND = 'refund',             // Remboursement
  WITHDRAWAL = 'withdrawal',     // Retrait vers mobile money
}

/**
 * Historique de toutes les transactions financières du wallet.
 */
@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ── Wallet associé ────────────────────────────
  @Index()
  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId!: string;

  @ManyToOne(() => Wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: Wallet;

  // ── Type et montant ───────────────────────────
  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type!: TransactionType;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    comment: 'Montant en Ariary. Positif = crédit, négatif = débit.',
  })
  amount!: number;

  // ── Solde après transaction ───────────────────
  @Column({
    name: 'balance_after',
    type: 'decimal',
    precision: 12,
    scale: 2,
    comment: 'Solde du wallet après cette transaction',
  })
  balanceAfter!: number;

  // ── Moyen de paiement ─────────────────────────
  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
  })
  paymentMethod!: PaymentMethod | null;

  // ── Statut ────────────────────────────────────
  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status!: TransactionStatus;

  // ── Références ────────────────────────────────
  @Column({
    name: 'external_reference',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Référence MVola / Orange Money',
  })
  externalReference!: string | null;

  @Column({
    name: 'ticket_id',
    type: 'uuid',
    nullable: true,
    comment: 'Ticket associé (pour achat/remboursement)',
  })
  ticketId!: string | null;

  // ── Description ───────────────────────────────
  @Column({
    type: 'text',
    nullable: true,
    comment: 'Description lisible de la transaction',
  })
  description!: string | null;

  // ── Timestamps ────────────────────────────────
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
