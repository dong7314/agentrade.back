import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import cookieParser from 'cookie-parser';

import { apiReference } from '@scalar/nestjs-api-reference';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('PORT');
  const corsOrigin = configService.getOrThrow<string>('CORS_ORIGIN');

  app.use(cookieParser());

  app.enableCors({
    origin: corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const openApiConfig = new DocumentBuilder()
    .setTitle('Agentrade API')
    .setDescription('AI strategy simulation backend API')
    .setVersion('0.1.0')
    .addTag('health')
    .addCookieAuth('access_token', { type: 'apiKey' }, 'access_token')
    .addCookieAuth('refresh_token', { type: 'apiKey' }, 'refresh_token')
    .build();
  const openApiDocumentFactory = () =>
    SwaggerModule.createDocument(app, openApiConfig);

  SwaggerModule.setup('openapi', app, openApiDocumentFactory, {
    ui: false,
    raw: ['json'],
    jsonDocumentUrl: 'openapi.json',
  });

  app.use(
    '/docs',
    apiReference({
      theme: 'default',
      url: '/openapi.json',
    }),
  );

  await app.listen(port);
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
