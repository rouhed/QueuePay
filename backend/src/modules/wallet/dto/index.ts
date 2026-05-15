import { IsEnum, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { PaymentMethod } from '../../../common/enums';

/**
 * DTO pour déposer de l'argent dans le wallet.
 */
export class DepositDto {
  @IsNumber()
  @Min(1000, { message: 'Le montant minimum de dépôt est 1 000 Ar' })
  @Max(20000, { message: 'Le montant maximum par dépôt est 20 000 Ar' })
  amount!: number;

  @IsEnum(PaymentMethod, { message: 'Méthode de paiement invalide' })
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  phoneNumber?: string;
}

/**
 * DTO pour payer un ticket depuis le wallet.
 */
export class PayTicketDto {
  @IsString()
  ticketId!: string;

  @IsNumber()
  @Min(0)
  amount!: number;
}

/**
 * DTO pour demander un retrait.
 */
export class WithdrawDto {
  @IsNumber()
  @Min(1000, { message: 'Le montant minimum de retrait est 1 000 Ar' })
  amount!: number;

  @IsEnum(PaymentMethod, { message: 'Méthode de paiement invalide' })
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  phoneNumber?: string;
}

/**
 * DTO pour filtrer les transactions.
 */
export class QueryTransactionsDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export { DepositDto as default };
