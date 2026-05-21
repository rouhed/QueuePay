import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import {
  Payment,
  PaymentProvider,
  PaymentStatus,
  PaymentPurpose,
} from './entities/payment.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { InitiatePaymentDto, QueryPaymentsDto } from './dto';
import { WalletService } from '../wallet/wallet.service';
import { PaymentMethod } from '../../common/enums';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('PaymentsService');

  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepo: Repository<Payment>,
    @InjectRepository(Ticket)
    private readonly ticketsRepo: Repository<Ticket>,
    private readonly httpService: HttpService,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ════════════════════════════════════════════════
  // INITIATION DU PAIEMENT
  // ════════════════════════════════════════════════

  async initiate(userId: string, dto: InitiatePaymentDto): Promise<Payment> {
    const reference = `QP-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;

    const payment = this.paymentsRepo.create({
      reference,
      provider: dto.provider,
      purpose: dto.purpose,
      amount: dto.amount,
      phoneNumber: dto.phoneNumber,
      userId,
      ticketId: dto.ticketId,
      status: PaymentStatus.INITIATED,
      description: dto.description || `Paiement QueuePay — ${dto.amount} Ar`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    });

    const saved = await this.paymentsRepo.save(payment);

    // Appel à l'API du fournisseur
    try {
      if (dto.provider === PaymentProvider.MVOLA) {
        await this.initiateMVola(saved);
      } else if (dto.provider === PaymentProvider.ORANGE_MONEY) {
        await this.initiateOrangeMoney(saved);
      }
    } catch (err: any) {
      this.logger.error(`Erreur initiation paiement: ${err.message}`);
      // On ne bloque pas — on garde le payment en INITIATED
      // L'utilisateur peut réessayer, le webhook confirmera
    }

    return saved;
  }

  // ════════════════════════════════════════════════
  // MVola — INITIATION
  // ════════════════════════════════════════════════

  private async initiateMVola(payment: Payment): Promise<void> {
    const clientId = process.env.MVOLA_CLIENT_ID;
    const clientSecret = process.env.MVOLA_CLIENT_SECRET;
    const baseUrl = process.env.MVOLA_BASE_URL || 'https://devapi.mvola.mg';

    if (!clientId || !clientSecret) {
      this.logger.warn('[MVola] Clés non configurées — mode simulation');
      const providerRef = `SIMULATED-${payment.reference}`;
      await this.paymentsRepo.update(payment.id, {
        status: PaymentStatus.PENDING,
        providerReference: providerRef,
      });

      // Simulation automatique du webhook succès au bout de 3 secondes
      setTimeout(() => {
        this.logger.log(`[Simulation MVola] Webhook automatique déclenché pour ${providerRef}`);
        this.handleMVolaWebhook({
          serverCorrelationId: providerRef,
          status: 'completed',
        }).catch(err => this.logger.error(`Erreur simulation MVola: ${err.message}`));
      }, 3000);

      return;
    }

    try {
      // Étape 1 : Obtenir le token OAuth2
      const tokenResponse = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/token`,
          new URLSearchParams({
            grant_type: 'client_credentials',
            scope: 'EXT_INT_MVOLA_SCOPE',
          }),
          {
            auth: { username: clientId, password: clientSecret },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          },
        ),
      );

      const accessToken = tokenResponse.data.access_token;

      // Étape 2 : Initier le paiement
      const paymentPayload = {
        amount: payment.amount.toString(),
        currency: 'Ar',
        descriptionText: payment.description,
        requestingOrganisationTransactionReference: payment.reference,
        debitParty: [{ key: 'msisdn', value: payment.phoneNumber }],
        creditParty: [
          {
            key: 'msisdn',
            value: process.env.MVOLA_MERCHANT_NUMBER || '0343500003',
          },
        ],
        metadata: [
          { key: 'partnerName', value: 'QueuePay' },
          { key: 'fc', value: 'USD' },
          { key: 'amountFc', value: '1' },
        ],
        requestDate: new Date().toISOString(),
        originalTransactionReference: payment.reference,
        callbackUrl: `${process.env.APP_URL}/payments/webhook/mvola`,
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/mvola/mm/transactions/type/merchantpay/1.0.0/`,
          paymentPayload,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              Version: '1.0',
              'X-CorrelationID': uuidv4(),
              UserLanguage: 'FR',
              UserAccountIdentifier: `msisdn;${process.env.MVOLA_MERCHANT_NUMBER}`,
            },
          },
        ),
      );

      await this.paymentsRepo.update(payment.id, {
        status: PaymentStatus.PENDING,
        providerReference: response.data.serverCorrelationId,
      });

      this.logger.log(
        `[MVola] Paiement initié. Ref: ${response.data.serverCorrelationId}`,
      );
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      this.logger.error(`[MVola] Erreur: ${msg}`);
      await this.paymentsRepo.update(payment.id, {
        status: PaymentStatus.FAILED,
        errorMessage: msg,
      });
      throw new BadRequestException(`Erreur MVola: ${msg}`);
    }
  }

  // ════════════════════════════════════════════════
  // Orange Money — INITIATION
  // ════════════════════════════════════════════════

  private async initiateOrangeMoney(payment: Payment): Promise<void> {
    const clientId = process.env.OM_CLIENT_ID;
    const clientSecret = process.env.OM_CLIENT_SECRET;
    const baseUrl =
      process.env.OM_BASE_URL ||
      'https://api.orange.com/orange-money-webpay/dev/v1';

    if (!clientId || !clientSecret) {
      this.logger.warn('[OrangeMoney] Clés non configurées — mode simulation');
      const providerRef = `SIMULATED-OM-${payment.reference}`;
      await this.paymentsRepo.update(payment.id, {
        status: PaymentStatus.PENDING,
        providerReference: providerRef,
      });

      // Simulation automatique du webhook succès au bout de 3 secondes
      setTimeout(() => {
        this.logger.log(`[Simulation OM] Webhook automatique déclenché pour ${payment.reference}`);
        this.handleOrangeMoneyWebhook({
          orderid: payment.reference,
          status: '00000',
        }).catch(err => this.logger.error(`Erreur simulation OM: ${err.message}`));
      }, 3000);

      return;
    }

    try {
      // Token OAuth2 Orange
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const tokenResponse = await firstValueFrom(
        this.httpService.post(
          'https://api.orange.com/oauth/v3/token',
          'grant_type=client_credentials',
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      const accessToken = tokenResponse.data.access_token;
      const merchantKey = process.env.OM_MERCHANT_KEY || '';

      // Initier le paiement Orange Money
      const payload = {
        merchant_key: merchantKey,
        currency: 'OAR',
        order_id: payment.reference,
        amount: payment.amount,
        return_url: `${process.env.ADMIN_URL}/payment/success`,
        cancel_url: `${process.env.ADMIN_URL}/payment/cancel`,
        notif_url: `${process.env.APP_URL}/payments/webhook/orange`,
        lang: 'fr',
        reference: payment.reference,
      };

      const response = await firstValueFrom(
        this.httpService.post(`${baseUrl}/webpayment`, payload, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );

      await this.paymentsRepo.update(payment.id, {
        status: PaymentStatus.PENDING,
        providerReference: response.data.pay_token,
      });

      this.logger.log(`[OrangeMoney] Paiement initié. Token: ${response.data.pay_token}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      this.logger.error(`[OrangeMoney] Erreur: ${msg}`);
      await this.paymentsRepo.update(payment.id, {
        status: PaymentStatus.FAILED,
        errorMessage: msg,
      });
      throw new BadRequestException(`Erreur Orange Money: ${msg}`);
    }
  }

  // ════════════════════════════════════════════════
  // WEBHOOKS — Confirmation de paiement
  // ════════════════════════════════════════════════

  async handleMVolaWebhook(payload: any): Promise<void> {
    this.logger.log(`[Webhook MVola] Reçu: ${JSON.stringify(payload)}`);

    const serverCorrelationId = payload.serverCorrelationId || payload.objectReference;
    if (!serverCorrelationId) return;

    const payment = await this.paymentsRepo.findOne({
      where: { providerReference: serverCorrelationId },
    });

    if (!payment) {
      this.logger.warn(`[Webhook MVola] Payment introuvable pour ref: ${serverCorrelationId}`);
      return;
    }

    const isSuccess = payload.status === 'completed' || payload.transactionStatus === 'COMPLETED';

    await this.paymentsRepo.update(payment.id, {
      status: isSuccess ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
      webhookPayload: payload,
      confirmedAt: isSuccess ? new Date() : undefined,
      errorMessage: isSuccess ? undefined : payload.errorDescription,
    });

    if (isSuccess) {
      await this.processSuccessfulPayment(payment);
    }
  }

  async handleOrangeMoneyWebhook(payload: any): Promise<void> {
    this.logger.log(`[Webhook Orange Money] Reçu: ${JSON.stringify(payload)}`);

    const orderId = payload.orderid;
    if (!orderId) return;

    const payment = await this.paymentsRepo.findOne({
      where: { reference: orderId },
    });

    if (!payment) {
      this.logger.warn(`[Webhook OM] Payment introuvable pour orderId: ${orderId}`);
      return;
    }

    const isSuccess = payload.status === '00000';

    await this.paymentsRepo.update(payment.id, {
      status: isSuccess ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
      webhookPayload: payload,
      confirmedAt: isSuccess ? new Date() : undefined,
      errorMessage: isSuccess ? undefined : payload.message,
    });

    if (isSuccess) {
      await this.processSuccessfulPayment(payment);
    }
  }

  // ════════════════════════════════════════════════
  // TRAITEMENT POST-PAIEMENT
  // ════════════════════════════════════════════════

  private async processSuccessfulPayment(payment: Payment): Promise<void> {
    this.logger.log(
      `[Payment] Traitement succès — ${payment.reference} (${payment.purpose})`,
    );

    if (payment.purpose === PaymentPurpose.WALLET_DEPOSIT && payment.userId) {
      try {
        await this.walletService.deposit(payment.userId, {
          amount: Number(payment.amount),
          paymentMethod:
            payment.provider === PaymentProvider.MVOLA
              ? PaymentMethod.MVOLA
              : PaymentMethod.ORANGE_MONEY,
        });
        this.logger.log(`[Payment] Wallet crédité de ${payment.amount} Ar pour userId ${payment.userId}`);
      } catch (err: any) {
        this.logger.error(`[Payment] Erreur crédit wallet: ${err.message}`);
      }
    }

    if (payment.purpose === PaymentPurpose.TICKET_PURCHASE && payment.ticketId) {
      this.logger.log(`[Payment] Ticket ${payment.ticketId} marqué payé.`);
      try {
        await this.ticketsRepo.update(payment.ticketId, {
          isPaid: true,
          paymentReference: payment.reference,
        });
        this.logger.log(`[Payment] Ticket ${payment.ticketId} marqué payé avec succès.`);

        // Charger le ticket pour avoir les infos client et envoyer les notifications
        const ticket = await this.ticketsRepo.findOne({
          where: { id: payment.ticketId },
          relations: ['client', 'queue', 'queue.entity'],
        });

        if (ticket) {
          const method = payment.provider === PaymentProvider.MVOLA ? 'MVola' : 'Orange Money';
          
          if (ticket.client?.phone || ticket.clientPhone) {
            const phone = ticket.client?.phone || ticket.clientPhone;
            await this.notificationsService.sendSms(
              phone!,
              `QueuePay: Paiement confirmé (${payment.amount} Ar via ${method}). Votre ticket ${ticket.ticketNumber} est validé pour ${ticket.queue?.name}.`
            );
          }
          
          if (ticket.client?.email) {
            await this.notificationsService.sendEmail(
              ticket.client.email,
              `Confirmation Ticket QueuePay - ${ticket.ticketNumber}`,
              `<p>Bonjour,</p><p>Votre paiement de <b>${payment.amount} Ar</b> via ${method} a été confirmé.</p><p>Ticket : <b>${ticket.ticketNumber}</b><br/>File d'attente : <b>${ticket.queue?.name}</b></p><p>Merci d'utiliser QueuePay.</p>`
            );
          }

          if (ticket.client?.fcmToken) {
            await this.notificationsService.sendPushNotification(
              ticket.client.fcmToken,
              'Paiement confirmé',
              `Votre ticket ${ticket.ticketNumber} a bien été payé.`
            );
          }
        }
      } catch (err: any) {
        this.logger.error(`[Payment] Erreur marquage payé ticket ${payment.ticketId}: ${err.message}`);
      }
    }
  }

  // ════════════════════════════════════════════════
  // LECTURE — Statut d'un paiement
  // ════════════════════════════════════════════════

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentsRepo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException(`Paiement #${id} introuvable`);
    return payment;
  }

  async findByReference(reference: string): Promise<Payment> {
    const payment = await this.paymentsRepo.findOne({ where: { reference } });
    if (!payment) throw new NotFoundException(`Paiement ${reference} introuvable`);
    return payment;
  }

  // ════════════════════════════════════════════════
  // LISTING (admin)
  // ════════════════════════════════════════════════

  async findAll(query: QueryPaymentsDto) {
    const { provider, status, dateFrom, dateTo, page = 1, limit = 25 } = query;

    const qb = this.paymentsRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'user')
      .orderBy('p.createdAt', 'DESC');

    if (provider) qb.andWhere('p.provider = :provider', { provider });
    if (status) qb.andWhere('p.status = :status', { status });
    if (dateFrom) qb.andWhere('p.createdAt >= :dateFrom', { dateFrom: new Date(dateFrom) });
    if (dateTo) qb.andWhere('p.createdAt <= :dateTo', { dateTo: new Date(dateTo) });

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ════════════════════════════════════════════════
  // STATISTIQUES (admin)
  // ════════════════════════════════════════════════

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalToday, revenueToday, byProvider] = await Promise.all([
      this.paymentsRepo
        .createQueryBuilder('p')
        .where('p.status = :status', { status: PaymentStatus.SUCCESS })
        .andWhere('p.createdAt >= :today', { today })
        .getCount(),
      this.paymentsRepo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amount), 0)', 'total')
        .where('p.status = :status', { status: PaymentStatus.SUCCESS })
        .andWhere('p.createdAt >= :today', { today })
        .getRawOne(),
      this.paymentsRepo
        .createQueryBuilder('p')
        .select('p.provider', 'provider')
        .addSelect('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(p.amount), 0)', 'total')
        .where('p.status = :status', { status: PaymentStatus.SUCCESS })
        .groupBy('p.provider')
        .getRawMany(),
    ]);

    return {
      totalToday,
      revenueToday: Number(revenueToday?.total || 0),
      byProvider,
    };
  }
}
