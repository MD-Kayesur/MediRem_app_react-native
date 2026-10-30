import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('MediRemBootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS so the React Native / Expo mobile app can reach the API
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global prefix: /api
  app.setGlobalPrefix('api');

  // Input validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 MediRem NestJS Backend running at http://0.0.0.0:${port}/api (accessible via localhost & LAN)`);
  logger.log(`💊 Health check available at http://localhost:${port}/api/health`);
 }
bootstrap();

