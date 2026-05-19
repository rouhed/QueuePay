import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TicketsService } from './tickets.service';
import { CreateTicketDto, ValidateTicketDto, QueryTicketDto } from './dto';

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // ── Créer un ticket ───────────────────────────
  @Post()
  @ApiOperation({ summary: 'Créer un nouveau ticket' })
  create(@Body() dto: CreateTicketDto) {
    return this.ticketsService.create(dto);
  }

  // ── Lister tous les tickets (paginé) ──────────
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister les tickets avec filtres' })
  findAll(@Query() query: QueryTicketDto) {
    return this.ticketsService.findAll(query);
  }

  // ── Export CSV ──────────────────────────────
  @Get('export/csv')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Exporter les tickets en CSV' })
  async exportCsv(@Query() query: QueryTicketDto, @Res() res: Response) {
    const csvData = await this.ticketsService.exportCsv(query);
    res.header('Content-Type', 'text/csv');
    res.attachment('tickets_export.csv');
    return res.send(csvData);
  }

  // ── Statistiques ──────────────────────────────
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Statistiques des tickets' })
  getStats() {
    return this.ticketsService.getStats();
  }

  // ── Rechercher par numéro de ticket ───────────
  @Get('by-number/:ticketNumber')
  @ApiOperation({ summary: 'Trouver un ticket par numéro' })
  findByNumber(@Param('ticketNumber') ticketNumber: string) {
    return this.ticketsService.findByTicketNumber(ticketNumber);
  }

  // ── Rechercher par QR Code ────────────────────
  @Get('by-qr/:qrCode')
  @ApiOperation({ summary: 'Trouver un ticket par QR Code' })
  findByQr(@Param('qrCode') qrCode: string) {
    return this.ticketsService.findByQrCode(qrCode);
  }

  // ── Tickets d'une file ────────────────────────
  @Get('queue/:queueId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister les tickets en attente d\'une file' })
  findByQueue(@Param('queueId') queueId: string) {
    return this.ticketsService.findByQueue(queueId);
  }

  // ── Trouver par ID ────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un ticket' })
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  // ── Appeler le prochain client ────────────────
  @Post('call-next/:queueId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Appeler le prochain client dans la file' })
  callNext(@Param('queueId') queueId: string, @Request() req: any) {
    return this.ticketsService.callNext(queueId, req.user.sub);
  }

  // ── Valider un ticket (agent) ─────────────────
  @Patch(':id/validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Valider un ticket (service rendu, absent, annulé)' })
  validate(
    @Param('id') id: string,
    @Body() dto: ValidateTicketDto,
    @Request() req: any,
  ) {
    return this.ticketsService.validate(id, dto, req.user.sub);
  }

  // ── Annuler un ticket (client) ────────────────
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Annuler un ticket' })
  cancel(@Param('id') id: string) {
    return this.ticketsService.cancel(id);
  }
}
