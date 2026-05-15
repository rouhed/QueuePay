import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Queue } from './entities/queue.entity';
import { CreateQueueDto, UpdateQueueDto, QueryQueueDto } from './dto';

@Injectable()
export class QueuesService {
  constructor(
    @InjectRepository(Queue)
    private readonly queuesRepo: Repository<Queue>,
  ) {}

  // ── Créer une file ────────────────────────────
  async create(dto: CreateQueueDto): Promise<Queue> {
    const queue = this.queuesRepo.create(dto);
    return this.queuesRepo.save(queue);
  }

  // ── Trouver toutes les files (paginé) ─────────
  async findAll(query: QueryQueueDto) {
    const { entityId, status, search, page = 1, limit = 20 } = query;

    const where: FindOptionsWhere<Queue>[] = [];
    const base: FindOptionsWhere<Queue> = {};

    if (entityId) base.entityId = entityId;
    if (status) base.status = status;

    if (search) {
      where.push(
        { ...base, name: Like(`%${search}%`) },
      );
    } else if (Object.keys(base).length > 0) {
      where.push(base);
    }

    const [data, total] = await this.queuesRepo.findAndCount({
      where: where.length > 0 ? where : undefined,
      relations: ['entity'],
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
  async findOne(id: string): Promise<Queue> {
    const queue = await this.queuesRepo.findOne({
      where: { id },
      relations: ['entity'],
    });
    if (!queue) {
      throw new NotFoundException(`File #${id} introuvable`);
    }
    return queue;
  }

  // ── Mettre à jour ─────────────────────────────
  async update(id: string, dto: UpdateQueueDto): Promise<Queue> {
    const queue = await this.findOne(id);
    Object.assign(queue, dto);
    return this.queuesRepo.save(queue);
  }

  // ── Supprimer ─────────────────────────────────
  async remove(id: string): Promise<void> {
    const queue = await this.findOne(id);
    await this.queuesRepo.remove(queue);
  }

  // ── Compter les files par statut ──────────────
  async countByStatus() {
    const result = await this.queuesRepo
      .createQueryBuilder('queue')
      .select('queue.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('queue.status')
      .getRawMany();
    return result;
  }

  // ── Files d'une entité ────────────────────────
  async findByEntity(entityId: string): Promise<Queue[]> {
    return this.queuesRepo.find({
      where: { entityId },
      order: { createdAt: 'ASC' },
    });
  }
}
