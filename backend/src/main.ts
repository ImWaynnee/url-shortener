import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@src/app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  app.use(helmet());
  app.enableShutdownHooks(); // This allows Nest to listen for termination signals (SIGTERM/SIGINT)

  app.enableCors({
    origin: [
      configService.get<string>('FRONTEND_URL'),
      'http://localhost:7777',
    ].filter(Boolean) as string[],
    methods: ['GET', 'POST'],
    credentials: false,
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
