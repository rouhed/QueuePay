import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto, QueryPaymentsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger('PaymentsController');

  constructor(private readonly paymentsService: PaymentsService) {}

  // ── Initier un paiement (client authentifié) ──────────────────
  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  async initiate(@Req() req: any, @Body() dto: InitiatePaymentDto) {
    const payment = await this.paymentsService.initiate(req.user.id, dto);
    return {
      success: true,
      message: 'Paiement initié. Confirmez sur votre téléphone.',
      data: {
        paymentId: payment.id,
        reference: payment.reference,
        status: payment.status,
        provider: payment.provider,
        amount: payment.amount,
        expiresAt: payment.expiresAt,
      },
    };
  }

  // ── Vérifier le statut d'un paiement ─────────────────────────
  @Get(':id/status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Param('id') id: string) {
    const payment = await this.paymentsService.findOne(id);
    return {
      success: true,
      data: {
        id: payment.id,
        reference: payment.reference,
        status: payment.status,
        provider: payment.provider,
        amount: payment.amount,
        confirmedAt: payment.confirmedAt,
        errorMessage: payment.errorMessage,
      },
    };
  }

  // ── Webhook MVola (endpoint public — appelé par MVola) ────────
  @Post('webhook/mvola')
  @HttpCode(HttpStatus.OK)
  async mvolaWebhook(@Body() payload: any, @Req() req: any) {
    this.logger.log(`[Webhook MVola] IP: ${req.ip} — Payload reçu`);
    await this.paymentsService.handleMVolaWebhook(payload);
    return { status: 'received' };
  }

  // ── Webhook Orange Money (endpoint public) ────────────────────
  @Post('webhook/orange')
  @HttpCode(HttpStatus.OK)
  async orangeWebhook(@Body() payload: any, @Req() req: any) {
    this.logger.log(`[Webhook Orange Money] IP: ${req.ip} — Payload reçu`);
    await this.paymentsService.handleOrangeMoneyWebhook(payload);
    return { status: 'received' };
  }

  // ── Lister tous les paiements (admin) ─────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async findAll(@Query() query: QueryPaymentsDto) {
    return this.paymentsService.findAll(query);
  }

  // ── Statistiques paiements (admin) ───────────────────────────
  @Get('stats/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async getStats() {
    return this.paymentsService.getStats();
  }

  // ── Détail d'un paiement par référence (admin) ────────────────
  @Get('ref/:reference')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async findByRef(@Param('reference') reference: string) {
    return this.paymentsService.findByReference(reference);
  }
}
