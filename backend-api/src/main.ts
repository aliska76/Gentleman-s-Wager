import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './common/domain-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Lets Nest's onModuleDestroy hooks run on SIGTERM/SIGINT — specifically
  // BatchedGameWriteBuffer's final flush (ARCHITECTURE.md §8.4), so a
  // normal restart/redeploy never silently drops the last batch of
  // not-yet-durable turn-boundary writes.
  app.enableShutdownHooks();

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new DomainExceptionFilter());

  // Swagger/OpenAPI docs — served at /docs, not behind auth. Mirrors the
  // real API contract in ARCHITECTURE.md §7 so the frontend (or any other
  // client) can be built against it directly.
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Gentleman's Wager API")
    .setDescription(
      'Push-your-luck two-dice game for the Roeto home assignment. ' +
        'Auth is a simplified mock (username only, no password) that still issues a real JWT — ' +
        'see ARCHITECTURE.md §10 for why.',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token', // referenced by @ApiBearerAuth('access-token') on protected controllers
    )
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  const baseUrl = `http://localhost:${port}`;
  console.log(`Gentleman's Wager API listening on ${baseUrl}`);
  console.log(`Swagger docs at ${baseUrl}/docs`);
}

bootstrap();
