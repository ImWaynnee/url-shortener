import { CreateUrlRequest } from '@modules/url/dto/create-url.dto';
import { UrlService } from '@modules/url/url.service';
import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtOptionalAuthGuard } from '@src/common/guards/jwt-optional-auth.guard';
import { JwtUser } from '@src/modules/auth/strategies/jwt.strategy';
import { Request, Response } from 'express';

@Controller()
export class UrlController {
  constructor(private readonly urlService: UrlService) {}

  @UseGuards(JwtOptionalAuthGuard)
  @Post('urls/shorten')
  async shorten(@Body() createUrlInfo: CreateUrlRequest, @Req() req: Request) {
    const user = req.user as JwtUser | undefined;
    return this.urlService.createShortUrl(createUrlInfo, user?.userId);
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
