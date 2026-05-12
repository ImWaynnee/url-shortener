import { COALESCING_SERVICE, ICoalescingService } from '@common/coalescing/coalescing.interface';
import { CreateUrlRequest } from '@modules/url/dto/create-url.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@src/prisma.service';
import { Cache } from 'cache-manager';
import { nanoid } from 'nanoid';

@Injectable()
export class UrlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @Inject(COALESCING_SERVICE) private readonly coalescing: ICoalescingService,
  ) {}

  async createShortUrl(dto: CreateUrlRequest, userId?: string) {
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
        originalUrl: dto.url,
        ...(userId ? { createdById: userId } : {}),
      },
    });

    return {
      shortUrl: url.shortUrl,
      originalUrl: url.originalUrl,
      newUrl: `${this.config.get('REDIRECT_DOMAIN', 'http://s-local.wyzwyz.xyz')}/${url.shortUrl}`,
    };
  }

  async getOriginalUrl(shortUrl: string): Promise<string> {
    const cacheKey = `redirect:${shortUrl}`;

    const cached = await this.cache.get<string>(cacheKey);
    if (cached) return cached;

    // Coalesce concurrent cache-miss requests for the same key into one DB fetch.
    return this.coalescing.coalesce(cacheKey, async () => {
      const rechecked = await this.cache.get<string>(cacheKey);
      if (rechecked) return rechecked;

      const url = await this.prisma.url.findUnique({ where: { shortUrl } });

      if (!url) {
        throw new NotFoundException(`Short code "${shortUrl}" not found`);
      }

      await this.cache.set(cacheKey, url.originalUrl);
      return url.originalUrl;
    });
  }
}
