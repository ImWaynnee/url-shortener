import { Module } from '@nestjs/common';
import { UrlController } from '@modules/url/url.controller';
import { UrlService } from '@modules/url/url.service';

@Module({
  controllers: [UrlController],
  providers: [UrlService],
})
export class UrlModule {}
