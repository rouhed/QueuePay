import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { DepositDto, PayTicketDto, WithdrawDto, QueryTransactionsDto } from './dto';
import { TransactionStatus, PaymentMethod } from '../../common/enums';

@Injectable()
export class WalletService {
  // Limites définies dans le CDC
  private readonly DAILY_DEPOSIT_LIMIT = 20000; // 20 000 Ar par jour
  private readonly MIN_DEPOSIT = 1000;           // 1 000 Ar minimum

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  // ── Créer un wallet pour un nouvel utilisateur ─
  async createWallet(userId: string): Promise<Wallet> {
    const existing = await this.walletRepo.findOne({ where: { userId } });
    if (existing) return existing;

    const wallet = this.walletRepo.create({
      userId,
      balance: 0,
      dailyDepositTotal: 0,
      isActive: true,
    });

    return this.walletRepo.save(wallet);
  }

  // ── Récupérer le wallet d'un utilisateur ──────
  async getWallet(userId: string): Promise<Wallet> {
    const wallet = await this.walletRepo.findOne({
      where: { userId },
      relations: ['user'],
    });
    if (!wallet) {
      throw new NotFoundException('Portefeuille introuvable');
    }
    return wallet;
  }

  // ── Récupérer le solde ────────────────────────
  async getBalance(userId: string): Promise<{ balance: number; currency: string }> {
    const wallet = await this.getWallet(userId);
    return {
      balance: Number(wallet.balance),
      currency: 'Ar',
    };
  }

  // ── Déposer de l'argent ───────────────────────
  async deposit(userId: string, dto: DepositDto): Promise<Transaction> {
    const wallet = await this.getWallet(userId);

    if (!wallet.isActive) {
      throw new ForbiddenException('Portefeuille désactivé');
    }

    // Vérifier la limite journalière
    const today = new Date().toISOString().split('T')[0];
    let dailyTotal = Number(wallet.dailyDepositTotal);

    // Reset si nouveau jour
    if (wallet.lastDepositDate !== today) {
      dailyTotal = 0;
    }

    if (dailyTotal + dto.amount > this.DAILY_DEPOSIT_LIMIT) {
      const remaining = this.DAILY_DEPOSIT_LIMIT - dailyTotal;
      throw new BadRequestException(
        `Limite journalière atteinte. Il vous reste ${remaining} Ar de dépôt possible aujourd'hui.`,
      );
    }

    // Mettre à jour le solde
    const newBalance = Number(wallet.balance) + dto.amount;

    await this.walletRepo.update(wallet.id, {
      balance: newBalance,
      dailyDepositTotal: dailyTotal + dto.amount,
      lastDepositDate: today,
    });

    // Créer la transaction
    const transaction = this.transactionRepo.create({
      walletId: wallet.id,
      type: TransactionType.DEPOSIT,
      amount: dto.amount,
      balanceAfter: newBalance,
      paymentMethod: dto.paymentMethod,
      status: TransactionStatus.SUCCESS,
      description: `Dépôt de ${dto.amount.toLocaleString()} Ar via ${this.formatPaymentMethod(dto.paymentMethod)}`,
    });

    return this.transactionRepo.save(transaction);
  }

  // ── Payer un ticket depuis le wallet ──────────
  async payTicket(userId: string, dto: PayTicketDto): Promise<Transaction> {
    const wallet = await this.getWallet(userId);

    if (!wallet.isActive) {
      throw new ForbiddenException('Portefeuille désactivé');
    }

    const currentBalance = Number(wallet.balance);

    if (currentBalance < dto.amount) {
      throw new BadRequestException(
        `Solde insuffisant. Votre solde est de ${currentBalance.toLocaleString()} Ar, le ticket coûte ${dto.amount.toLocaleString()} Ar.`,
      );
    }

    // Débiter le wallet
    const newBalance = currentBalance - dto.amount;

    await this.walletRepo.update(wallet.id, {
      balance: newBalance,
    });

    // Créer la transaction
    const transaction = this.transactionRepo.create({
      walletId: wallet.id,
      type: TransactionType.TICKET_PURCHASE,
      amount: -dto.amount,
      balanceAfter: newBalance,
      paymentMethod: PaymentMethod.WALLET,
      status: TransactionStatus.SUCCESS,
      ticketId: dto.ticketId,
      description: `Achat de ticket — ${dto.amount.toLocaleString()} Ar`,
    });

    return this.transactionRepo.save(transaction);
  }

  // ── Rembourser un ticket ──────────────────────
  async refund(
    userId: string,
    ticketId: string,
    amount: number,
    reason: string,
  ): Promise<Transaction> {
    const wallet = await this.getWallet(userId);

    const newBalance = Number(wallet.balance) + amount;

    await this.walletRepo.update(wallet.id, {
      balance: newBalance,
    });

    const transaction = this.transactionRepo.create({
      walletId: wallet.id,
      type: TransactionType.REFUND,
      amount: amount,
      balanceAfter: newBalance,
      paymentMethod: PaymentMethod.WALLET,
      status: TransactionStatus.SUCCESS,
      ticketId,
      description: `Remboursement — ${reason}`,
    });

    return this.transactionRepo.save(transaction);
  }

  // ── Demander un retrait ───────────────────────
  async withdraw(userId: string, dto: WithdrawDto): Promise<Transaction> {
    const wallet = await this.getWallet(userId);

    if (!wallet.isActive) {
      throw new ForbiddenException('Portefeuille désactivé');
    }

    const currentBalance = Number(wallet.balance);

    if (currentBalance < dto.amount) {
      throw new BadRequestException(
        `Solde insuffisant pour le retrait. Solde: ${currentBalance.toLocaleString()} Ar.`,
      );
    }

    // Débiter le wallet (le retrait sera traité en async via MVola/OM)
    const newBalance = currentBalance - dto.amount;

    await this.walletRepo.update(wallet.id, {
      balance: newBalance,
    });

    const transaction = this.transactionRepo.create({
      walletId: wallet.id,
      type: TransactionType.WITHDRAWAL,
      amount: -dto.amount,
      balanceAfter: newBalance,
      paymentMethod: dto.paymentMethod,
      status: TransactionStatus.PENDING, // En attente de traitement
      description: `Retrait de ${dto.amount.toLocaleString()} Ar vers ${this.formatPaymentMethod(dto.paymentMethod)}`,
    });

    return this.transactionRepo.save(transaction);
  }

  // ── Historique des transactions ───────────────
  async getTransactions(userId: string, query: QueryTransactionsDto) {
    const wallet = await this.getWallet(userId);
    const { type, dateFrom, dateTo, page = 1, limit = 20 } = query;

    const qb = this.transactionRepo.createQueryBuilder('tx')
      .where('tx.walletId = :walletId', { walletId: wallet.id });

    if (type) {
      qb.andWhere('tx.type = :type', { type });
    }

    if (dateFrom) {
      qb.andWhere('tx.createdAt >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }

    if (dateTo) {
      qb.andWhere('tx.createdAt <= :dateTo', { dateTo: new Date(dateTo) });
    }

    qb.orderBy('tx.createdAt', 'DESC');
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

  // ── Stats du wallet (admin) ───────────────────
  async getGlobalStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalWallets, totalBalance, depositsToday, purchasesToday] =
      await Promise.all([
        this.walletRepo.count(),
        this.walletRepo
          .createQueryBuilder('w')
          .select('COALESCE(SUM(w.balance), 0)', 'total')
          .getRawOne(),
        this.transactionRepo
          .createQueryBuilder('tx')
          .select('COALESCE(SUM(tx.amount), 0)', 'total')
          .where('tx.type = :type', { type: TransactionType.DEPOSIT })
          .andWhere('tx.status = :status', { status: TransactionStatus.SUCCESS })
          .andWhere('tx.createdAt >= :today', { today })
          .getRawOne(),
        this.transactionRepo
          .createQueryBuilder('tx')
          .select('COALESCE(SUM(ABS(tx.amount)), 0)', 'total')
          .where('tx.type = :type', { type: TransactionType.TICKET_PURCHASE })
          .andWhere('tx.status = :status', { status: TransactionStatus.SUCCESS })
          .andWhere('tx.createdAt >= :today', { today })
          .getRawOne(),
      ]);

    return {
      totalWallets,
      totalBalanceHeld: Number(totalBalance?.total || 0),
      depositsToday: Number(depositsToday?.total || 0),
      purchasesToday: Number(purchasesToday?.total || 0),
    };
  }

  // ── Toutes les transactions (admin) ────────────
  async getAllTransactions(query: QueryTransactionsDto) {
    const { type, dateFrom, dateTo, page = 1, limit = 25 } = query;

    const qb = this.transactionRepo.createQueryBuilder('tx')
      .leftJoinAndSelect('tx.wallet', 'wallet');

    if (type) {
      qb.andWhere('tx.type = :type', { type });
    }

    if (dateFrom) {
      qb.andWhere('tx.createdAt >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }

    if (dateTo) {
      qb.andWhere('tx.createdAt <= :dateTo', { dateTo: new Date(dateTo) });
    }

    qb.orderBy('tx.createdAt', 'DESC');
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

  // ── Utilitaire ────────────────────────────────
  private formatPaymentMethod(method: PaymentMethod): string {
    const labels: Record<string, string> = {
      mvola: 'MVola',
      orange_money: 'Orange Money',
      wallet: 'Portefeuille',
      free: 'Gratuit',
    };
    return labels[method] || method;
  }
}
