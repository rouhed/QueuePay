import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceEntity } from './entities/service-entity.entity';
import { EntitiesService } from './entities.service';
import { EntitiesController } from './entities.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceEntity])],
  controllers: [EntitiesController],
  providers: [EntitiesService],
  exports: [EntitiesService],
})
export class EntitiesModule {}
