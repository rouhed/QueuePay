import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { UserRole, Language } from '../../../common/enums';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'first_name', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', length: 100 })
  lastName!: string;

  @Index({ unique: true })
  @Column({ length: 255, unique: true })
  email!: string;

  @Index({ unique: true })
  @Column({ length: 20, unique: true })
  phone!: string;

  @Exclude()
  @Column({ name: 'password_hash', length: 255 })
  passwordHash!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CLIENT,
  })
  role!: UserRole;

  @Column({
    type: 'enum',
    enum: Language,
    default: Language.FR,
  })
  language!: Language;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'is_verified', default: false })
  isVerified!: boolean;

  @Column({ name: 'two_factor_enabled', default: false })
  twoFactorEnabled!: boolean;

  @Exclude()
  @Column({ name: 'refresh_token', type: 'varchar', nullable: true, length: 500 })
  refreshToken!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
