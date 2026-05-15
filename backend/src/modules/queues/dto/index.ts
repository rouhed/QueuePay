import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsObject,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QueueStatus, PriorityType } from '../../../common/enums';

// ── Création d'une file ─────────────────────────
export class CreateQueueDto {
  @ApiProperty({ example: 'uuid-de-l-entite' })
  @IsUUID()
  entityId!: string;

  @ApiProperty({ example: 'Documents d\'état civil' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'File pour les actes de naissance, mariage, décès' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 50, default: 100 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxCapacity?: number;

  @ApiPropertyOptional({ example: 500, description: 'Prix en Ariary' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  ticketPrice?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isFree?: boolean;

  @ApiPropertyOptional({ enum: PriorityType, default: PriorityType.STANDARD })
  @IsEnum(PriorityType)
  @IsOptional()
  priorityType?: PriorityType;

  @ApiPropertyOptional({ example: 30, description: 'Délai d\'annulation en minutes' })
  @IsNumber()
  @Min(5)
  @IsOptional()
  cancelDelayMinutes?: number;

  @ApiPropertyOptional({
    example: {
      monday: { open: '08:00', close: '16:00' },
      tuesday: { open: '08:00', close: '16:00' },
    },
  })
  @IsObject()
  @IsOptional()
  schedule?: Record<string, { open: string; close: string }>;
}

// ── Mise à jour d'une file ──────────────────────
export class UpdateQueueDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxCapacity?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  ticketPrice?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFree?: boolean;

  @ApiPropertyOptional({ enum: QueueStatus })
  @IsEnum(QueueStatus)
  @IsOptional()
  status?: QueueStatus;

  @ApiPropertyOptional({ enum: PriorityType })
  @IsEnum(PriorityType)
  @IsOptional()
  priorityType?: PriorityType;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(5)
  @IsOptional()
  cancelDelayMinutes?: number;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  schedule?: Record<string, { open: string; close: string }>;
}

// ── Filtres de recherche ────────────────────────
export class QueryQueueDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  entityId?: string;

  @ApiPropertyOptional({ enum: QueueStatus })
  @IsEnum(QueueStatus)
  @IsOptional()
  status?: QueueStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number = 20;
}
