import { PaginationRequest } from '@common/dto/pagination.request.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { JwtOptionalAuthGuard } from '@common/guards/jwt-optional-auth.guard';
import { JwtUser } from '@modules/auth/interfaces/jwt.interface';
import { CreateUrlRequest } from '@modules/url/dto/create-url.request.dto';
import { ListUrlsRequest } from '@modules/url/dto/list-urls.request.dto';
import { UpdateUrlRequest } from '@modules/url/dto/update-url.request.dto';
import { UrlService } from '@modules/url/url.service';
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards 
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';

@Controller()
export class UrlController {
  constructor(
    private readonly urlService: UrlService,
    private readonly config: ConfigService
  ) {}

  @UseGuards(JwtOptionalAuthGuard)
  @Post('urls/shorten')
  async shorten(@Body() createUrlInfo: CreateUrlRequest, @Req() req: Request) {
    const user = req.user as JwtUser | undefined;
    return this.urlService.createShortUrl(createUrlInfo, user?.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('urls')
  listUrls(@Query() query: ListUrlsRequest, @Req() req: Request) {
    const user = req.user as JwtUser;
    return this.urlService.listUserUrls(user.userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('urls/:id')
  updateUrl(
    @Param('id') id: string,
    @Body() dto: UpdateUrlRequest,
    @Req() req: Request
  ) {
    const user = req.user as JwtUser;
    return this.urlService.updateUrl(id, user.userId, dto);
  }

  @Get('urls/:shortCode/info')
  getUrlInfo(@Param('shortCode') shortCode: string) {
    return this.urlService.getUrlInfo(shortCode);
  }

  @UseGuards(JwtAuthGuard)
  @Get('urls/:id/destinations')
  listDestinations(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as JwtUser;
    return this.urlService.listUrlDestinations(id, user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('urls/:id/destinations/:destinationId/clicks')
  listClicks(
    @Param('id') id: string,
    @Param('destinationId') destinationId: string,
    @Query() query: PaginationRequest,
    @Req() req: Request
  ) {
    const user = req.user as JwtUser;
    return this.urlService.listDestinationClicks(
      id,
      destinationId,
      user.userId,
      query
    );
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
    @Req() req: Request,
    @Res() res: Response
  ) {
    const isPreview = shortUrl.endsWith('+');
    const code = isPreview ? shortUrl.slice(0, -1) : shortUrl;
    const frontendUrl = this.config.get<string>('FRONTEND_URL');

    let entry;
    try {
      entry = await this.urlService.getLinkedUrl(code);
    } catch (e) {
      if (e instanceof NotFoundException) {
        return res.redirect(302, `${frontendUrl}/missing-link?code=${code}`);
      }
      throw e;
    }

    if (!entry.isActive) {
      return res.redirect(302, `${frontendUrl}/missing-link?code=${code}&reason=disabled`);
    }

    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
      return res.redirect(302, `${frontendUrl}/missing-link?code=${code}&reason=expired`);
    }

    if (isPreview) {
      return res.redirect(302, `${frontendUrl}/preview/${code}`);
    }

    res.redirect(302, entry.destinationUrl);
    void this.urlService.recordClick(entry, req).catch(() => undefined);
  }
}
