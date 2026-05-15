import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Language } from '../../../common/enums';

// ── Inscription ─────────────────────────────────
export class RegisterDto {
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

  @ApiProperty({ example: 'MotDePasse123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ enum: Language, default: Language.FR })
  @IsEnum(Language)
  @IsOptional()
  language?: Language;
}

// ── Connexion ───────────────────────────────────
export class LoginDto {
  @ApiProperty({ example: 'jean.rakoto@email.com' })
  @IsString()
  @IsNotEmpty()
  identifier!: string; // email OU téléphone

  @ApiProperty({ example: 'MotDePasse123!' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

// ── Refresh Token ───────────────────────────────
export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
