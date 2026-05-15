import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface CreateAuditLogDto {
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  /**
   * Enregistrer une action dans le journal d'audit.
   * Appeler depuis n'importe quel service/controller.
   */
  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    const entry = this.auditRepo.create({
      userId: dto.userId || null,
      action: dto.action,
      resource: dto.resource,
      resourceId: dto.resourceId || null,
      before: dto.before || null,
      after: dto.after || null,
      description: dto.description || null,
      ipAddress: dto.ipAddress || null,
      userAgent: dto.userAgent || null,
    });
    return this.auditRepo.save(entry);
  }

  /**
   * Récupérer les logs d'audit avec filtres et pagination.
   */
  async findAll(query: {
    userId?: string;
    action?: string;
    resource?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, action, resource, dateFrom, dateTo, page = 1, limit = 30 } = query;

    const qb = this.auditRepo.createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user');

    if (userId) {
      qb.andWhere('log.userId = :userId', { userId });
    }

    if (action) {
      qb.andWhere('log.action = :action', { action });
    }

    if (resource) {
      qb.andWhere('log.resource = :resource', { resource });
    }

    if (dateFrom) {
      qb.andWhere('log.createdAt >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }

    if (dateTo) {
      qb.andWhere('log.createdAt <= :dateTo', { dateTo: new Date(dateTo) });
    }

    qb.orderBy('log.createdAt', 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [data, total] = await qb.getManyAndCount();

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
}
