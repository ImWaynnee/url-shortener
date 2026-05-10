import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@prisma/prisma.module';
import { UrlModule } from '@modules/url/url.module';
import { validate } from '@config/env.validation';
import { PingModule } from '@modules/ping/ping.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate }),
    PrismaModule,
    PingModule,
    UrlModule,
  ],
})
export class AppModule {}
