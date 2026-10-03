// Load .env before any module is evaluated — decorators read process.env at import time
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { frontendUrls, jwtSecret } from './common/config';

async function bootstrap() {
  jwtSecret(); // fail fast in production when JWT_SECRET is missing
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: frontendUrls(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  const port = process.env.PORT || 3001;
  await app.listen(port);
  new Logger('Bootstrap').log(`DonorConnect API running on port ${port}`);
}

bootstrap().catch((error) => {
  new Logger('Bootstrap').error(`Failed to start: ${error.message}`);
  process.exit(1);
});
