import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from '@src/app.module';
import { PrismaService } from '@src/prisma.service';
import supertest from 'supertest';

export interface TestApp {
  app: INestApplication;
  request: ReturnType<typeof supertest>;
  prisma: PrismaService;
  jwtService: JwtService;
  close: () => Promise<void>;
}

export async function createTestApp(): Promise<TestApp> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule]
  })
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true 
    })
  );
  await app.init();

  return {
    app,
    request: supertest(app.getHttpServer()),
    prisma: moduleRef.get(PrismaService),
    jwtService: moduleRef.get(JwtService),
    close: () => app.close()
  };
}
