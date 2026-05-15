import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../../common/enums';

// ── Créer un ticket ─────────────────────────────
export class CreateTicketDto {
  @ApiProperty({ description: 'ID de la file d\'attente' })
  @IsUUID()
  queueId!: string;

  @ApiPropertyOptional({ description: 'ID du client (si connecté)' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Nom du client (si anonyme)' })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({ description: 'Téléphone du client (si anonyme)' })
  @IsOptional()
  @IsString()
  clientPhone?: string;

  @ApiPropertyOptional({
    description: 'Méthode de paiement',
    enum: PaymentMethod,
    default: PaymentMethod.FREE,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}

// ── Valider un ticket (agent) ───────────────────
export class ValidateTicketDto {
  @ApiProperty({
    description: 'Action de validation',
    enum: ['complete', 'no_show', 'cancel', 'transfer'],
  })
  @IsString()
  action!: 'complete' | 'no_show' | 'cancel' | 'transfer';

  @ApiPropertyOptional({ description: 'Notes de l\'agent' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'File de transfert (si action = transfer)' })
  @IsOptional()
  @IsUUID()
  transferQueueId?: string;
}

// ── Filtrer les tickets ─────────────────────────
export class QueryTicketDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  queueId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}
