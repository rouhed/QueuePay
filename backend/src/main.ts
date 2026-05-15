import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Global prefix ─────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── CORS ──────────────────────────────────────
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Autoriser les requêtes sans origine (ex: Postman), localhost, et Vercel
      if (!origin || origin.includes('localhost') || origin.includes('vercel.app') || origin === process.env.ADMIN_URL) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  // ── Validation globale ────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Swagger / OpenAPI ─────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('QueuePay API')
    .setDescription(
      'API de gestion de file d\'attente et de réservation avec paiement MVola & Orange Money',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentification & inscription')
    .addTag('users', 'Gestion des utilisateurs')
    .addTag('entities', 'Gestion des organisations/services')
    .addTag('queues', 'Gestion des files d\'attente')
    .addTag('tickets', 'Gestion des tickets')
    .addTag('wallet', 'Portefeuille numérique & transactions')
    .addTag('audit', 'Journal d\'audit et traçabilité')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // ── Lancement ─────────────────────────────────
  const port = process.env.APP_PORT || 3001;
  await app.listen(port);
  console.log(`\n🚀 QueuePay API running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs:            http://localhost:${port}/api/docs`);
  console.log(`🔌 WebSocket endpoint:      ws://localhost:${port}/ws\n`);
}

bootstrap();
