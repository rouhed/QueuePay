import { IsEnum, IsNumber, IsString, IsOptional, Min, IsUUID } from 'class-validator';
import { PaymentProvider, PaymentPurpose } from '../entities/payment.entity';

export class InitiatePaymentDto {
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @IsEnum(PaymentPurpose)
  purpose!: PaymentPurpose;

  @IsNumber()
  @Min(1000)
  amount!: number;

  @IsString()
  phoneNumber!: string;

  @IsOptional()
  @IsUUID()
  ticketId?: string;

  @IsOptional()
  description?: string;
}

export class MVolaWebhookDto {
  status!: string;
  transactionReference!: string;
  serverCorrelationId!: string;
  amount!: number;
  currency!: string;
  objectReference!: string;
}

export class OrangeMoneyWebhookDto {
  status!: string;
  txnid!: string;
  orderid!: string;
  amount!: number;
  currency!: string;
  message!: string;
}

export class QueryPaymentsDto {
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  @IsOptional()
  status?: string;

  @IsOptional()
  dateFrom?: string;

  @IsOptional()
  dateTo?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 25;
}
