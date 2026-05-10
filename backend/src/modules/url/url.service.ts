import { CreateUrlRequest } from '@modules/url/dto/create-url.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@src/prisma.service';
import { nanoid } from 'nanoid';

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
        where: {
          shortUrl 
        },
      });
      exists = !!existing;
    } while (exists);

    const url = await this.prisma.url.create({
      data: {
        shortUrl,
        originalUrl: dto.url 
      },
    });

    return {
      shortUrl: url.shortUrl,
      originalUrl: url.originalUrl,
      newUrl: `${this.config.get('REDIRECT_DOMAIN', 'http://sh-local.wyzwyz.xyz')}/${url.shortUrl}`,
    };
  }

  async getOriginalUrl(shortUrl: string): Promise<string> {
    const url = await this.prisma.url.findUnique({
      where: {
        shortUrl,
      } 
    });

    if (!url) {
      throw new NotFoundException(`Short code "${shortUrl}" not found`);
    }

    return url.originalUrl;
  }
}
