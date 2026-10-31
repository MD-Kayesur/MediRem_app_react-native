import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  // 1. Build the Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('MediRem API')
    .setDescription('The MediRem Backend API documentation')
    .setVersion('1.0')
    .addBearerAuth() // Adds authorization support (JWT tokens) to the UI
    .build();

  // 2. Create the document
  const document = SwaggerModule.createDocument(app, config);

  // 3. Setup the Swagger UI path (accessible at /api/docs)
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  
  logger.log(`🚀 MediRem NestJS Backend running at http://0.0.0.0:${port}/api (accessible via localhost & LAN)`);
  logger.log(`📚 Swagger Documentation UI available at http://localhost:${port}/api/docs`);
  logger.log(`💊 Health check available at http://localhost:${port}/api/health`);
}
bootstrap();
