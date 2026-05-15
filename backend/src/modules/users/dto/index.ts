import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Matches,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, Language } from '../../../common/enums';

// ── Création d'un utilisateur (par admin) ────────
export class CreateUserDto {
  @ApiProperty({ example: 'Jean' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Rakoto' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: 'jean.rakoto@email.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+261341234567' })
  @IsString()
  @Matches(/^\+261\d{9}$/, {
    message: 'Le numéro doit être au format +261XXXXXXXXX',
  })
  phone!: string;

  @ApiProperty({ example: 'MotDePasse123!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.CLIENT })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ enum: Language, default: Language.FR })
  @IsEnum(Language)
  @IsOptional()
  language?: Language;
}

// ── Mise à jour d'un utilisateur ────────────────
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jean' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Rakoto' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: 'jean.rakoto@email.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+261341234567' })
  @IsString()
  @Matches(/^\+261\d{9}$/, {
    message: 'Le numéro doit être au format +261XXXXXXXXX',
  })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ enum: Language })
  @IsEnum(Language)
  @IsOptional()
  language?: Language;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// ── Filtres de recherche ────────────────────────
export class QueryUserDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

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
