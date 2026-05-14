import { COALESCING_REDIS_CLIENT, COALESCING_SERVICE } from '@common/coalescing/interfaces/coalescing.interface';
import { RedisPubSubCoalescingService } from '@common/coalescing/redis-coalescing.service';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: COALESCING_REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis(config.getOrThrow<string>('REDIS_URL'))
    },
    {
      provide: COALESCING_SERVICE,
      useClass: RedisPubSubCoalescingService
    }
  ],
  exports: [COALESCING_SERVICE]
})
export class CoalescingModule {}
