import { COALESCING_SERVICE, ICoalescingService } from '@common/coalescing/interfaces/coalescing.interface';
import { PaginationRequest } from '@common/dto/pagination.request.dto';
import { PaginatedResponse } from '@common/interfaces/pagination.interface';
import { extractClientInfo } from '@common/utils/extract-client-info';
import { CreateUrlRequest } from '@modules/url/dto/create-url.request.dto';
import { ListUrlsRequest } from '@modules/url/dto/list-urls.request.dto';
import { UpdateUrlRequest } from '@modules/url/dto/update-url.request.dto';
import { CreateUrlResponse, UrlClickResponse, UrlDestinationResponse, UrlInfoResponse, UrlResponse } from '@modules/url/dto/url.response.dto';
import { UrlCacheEntry } from '@modules/url/interfaces/url-cache.interface';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@src/prisma.service';
import { Cache } from 'cache-manager';
import type { Request } from 'express';
import { nanoid } from 'nanoid';

const LATEST_DESTINATION = {
  take: 1,
  orderBy: { createdAt: 'desc' as const }
};

@Injectable()
export class UrlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @Inject(COALESCING_SERVICE) private readonly coalescing: ICoalescingService
  ) {}

  async createShortUrl(dto: CreateUrlRequest, userId?: string): Promise<CreateUrlResponse> {
    let shortUrl: string;
    let exists: boolean;

    do {
      shortUrl = nanoid(7);
      const existing = await this.prisma.url.findUnique({ where: { shortUrl } });
      exists = !!existing;
    } while (exists);

    const { url } = await this.prisma.$transaction(async (tx) => {
      const url = await tx.url.create({
        data: {
          shortUrl,
          ...(userId ? { createdById: userId } : {})
        }
      });

      await tx.urlDestination.create({
        data: {
          urlId: url.id,
          destinationUrl: dto.url
        }
      });

      await tx.urlStat.create({
        data: {
          urlId: url.id,
          totalClicks: 0
        }
      });

      return { url };
    });

    return {
      shortUrl: url.shortUrl,
      destinationUrl: dto.url,
      newUrl: `${this.config.get('REDIRECT_DOMAIN', 'http://s-local.wyzwyz.xyz')}/${url.shortUrl}`
    };
  }

  async getLinkedUrl(shortUrl: string): Promise<UrlCacheEntry> {
    const cacheKey = `redirect:${shortUrl}`;

    const cached = await this.cache.get<UrlCacheEntry>(cacheKey);
    if (cached) return cached;

    // Coalesce concurrent cache-miss requests for the same key into one DB fetch.
    return this.coalescing.coalesce(cacheKey, async () => {
      const rechecked = await this.cache.get<UrlCacheEntry>(cacheKey);
      if (rechecked) return rechecked;

      const url = await this.prisma.url.findUnique({
        where: { shortUrl },
        include: {
          urlDestinations: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!url) {
        throw new NotFoundException(`Short code "${shortUrl}" not found`);
      }

      const entry: UrlCacheEntry = {
        id: url.id.toString(),
        shortUrl: url.shortUrl,
        destinationUrl: url.urlDestinations[0]?.destinationUrl ?? '',
        isActive: url.isActive,
        expiresAt: url.expiresAt ? url.expiresAt.toISOString() : null,
        activeDestinationId: url.urlDestinations[0]?.id.toString() ?? null
      };

      await this.cache.set(cacheKey, entry);
      return entry;
    });
  }

  async getUrlInfo(shortCode: string): Promise<UrlInfoResponse> {
    const entry = await this.getLinkedUrl(shortCode);
    const now = new Date();
    return {
      shortUrl: entry.shortUrl,
      destinationUrl: entry.destinationUrl,
      isActive: entry.isActive,
      isExpired: entry.expiresAt ? new Date(entry.expiresAt) < now : false,
      expiresAt: entry.expiresAt
    };
  }

  async recordClick(entry: UrlCacheEntry, req: Request): Promise<void> {
    if (!entry.activeDestinationId) return;

    const { ipAddress, deviceInfo: userAgent, referrer } = extractClientInfo(req);

    const urlId = BigInt(entry.id);
    const destinationId = BigInt(entry.activeDestinationId);

    await this.prisma.$transaction(async (tx) => {
      await tx.urlClick.create({
        data: {
          urlId,
          destinationId,
          ipAddress,
          userAgent,
          referrer
        }
      });
      await tx.urlStat.updateMany({
        where: { urlId },
        data: { totalClicks: { increment: 1 } }
      });
    });

  }

  async listUserUrls(userId: string, query: ListUrlsRequest): Promise<PaginatedResponse<UrlResponse>> {
    const { search, isActive, isExpired, page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;
    const now = new Date();

    const where = {
      createdById: userId,
      ...(isActive !== undefined ? { isActive } : {}),
      ...(isExpired === true
        ? { expiresAt: { lt: now } }
        : isExpired === false
          ? { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
          : {}),
      ...(search
        ? {
          OR: [
            {
              urlDestinations: {
                some: {
                  destinationUrl: {
                    contains: search,
                    mode: 'insensitive' as const
                  }
                }
              }
            },
            {
              shortUrl: {
                contains: search,
                mode: 'insensitive' as const
              }
            },
            {
              comments: {
                contains: search,
                mode: 'insensitive' as const
              }
            }
          ]
        }
        : {})
    };

    const [urls, total] = await this.prisma.$transaction(async (tx) => {
      const items = await tx.url.findMany({
        where,
        include: {
          urlStats: true,
          urlDestinations: LATEST_DESTINATION
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      });
      const count = await tx.url.count({ where });
      return [items, count] as const;
    });

    return {
      items: urls.map((url) => this.mapUrlToResponse(url)),
      total,
      page,
      pageSize
    };
  }

  async updateUrl(id: string, userId: string, updateUrlBody: UpdateUrlRequest): Promise<UrlResponse> {
    const urlId = BigInt(id);
    const existing = await this.prisma.url.findUnique({ where: { id: urlId } });
    if (!existing) throw new NotFoundException('URL not found');
    if (existing.createdById !== userId) throw new ForbiddenException();

    const baseData = {
      ...(updateUrlBody.isActive !== undefined ? { isActive: updateUrlBody.isActive } : {}),
      ...('comments' in updateUrlBody ? { comments: updateUrlBody.comments } : {}),
      ...('expiresAt' in updateUrlBody ? { expiresAt: updateUrlBody.expiresAt } : {})
    };

    const urlInclude = {
      urlStats: true,
      urlDestinations: LATEST_DESTINATION
    };

    const updated = updateUrlBody.destinationUrl !== undefined
      ? await this.prisma.$transaction(async (tx) => {
        await tx.urlDestination.create({
          data: {
            urlId,
            destinationUrl: updateUrlBody.destinationUrl!
          }
        });
        return tx.url.update({
          where: { id: urlId },
          data: baseData,
          include: urlInclude
        });
      })
      : await this.prisma.url.update({
        where: { id: urlId },
        data: baseData,
        include: urlInclude
      });

    await this.cache.del(`redirect:${updated.shortUrl}`);
    return this.mapUrlToResponse(updated);
  }

  async listUrlDestinations(id: string, userId: string): Promise<UrlDestinationResponse[]> {
    const urlId = BigInt(id);
    const url = await this.prisma.url.findUnique({ where: { id: urlId } });
    if (!url) throw new NotFoundException('URL not found');
    if (url.createdById !== userId) throw new ForbiddenException();

    const destinations = await this.prisma.urlDestination.findMany({
      where: { urlId },
      include: { _count: { select: { urlClicks: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return destinations.map((d) => ({
      id: d.id.toString(),
      destinationUrl: d.destinationUrl,
      clickCount: d._count.urlClicks,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt?.toISOString() ?? null
    }));
  }

  async listDestinationClicks(
    urlId: string,
    destinationId: string,
    userId: string,
    query: PaginationRequest
  ): Promise<PaginatedResponse<UrlClickResponse>> {
    const urlIdBig = BigInt(urlId);
    const destIdBig = BigInt(destinationId);
    const { page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;

    const url = await this.prisma.url.findUnique({ where: { id: urlIdBig } });
    if (!url) throw new NotFoundException('URL not found');
    if (url.createdById !== userId) throw new ForbiddenException();

    const destination = await this.prisma.urlDestination.findFirst({
      where: {
        id: destIdBig,
        urlId: urlIdBig
      }
    });
    if (!destination) throw new NotFoundException('Destination not found');

    const [clicks, total] = await this.prisma.$transaction(async (tx) => {
      const items = await tx.urlClick.findMany({
        where: {
          urlId: urlIdBig,
          destinationId: destIdBig
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      });
      const count = await tx.urlClick.count({
        where: {
          urlId: urlIdBig,
          destinationId: destIdBig
        }
      });
      return [items, count] as const;
    });

    return {
      items: clicks.map((c) => ({
        id: c.id.toString(),
        ipAddress: c.ipAddress,
        userAgent: c.userAgent,
        referrer: c.referrer,
        createdAt: c.createdAt.toISOString()
      })),
      total,
      page,
      pageSize
    };
  }

  private mapUrlToResponse(url: {
    id: bigint;
    shortUrl: string;
    comments: string | null;
    isActive: boolean;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date | null;
    urlStats: { totalClicks: number;
      lastClickedAt: Date | null }[];
    urlDestinations: { destinationUrl: string }[];
  }): UrlResponse {
    return {
      id: url.id.toString(),
      shortUrl: url.shortUrl,
      destinationUrl: url.urlDestinations[0]?.destinationUrl ?? '',
      comments: url.comments,
      isActive: url.isActive,
      expiresAt: url.expiresAt?.toISOString() ?? null,
      createdAt: url.createdAt.toISOString(),
      updatedAt: url.updatedAt?.toISOString() ?? null,
      totalClicks: url.urlStats[0]?.totalClicks ?? 0,
      lastClickedAt: url.urlStats[0]?.lastClickedAt?.toISOString() ?? null
    };
  }
}
