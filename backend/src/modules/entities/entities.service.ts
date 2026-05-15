import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { ServiceEntity } from './entities/service-entity.entity';
import { CreateEntityDto, UpdateEntityDto, QueryEntityDto } from './dto';

@Injectable()
export class EntitiesService {
  constructor(
    @InjectRepository(ServiceEntity)
    private readonly entitiesRepo: Repository<ServiceEntity>,
  ) {}

  // ── Créer une entité ──────────────────────────
  async create(dto: CreateEntityDto, userId: string): Promise<ServiceEntity> {
    const entity = this.entitiesRepo.create({
      ...dto,
      createdBy: userId,
    });
    return this.entitiesRepo.save(entity);
  }

  // ── Trouver toutes les entités (paginé) ───────
  async findAll(query: QueryEntityDto) {
    const { search, isActive, page = 1, limit = 20 } = query;

    const where: FindOptionsWhere<ServiceEntity>[] = [];

    if (search) {
      const base: FindOptionsWhere<ServiceEntity> = {};
      if (isActive !== undefined) base.isActive = isActive;

      where.push(
        { ...base, name: Like(`%${search}%`) },
        { ...base, address: Like(`%${search}%`) },
      );
    } else if (isActive !== undefined) {
      where.push({ isActive });
    }

    const [data, total] = await this.entitiesRepo.findAndCount({
      where: where.length > 0 ? where : undefined,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

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
  async findOne(id: string): Promise<ServiceEntity> {
    const entity = await this.entitiesRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Entité #${id} introuvable`);
    }
    return entity;
  }

  // ── Mettre à jour ─────────────────────────────
  async update(id: string, dto: UpdateEntityDto): Promise<ServiceEntity> {
    const entity = await this.findOne(id);
    Object.assign(entity, dto);
    return this.entitiesRepo.save(entity);
  }

  // ── Supprimer ─────────────────────────────────
  async remove(id: string): Promise<void> {
    const entity = await this.findOne(id);
    await this.entitiesRepo.remove(entity);
  }

  // ── Compter les entités actives ───────────────
  async countActive(): Promise<number> {
    return this.entitiesRepo.count({ where: { isActive: true } });
  }
}
