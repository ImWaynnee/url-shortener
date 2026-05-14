import { CoalescingModule } from '@common/coalescing/coalescing.module';
import { AuthModule } from '@modules/auth/auth.module';
import { UrlController } from '@modules/url/url.controller';
import { UrlService } from '@modules/url/url.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [AuthModule, CoalescingModule],
  controllers: [UrlController],
  providers: [UrlService]
})
export class UrlModule {}
