import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EntitiesModule } from './modules/entities/entities.module';
import { QueuesModule } from './modules/queues/queues.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { AuditModule } from './modules/audit/audit.module';
import { WebSocketModule } from './modules/websocket/websocket.module';

@Module({
  imports: [
    // ── Configuration ─────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // ── Base de données PostgreSQL ────────────────
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: config.get<string>('app.nodeEnv') === 'development',
        logging: config.get<string>('app.nodeEnv') === 'development',
      }),
    }),

    // ── Modules métier ────────────────────────────
    AuthModule,
    UsersModule,
    EntitiesModule,
    QueuesModule,
    TicketsModule,
    WalletModule,
    AuditModule,

    // ── Temps réel ────────────────────────────────
    WebSocketModule,
  ],
})
export class AppModule {}
