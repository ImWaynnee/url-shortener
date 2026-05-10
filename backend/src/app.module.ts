import { validate } from '@config/env.validation';
import { PingModule } from '@modules/ping/ping.module';
import { UrlModule } from '@modules/url/url.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '@prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true, 
      cache: true,
      validate 
    }),
    PrismaModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 60,
        },
      ],
    }),
    PingModule,
    UrlModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ]
})
export class AppModule {}
