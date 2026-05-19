import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Ticket } from '../tickets/entities/ticket.entity';
import { User } from '../users/entities/user.entity';
import { TicketStatus } from '../../common/enums';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger('ReportsService');

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepo: Repository<Ticket>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  // ════════════════════════════════════════════════
  // KPIs DASHBOARD PRINCIPAL
  // ════════════════════════════════════════════════

  async getDashboardKPIs() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      ticketsToday,
      ticketsYesterday,
      ticketsWeek,
      ticketsMonth,
      revenueToday,
      revenueWeek,
      revenueMonth,
      completedToday,
      cancelledToday,
      inQueue,
      totalUsers,
      newUsersToday,
    ] = await Promise.all([
      this.ticketsRepo.count({ where: { createdAt: MoreThanOrEqual(today) } }),
      this.ticketsRepo.count({ where: { createdAt: Between(yesterday, today) } }),
      this.ticketsRepo.count({ where: { createdAt: MoreThanOrEqual(thisWeekStart) } }),
      this.ticketsRepo.count({ where: { createdAt: MoreThanOrEqual(thisMonthStart) } }),
      this.getRevenue(today, new Date()),
      this.getRevenue(thisWeekStart, new Date()),
      this.getRevenue(thisMonthStart, new Date()),
      this.ticketsRepo.count({ where: { status: TicketStatus.COMPLETED, createdAt: MoreThanOrEqual(today) } }),
      this.ticketsRepo.count({ where: { status: TicketStatus.CANCELLED, createdAt: MoreThanOrEqual(today) } }),
      this.ticketsRepo.count({ where: { status: TicketStatus.IN_QUEUE } }),
      this.usersRepo.count(),
      this.usersRepo.count({ where: { createdAt: MoreThanOrEqual(today) } }),
    ]);

    const presenceRate = ticketsToday > 0
      ? Math.round((completedToday / ticketsToday) * 100)
      : 0;

    return {
      tickets: {
        today: ticketsToday,
        yesterday: ticketsYesterday,
        week: ticketsWeek,
        month: ticketsMonth,
        inQueue,
        completedToday,
        cancelledToday,
        presenceRate,
        todayVsYesterday: ticketsYesterday > 0
          ? Math.round(((ticketsToday - ticketsYesterday) / ticketsYesterday) * 100)
          : 0,
      },
      revenue: {
        today: revenueToday,
        week: revenueWeek,
        month: revenueMonth,
      },
      users: {
        total: totalUsers,
        newToday: newUsersToday,
      },
    };
  }

  // ════════════════════════════════════════════════
  // STATISTIQUES PAR HEURE (graphique affluence)
  // ════════════════════════════════════════════════

  async getHourlyStats(date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const raw = await this.ticketsRepo
      .createQueryBuilder('t')
      .select("EXTRACT(HOUR FROM t.createdAt)", 'hour')
      .addSelect('COUNT(*)', 'count')
      .where('t.createdAt >= :from', { from: targetDate })
      .andWhere('t.createdAt < :to', { to: nextDay })
      .groupBy("EXTRACT(HOUR FROM t.createdAt)")
      .orderBy("EXTRACT(HOUR FROM t.createdAt)", 'ASC')
      .getRawMany();

    // Remplir les 24 heures (même si count=0)
    const hours = Array.from({ length: 24 }, (_, h) => {
      const found = raw.find((r) => parseInt(r.hour) === h);
      return { hour: h, count: found ? parseInt(found.count) : 0 };
    });

    return hours;
  }

  // ════════════════════════════════════════════════
  // REVENUS PAR PÉRIODE
  // ════════════════════════════════════════════════

  async getRevenueByPeriod(period: 'week' | 'month' | 'year') {
    const now = new Date();
    const data: { label: string; revenue: number; tickets: number }[] = [];

    if (period === 'week') {
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(day.getDate() - i);
        day.setHours(0, 0, 0, 0);
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);

        const [revenue, tickets] = await Promise.all([
          this.getRevenue(day, nextDay),
          this.ticketsRepo.count({ where: { createdAt: Between(day, nextDay) } }),
        ]);

        data.push({
          label: day.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
          revenue,
          tickets,
        });
      }
    } else if (period === 'month') {
      for (let i = 29; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(day.getDate() - i);
        day.setHours(0, 0, 0, 0);
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);

        const [revenue, tickets] = await Promise.all([
          this.getRevenue(day, nextDay),
          this.ticketsRepo.count({ where: { createdAt: Between(day, nextDay) } }),
        ]);

        data.push({
          label: day.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          revenue,
          tickets,
        });
      }
    } else if (period === 'year') {
      for (let m = 0; m < 12; m++) {
        const monthStart = new Date(now.getFullYear(), m, 1);
        const monthEnd = new Date(now.getFullYear(), m + 1, 0, 23, 59, 59);

        const [revenue, tickets] = await Promise.all([
          this.getRevenue(monthStart, monthEnd),
          this.ticketsRepo.count({ where: { createdAt: Between(monthStart, monthEnd) } }),
        ]);

        data.push({
          label: monthStart.toLocaleDateString('fr-FR', { month: 'long' }),
          revenue,
          tickets,
        });
      }
    }

    return data;
  }

  // ════════════════════════════════════════════════
  // EXPORT EXCEL
  // ════════════════════════════════════════════════

  async exportTicketsExcel(dateFrom?: string, dateTo?: string): Promise<Buffer> {
    const tickets = await this.getTicketsForExport(dateFrom, dateTo);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'QueuePay';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Tickets', {
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    // En-têtes stylisés
    sheet.columns = [
      { header: 'N° Ticket', key: 'ticketNumber', width: 18 },
      { header: 'Client', key: 'client', width: 25 },
      { header: 'Téléphone', key: 'phone', width: 18 },
      { header: 'File', key: 'queue', width: 25 },
      { header: 'Entité', key: 'entity', width: 25 },
      { header: 'Statut', key: 'status', width: 15 },
      { header: 'Prix (Ar)', key: 'price', width: 12 },
      { header: 'Mode Paiement', key: 'payment', width: 18 },
      { header: 'Payé', key: 'isPaid', width: 8 },
      { header: 'Date Création', key: 'createdAt', width: 22 },
    ];

    // Style en-tête
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A1A2E' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Données
    for (const t of tickets) {
      const row = sheet.addRow({
        ticketNumber: t.ticketNumber,
        client: t.clientName || (t.client ? `${t.client.firstName} ${t.client.lastName}` : 'Anonyme'),
        phone: t.clientPhone || t.client?.phone || '',
        queue: t.queue?.name || '',
        entity: t.entity?.name || '',
        status: this.translateStatus(t.status),
        price: t.price || 0,
        payment: t.paymentMethod?.toUpperCase() || '',
        isPaid: t.isPaid ? 'Oui' : 'Non',
        createdAt: t.createdAt ? new Date(t.createdAt).toLocaleString('fr-FR') : '',
      });

      // Couleur alternée
      if (sheet.rowCount % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };
      }

      // Badge statut
      const statusCell = row.getCell('status');
      const statusColors: Record<string, string> = {
        'Complété': 'FF22C55E',
        'Annulé': 'FFEF4444',
        'En file': 'FF3B82F6',
        'Appelé': 'FFF59E0B',
        'Absent': 'FF9CA3AF',
      };
      if (statusColors[t.status]) {
        statusCell.font = { color: { argb: statusColors[t.status] }, bold: true };
      }
    }

    // Total revenus en bas
    sheet.addRow([]);
    const totalRow = sheet.addRow({
      ticketNumber: 'TOTAL REVENUS',
      price: tickets.reduce((sum, t) => sum + (t.isPaid ? Number(t.price) : 0), 0),
    });
    totalRow.font = { bold: true };
    totalRow.getCell('ticketNumber').font = { bold: true, size: 12 };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ════════════════════════════════════════════════
  // EXPORT PDF
  // ════════════════════════════════════════════════

  async exportTicketsPDF(dateFrom?: string, dateTo?: string): Promise<Buffer> {
    const tickets = await this.getTicketsForExport(dateFrom, dateTo);
    const kpis = await this.getDashboardKPIs();

    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // ── En-tête ─────────────────────────────────
      doc.rect(0, 0, doc.page.width, 80).fill('#1A1A2E');
      doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
        .text('QueuePay — Rapport des Tickets', 40, 20);
      doc.fontSize(10).font('Helvetica')
        .text(
          `Généré le ${new Date().toLocaleDateString('fr-FR')} | ${tickets.length} tickets`,
          40,
          50,
        );

      // ── Résumé KPIs ─────────────────────────────
      doc.fillColor('#1A1A2E').rect(40, 100, 180, 70).fill('#F0F4FF');
      doc.fillColor('#1A1A2E').fontSize(10).font('Helvetica-Bold')
        .text('Tickets (Période)', 55, 110);
      doc.fontSize(22).text(`${tickets.length}`, 55, 125);

      doc.rect(240, 100, 180, 70).fill('#F0F4FF');
      doc.fillColor('#1A1A2E').fontSize(10).font('Helvetica-Bold')
        .text('Revenus (Période)', 255, 110);
      const totalRevenue = tickets.reduce(
        (sum, t) => sum + (t.isPaid ? Number(t.price) : 0),
        0,
      );
      doc.fontSize(22).text(`${totalRevenue.toLocaleString()} Ar`, 255, 125);

      doc.rect(440, 100, 180, 70).fill('#F0F4FF');
      doc.fillColor('#1A1A2E').fontSize(10).font('Helvetica-Bold')
        .text('Taux de présence', 455, 110);
      doc.fontSize(22).text(`${kpis.tickets.presenceRate}%`, 455, 125);

      // ── Tableau ──────────────────────────────────
      const tableTop = 195;
      const colWidths = [90, 100, 80, 120, 70, 60, 80, 120];
      const headers = ['Ticket', 'Client', 'File', 'Entité', 'Statut', 'Prix', 'Paiement', 'Date'];
      const cols = [40, 130, 230, 310, 430, 500, 560, 640];

      // En-tête tableau
      doc.rect(40, tableTop - 8, doc.page.width - 80, 22).fill('#1A1A2E');
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
      headers.forEach((h, i) => doc.text(h, cols[i], tableTop - 2));

      // Lignes
      doc.font('Helvetica').fontSize(8);
      let y = tableTop + 20;

      for (const t of tickets.slice(0, 35)) {
        if (y > doc.page.height - 60) {
          doc.addPage({ layout: 'landscape' });
          y = 40;
        }

        if (tickets.indexOf(t) % 2 === 0) {
          doc.rect(40, y - 4, doc.page.width - 80, 16).fill('#F8FAFF');
        }

        doc.fillColor('#1A1A2E')
          .text(t.ticketNumber, cols[0], y, { width: colWidths[0] })
          .text(t.clientName || 'Anonyme', cols[1], y, { width: colWidths[1] })
          .text(t.queue?.name || '', cols[2], y, { width: colWidths[2] })
          .text(t.entity?.name || '', cols[3], y, { width: colWidths[3] })
          .text(this.translateStatus(t.status), cols[4], y, { width: colWidths[4] })
          .text(`${t.price || 0} Ar`, cols[5], y, { width: colWidths[5] })
          .text(t.paymentMethod || '', cols[6], y, { width: colWidths[6] })
          .text(t.createdAt ? new Date(t.createdAt).toLocaleDateString('fr-FR') : '', cols[7], y, { width: colWidths[7] });

        y += 18;
      }

      // ── Pied de page ─────────────────────────────
      doc.rect(0, doc.page.height - 35, doc.page.width, 35).fill('#1A1A2E');
      doc.fillColor('white').fontSize(8)
        .text('QueuePay — Confidentiel — Usage interne uniquement', 40, doc.page.height - 22);

      doc.end();
    });
  }

  // ════════════════════════════════════════════════
  // MÉTHODES UTILITAIRES PRIVÉES
  // ════════════════════════════════════════════════

  private async getRevenue(from: Date, to: Date): Promise<number> {
    const result = await this.ticketsRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.price), 0)', 'total')
      .where('t.isPaid = :paid', { paid: true })
      .andWhere('t.createdAt >= :from', { from })
      .andWhere('t.createdAt <= :to', { to })
      .getRawOne();
    return Number(result?.total || 0);
  }

  private async getTicketsForExport(dateFrom?: string, dateTo?: string) {
    const qb = this.ticketsRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.queue', 'queue')
      .leftJoinAndSelect('t.entity', 'entity')
      .leftJoinAndSelect('t.client', 'client')
      .orderBy('t.createdAt', 'DESC');

    if (dateFrom) qb.andWhere('t.createdAt >= :from', { from: new Date(dateFrom) });
    if (dateTo) qb.andWhere('t.createdAt <= :to', { to: new Date(dateTo) });

    qb.take(10000);
    return qb.getMany();
  }

  private translateStatus(status: string): string {
    const map: Record<string, string> = {
      in_queue: 'En file',
      called: 'Appelé',
      completed: 'Complété',
      cancelled: 'Annulé',
      no_show: 'Absent',
      pending: 'En attente',
      expired: 'Expiré',
    };
    return map[status] || status;
  }
}
