import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { webcrypto } from 'crypto';
import { json, urlencoded } from 'express';
import { Logger } from 'nestjs-pino';

// Polyfill for crypto global (required by @nestjs/schedule)
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Suppress NestJS default logger — pino takes over
    bufferLogs: true,
  });

  // Use pino as the application logger
  app.useLogger(app.get(Logger));

  // Configure body parser with increased payload size limit (50MB)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  });

  const port = process.env.PORT ?? 9991;
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(
    { event: 'app.started', port, env: process.env.NODE_ENV ?? 'development' },
    'bytebot-agent started',
  );
}

bootstrap().catch((err) => {
  // Last-resort: pino not yet available, use stderr
  process.stderr.write(
    JSON.stringify({ level: 'fatal', msg: 'Bootstrap failed', err: String(err) }) + '\n',
  );
  process.exit(1);
});
