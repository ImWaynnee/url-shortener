import type { CoalescingRedisClient } from '@common/coalescing/interfaces/coalescing.interface';
import { COALESCING_REDIS_CLIENT } from '@common/coalescing/interfaces/coalescing.interface';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@src/app.module';
import type { Cache } from 'cache-manager';
import session from 'express-session';
import helmet from 'helmet';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const googleClientId = configService.get<string>('GOOGLE_OAUTH_CLIENT_ID');
  const googleSecret = configService.get<string>('GOOGLE_OAUTH_CLIENT_SECRET');
  const sessionSecret = configService.get<string>('GOOGLE_OAUTH_SESSION_SECRET');
  if (googleClientId && googleSecret && sessionSecret) {
    app.use(
      session({
        // NOTE :: Probably should configure instance-independent redis store if we enable horizontal scaling
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          secure: configService.get('NODE_ENV') === 'production',
          sameSite: 'lax',
          maxAge: 10 * 60 * 1000 // 10 minutes — just long enough for the OAuth round-trip
        }
      })
    );
  }

  app.use(helmet());
  app.enableShutdownHooks(); // This allows Nest to listen for termination signals (SIGINT)

  app.enableCors({
    origin: [
      configService.get<string>('FRONTEND_URL')
    ] as string[],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true 
    })
  );

  // Startup cache health check
  const cache = app.get<Cache>(CACHE_MANAGER);
  const PROBE_KEY = '__startup_health__';
  try {
    // L1 (cache-manager, in-memory)
    await cache.set(PROBE_KEY, '1', 3000);
    const val = await cache.get<string>(PROBE_KEY);
    if (val === '1') {
      logger.log('L1 (in-memory) connected ✓');
    }
    await cache.del(PROBE_KEY);

    // L2 (direct Redis, ioredis)
    const redis = app.get<CoalescingRedisClient>(COALESCING_REDIS_CLIENT);
    await redis.set(PROBE_KEY, '1', 'EX', 3);
    const redisVal = await redis.get(PROBE_KEY);
    if (redisVal === '1') {
      logger.log('L2 (Redis)     connected ✓');
    }
    await redis.del(PROBE_KEY);
  } catch (err) {
    logger.error(`Startup health check failed: ${(err as Error).message}`);
    logger.error('Shutting down — cache is required for operation.');
    process.exit(1);
  }

  await app.listen(configService.get<number>('PORT') ?? 3000);

}

bootstrap();
