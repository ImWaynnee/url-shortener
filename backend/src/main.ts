import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '@src/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.enableCors({
    origin: [
      configService.get<string>('FRONTEND_URL'),
      'http://localhost:7777',
    ].filter(Boolean) as string[],
    methods: ['GET', 'POST'],
    credentials: false,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  await app.listen(configService.get<number>('PORT') ?? 3000);
}
bootstrap();
