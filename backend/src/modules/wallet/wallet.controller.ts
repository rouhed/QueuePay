import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WalletService } from './wallet.service';
import { DepositDto, WithdrawDto, QueryTransactionsDto } from './dto';

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // ── GET /wallet ───────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Récupérer mon portefeuille' })
  @ApiResponse({ status: 200, description: 'Portefeuille trouvé' })
  async getMyWallet(@Request() req: any) {
    return this.walletService.getWallet(req.user.id);
  }

  // ── GET /wallet/balance ───────────────────────
  @Get('balance')
  @ApiOperation({ summary: 'Récupérer mon solde' })
  async getBalance(@Request() req: any) {
    return this.walletService.getBalance(req.user.id);
  }

  // ── POST /wallet/deposit ──────────────────────
  @Post('deposit')
  @ApiOperation({ summary: 'Déposer de l\'argent dans le portefeuille' })
  @ApiResponse({ status: 201, description: 'Dépôt effectué' })
  @ApiResponse({ status: 400, description: 'Limite atteinte ou montant invalide' })
  async deposit(@Request() req: any, @Body() dto: DepositDto) {
    return this.walletService.deposit(req.user.id, dto);
  }

  // ── POST /wallet/withdraw ────────────────────
  @Post('withdraw')
  @ApiOperation({ summary: 'Retirer de l\'argent vers MVola ou Orange Money' })
  @ApiResponse({ status: 201, description: 'Demande de retrait créée' })
  @ApiResponse({ status: 400, description: 'Solde insuffisant' })
  async withdraw(@Request() req: any, @Body() dto: WithdrawDto) {
    return this.walletService.withdraw(req.user.id, dto);
  }

  // ── GET /wallet/transactions ──────────────────
  @Get('transactions')
  @ApiOperation({ summary: 'Historique de mes transactions' })
  async getTransactions(@Request() req: any, @Query() query: QueryTransactionsDto) {
    return this.walletService.getTransactions(req.user.id, query);
  }

  // ── GET /wallet/stats (admin) ─────────────────
  @Get('stats')
  @ApiOperation({ summary: 'Statistiques globales wallets (admin)' })
  async getGlobalStats() {
    return this.walletService.getGlobalStats();
  }

  // ── GET /wallet/admin/transactions (admin) ────
  @Get('admin/transactions')
  @ApiOperation({ summary: 'Lister toutes les transactions (admin)' })
  async getAllTransactions(@Query() query: QueryTransactionsDto) {
    return this.walletService.getAllTransactions(query);
  }
}
