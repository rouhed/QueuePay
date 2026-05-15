import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Portefeuille numérique d'un client.
 * Chaque utilisateur a un seul wallet, créé automatiquement à l'inscription.
 */
@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ── Propriétaire ──────────────────────────────
  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  // ── Solde ─────────────────────────────────────
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    comment: 'Solde en Ariary (Ar)',
  })
  balance!: number;

  // ── Limites ───────────────────────────────────
  @Column({
    name: 'daily_deposit_total',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    comment: 'Total des dépôts du jour (reset à minuit)',
  })
  dailyDepositTotal!: number;

  @Column({
    name: 'last_deposit_date',
    type: 'date',
    nullable: true,
    comment: 'Date du dernier dépôt (pour reset journalier)',
  })
  lastDepositDate!: string | null;

  // ── Statut ────────────────────────────────────
  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
