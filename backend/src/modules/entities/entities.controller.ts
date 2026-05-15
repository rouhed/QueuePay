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
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { EntitiesService } from './entities.service';
import { CreateEntityDto, UpdateEntityDto, QueryEntityDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { Request } from 'express';

interface AuthRequest extends Request {
  user: { id: string };
}

@ApiTags('entities')
@ApiBearerAuth()
@Controller('entities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EntitiesController {
  constructor(private readonly entitiesService: EntitiesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Créer une entité (organisation/service)' })
  @ApiResponse({ status: 201, description: 'Entité créée' })
  create(@Body() dto: CreateEntityDto, @Req() req: AuthRequest) {
    return this.entitiesService.create(dto, req.user.id);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Liste des entités (paginée)' })
  findAll(@Query() query: QueryEntityDto) {
    return this.entitiesService.findAll(query);
  }

  @Get('stats/count')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Nombre d\'entités actives' })
  countActive() {
    return this.entitiesService.countActive();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Détail d\'une entité' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.entitiesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Modifier une entité' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEntityDto,
  ) {
    return this.entitiesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Supprimer une entité' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.entitiesService.remove(id);
  }
}
