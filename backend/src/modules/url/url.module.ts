import { UrlController } from '@modules/url/url.controller';
import { UrlService } from '@modules/url/url.service';
import { Module } from '@nestjs/common';
import { AuthModule } from '@src/modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UrlController],
  providers: [UrlService],
})
export class UrlModule {}
