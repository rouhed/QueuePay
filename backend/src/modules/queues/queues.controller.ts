import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { QueuesService } from './queues.service';
import { CreateQueueDto, UpdateQueueDto, QueryQueueDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('queues')
@ApiBearerAuth()
@Controller('queues')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Créer une file d\'attente' })
  @ApiResponse({ status: 201, description: 'File créée' })
  create(@Body() dto: CreateQueueDto) {
    return this.queuesService.create(dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Liste des files (paginée, filtrée par entité/statut)' })
  findAll(@Query() query: QueryQueueDto) {
    return this.queuesService.findAll(query);
  }

  @Get('stats/count')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Comptage des files par statut' })
  countByStatus() {
    return this.queuesService.countByStatus();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Détail d\'une file d\'attente' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.queuesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Modifier une file d\'attente' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQueueDto,
  ) {
    return this.queuesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Supprimer une file d\'attente' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.queuesService.remove(id);
  }
}
