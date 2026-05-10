import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { nanoid } from 'nanoid';
import { PrismaService } from '../../prisma.service';
import { CreateUrlRequest } from './dto/create-url.dto';

@Injectable()
export class UrlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async createShortUrl(dto: CreateUrlRequest) {
    let shortUrl: string;
    let exists: boolean;

    do {
      shortUrl = nanoid(7);
      const existing = await this.prisma.url.findUnique({
        where: { shortUrl },
      });
      exists = !!existing;
    } while (exists);

    const url = await this.prisma.url.create({
      data: { shortUrl, originalUrl: dto.url },
    });

    return {
      shortUrl: url.shortUrl,
      originalUrl: url.originalUrl,
      newUrl: `${this.config.get('REDIRECT_DOMAIN', 'http://sh-dev.wyzwyz.xyz')}/${url.shortUrl}`,
    };
  }

  async getOriginalUrl(shortUrl: string): Promise<string> {
    const url = await this.prisma.url.findUnique({ where: { shortUrl } });

    if (!url) {
      throw new NotFoundException(`Short code "${shortUrl}" not found`);
    }

    return url.originalUrl;
  }
}
