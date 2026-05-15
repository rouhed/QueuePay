import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsNumber,
  IsBoolean,
  IsObject,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Création d'une entité ───────────────────────
export class CreateEntityDto {
  @ApiProperty({ example: 'Mairie Antananarivo Centre' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Service de documents officiels et état civil' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Rue Ratsimilaho, Antananarivo 101' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: -18.9137 })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 47.5361 })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ example: '+261201234567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'contact@mairie-tana.mg' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: {
      monday: { open: '08:00', close: '16:00' },
      tuesday: { open: '08:00', close: '16:00' },
    },
  })
  @IsObject()
  @IsOptional()
  openingHours?: Record<string, { open: string; close: string }>;

  @ApiPropertyOptional({ example: ['2026-01-01', '2026-06-26'] })
  @IsArray()
  @IsOptional()
  holidays?: string[];
}

// ── Mise à jour d'une entité ────────────────────
export class UpdateEntityDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  openingHours?: Record<string, { open: string; close: string }>;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  holidays?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// ── Filtres de recherche ────────────────────────
export class QueryEntityDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number = 20;
}
