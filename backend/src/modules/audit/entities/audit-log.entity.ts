import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Journal d'audit — traçabilité complète de toutes les actions système.
 * CDC §5.3 : « Journal des actions de chaque agent (audit log) »
 */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ── Qui a fait l'action ───────────────────────
  @Index()
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  // ── Quelle action ─────────────────────────────
  @Index()
  @Column({ length: 100 })
  action!: string;

  @Column({ length: 100 })
  resource!: string;

  @Column({ name: 'resource_id', type: 'varchar', length: 255, nullable: true })
  resourceId!: string | null;

  // ── Détails ───────────────────────────────────
  @Column({ type: 'jsonb', nullable: true, comment: 'Données avant modification' })
  before!: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true, comment: 'Données après modification' })
  after!: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // ── Contexte ──────────────────────────────────
  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
