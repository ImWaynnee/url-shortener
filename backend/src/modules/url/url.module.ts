import { UrlController } from '@modules/url/url.controller';
import { UrlService } from '@modules/url/url.service';
import { Module } from '@nestjs/common';

@Module({
  controllers: [UrlController],
  providers: [UrlService],
})
export class UrlModule {}
