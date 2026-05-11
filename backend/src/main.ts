import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@src/app.module';
import session from 'express-session';
import helmet from 'helmet';

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
          maxAge: 10 * 60 * 1000, // 10 minutes — just long enough for the OAuth round-trip
        },
      }),
    );
  }

  app.use(helmet());
  app.enableShutdownHooks(); // This allows Nest to listen for termination signals (SIGTERM/SIGINT)

  app.enableCors({
    origin: [
      configService.get<string>('FRONTEND_URL')
    ] as string[],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true 
    }),
  );

  await app.listen(configService.get<number>('PORT') ?? 3000);
}
bootstrap();
