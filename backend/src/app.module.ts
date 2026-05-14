import { validate } from '@config/env.validation';
import KeyvRedis from '@keyv/redis';
import { AuthModule } from '@modules/auth/auth.module';
import { PingModule } from '@modules/ping/ping.module';
import { UrlModule } from '@modules/url/url.module';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '@src/prisma/prisma.module';
import { KeyvCacheableMemory } from 'cacheable';
import { Keyv } from 'keyv';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true, 
      cache: true,
      validate 
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          ttl: config.getOrThrow<number>('CACHE_L2_TTL_MS'),
          stores: [
            new Keyv({
              store: new KeyvCacheableMemory({
                ttl: config.getOrThrow<number>('CACHE_L1_TTL_MS'),
                lruSize: 5000
              })
            }),
            new KeyvRedis(config.getOrThrow<string>('REDIS_URL'))
          ]
        };
      }
    }),
    PrismaModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 60
        }
      ]
    }),
    PingModule,
    UrlModule,
    AuthModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}
