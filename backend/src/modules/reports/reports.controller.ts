import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ── KPIs du tableau de bord ───────────────────────────────────
  @Get('dashboard')
  async getDashboard() {
    return this.reportsService.getDashboardKPIs();
  }

  // ── Statistiques par heure ────────────────────────────────────
  @Get('hourly')
  async getHourly(@Query('date') date?: string) {
    return this.reportsService.getHourlyStats(date);
  }

  // ── Revenus par période ───────────────────────────────────────
  @Get('revenue')
  async getRevenue(@Query('period') period: 'week' | 'month' | 'year' = 'week') {
    return this.reportsService.getRevenueByPeriod(period);
  }

  // ── Export Excel ──────────────────────────────────────────────
  @Get('export/excel')
  async exportExcel(
    @Res() res: Response,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const buffer = await this.reportsService.exportTicketsExcel(dateFrom, dateTo);
    const filename = `QueuePay_Tickets_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  // ── Export PDF ────────────────────────────────────────────────
  @Get('export/pdf')
  async exportPDF(
    @Res() res: Response,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const buffer = await this.reportsService.exportTicketsPDF(dateFrom, dateTo);
    const filename = `QueuePay_Rapport_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }
}
