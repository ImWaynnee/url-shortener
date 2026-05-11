import { CreateUrlRequest } from '@modules/url/dto/create-url.dto';
import { UrlService } from '@modules/url/url.service';
import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
@Controller()
export class UrlController {
  constructor(private readonly urlService: UrlService) {}

  @Post('urls/shorten')
  async shorten(@Body() dto: CreateUrlRequest) {
    return this.urlService.createShortUrl(dto);
  }

  @Throttle({
    default: {
      limit: 120,
      ttl: 60000 
    } 
  })
  @Get(':shortUrl')
  async redirect(
    @Param('shortUrl') shortUrl: string,
    @Res() res: Response,
  ) {
    const originalUrl = await this.urlService.getOriginalUrl(shortUrl);
    return res.redirect(302, originalUrl);
  }
}
