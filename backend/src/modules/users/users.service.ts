import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto, QueryUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  // ── Créer un utilisateur ──────────────────────
  async create(dto: CreateUserDto): Promise<User> {
    // Vérifier unicité email et téléphone
    const existing = await this.usersRepo.findOne({
      where: [{ email: dto.email }, { phone: dto.phone }],
    });

    if (existing) {
      throw new ConflictException(
        existing.email === dto.email
          ? 'Cet email est déjà utilisé'
          : 'Ce numéro de téléphone est déjà utilisé',
      );
    }

    const saltRounds = this.config.get<number>('bcrypt.saltRounds') || 12;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = this.usersRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role: dto.role,
      language: dto.language,
    });

    return this.usersRepo.save(user);
  }

  // ── Trouver tous les utilisateurs (paginé) ────
  async findAll(query: QueryUserDto) {
    const { role, search, page = 1, limit = 20 } = query;

    const where: FindOptionsWhere<User> | FindOptionsWhere<User>[] = [];

    if (search) {
      const searchCondition = { firstName: Like(`%${search}%`) };
      const emailCondition = { email: Like(`%${search}%`) };

      if (role) {
        where.push(
          { ...searchCondition, role },
          { ...emailCondition, role },
          { lastName: Like(`%${search}%`), role },
        );
      } else {
        where.push(
          searchCondition,
          emailCondition,
          { lastName: Like(`%${search}%`) },
        );
      }
    } else if (role) {
      where.push({ role });
    }

    const [users, total] = await this.usersRepo.findAndCount({
      where: where.length > 0 ? where : undefined,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Trouver par ID ────────────────────────────
  async findOne(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Utilisateur #${id} introuvable`);
    }
    return user;
  }

  // ── Trouver par email ─────────────────────────
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  // ── Trouver par téléphone ─────────────────────
  async findByPhone(phone: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { phone } });
  }

  // ── Mettre à jour ─────────────────────────────
  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (dto.email && dto.email !== user.email) {
      const existingEmail = await this.findByEmail(dto.email);
      if (existingEmail) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
    }

    if (dto.phone && dto.phone !== user.phone) {
      const existingPhone = await this.findByPhone(dto.phone);
      if (existingPhone) {
        throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
      }
    }

    Object.assign(user, dto);
    return this.usersRepo.save(user);
  }

  // ── Supprimer ─────────────────────────────────
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepo.remove(user);
  }

  // ── Mettre à jour le refresh token ────────────
  async updateRefreshToken(
    id: string,
    refreshToken: string | null,
  ): Promise<void> {
    if (refreshToken) {
      const saltRounds = this.config.get<number>('bcrypt.saltRounds') || 12;
      const hashedToken = await bcrypt.hash(refreshToken, saltRounds);
      await this.usersRepo.update(id, { refreshToken: hashedToken });
    } else {
      await this.usersRepo.update(id, { refreshToken: null });
    }
  }

  // ── Compter par rôle ──────────────────────────
  async countByRole() {
    const result = await this.usersRepo
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();

    return result;
  }
}
