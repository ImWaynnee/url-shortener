import { COALESCING_SERVICE, type ICoalescingService } from '@common/coalescing/interfaces/coalescing.interface';
import { buildUrl, buildUrlWithDestinations } from '@factories/url.factory';
import { buildUrlDestination } from '@factories/url-destination.factory';
import { buildUrlStat } from '@factories/url-stat.factory';
import type { UrlCacheEntry } from '@modules/url/interfaces/url-cache.interface';
import { UrlService } from '@modules/url/url.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { PrismaService } from '@src/prisma.service';
import type { Cache } from 'cache-manager';
import type { DeepMockProxy } from 'jest-mock-extended';
import { mockDeep } from 'jest-mock-extended';

const mockPrismaService: DeepMockProxy<PrismaService> = mockDeep<PrismaService>();
const mockConfigService: DeepMockProxy<ConfigService> = mockDeep<ConfigService>();
const mockCacheManager: DeepMockProxy<Cache> = mockDeep<Cache>();
const mockCoalescingService: DeepMockProxy<ICoalescingService> = mockDeep<ICoalescingService>();

describe('UrlService', () => {
  let service: UrlService;

  beforeEach(async () => {
    jest.resetAllMocks();

    // $transaction passthrough — delegates to the callback with the mock as tx
    mockPrismaService.$transaction.mockImplementation(
      async (cb: (tx: typeof mockPrismaService) => Promise<unknown>) => cb(mockPrismaService)
    );

    // ConfigService passthrough
    mockConfigService.get.mockImplementation(
      ((key: string, defaultVal?: string) => {
        if (key === 'REDIRECT_DOMAIN') return 'http://sh.example.com';
        return defaultVal ?? null;
      }) as typeof mockConfigService.get
    );

    // Coalescing passthrough — makes it transparent in single-call unit tests
    mockCoalescingService.coalesce.mockImplementation(
      <T>(_key: string, fetcher: () => Promise<T>) => fetcher()
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlService,
        {
          provide: PrismaService,
          useValue: mockPrismaService
        },
        {
          provide: ConfigService,
          useValue: mockConfigService
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager
        },
        {
          provide: COALESCING_SERVICE,
          useValue: mockCoalescingService
        }
      ]
    }).compile();

    service = module.get<UrlService>(UrlService);
  });

  describe('createShortUrl', () => {
    let stubUrl: ReturnType<typeof buildUrl>;

    beforeEach(() => {
      stubUrl = buildUrl({ shortUrl: 'abc1234' });

      mockPrismaService.url.findUnique.mockResolvedValue(null);
      mockPrismaService.url.create.mockResolvedValue(stubUrl);
      mockPrismaService.urlDestination.create.mockResolvedValue(buildUrlDestination());
      mockPrismaService.urlStat.create.mockResolvedValue(buildUrlStat());
    });

    it('should create a short URL without createdById when no userId provided', async () => {
      const result = await service.createShortUrl({ url: 'https://example.com' });

      expect(mockPrismaService.url.create).toHaveBeenCalledWith({
        data: expect.not.objectContaining({ createdById: expect.anything() })
      });
      expect(result).toEqual({
        shortUrl: 'abc1234',
        destinationUrl: 'https://example.com',
        newUrl: 'http://sh.example.com/abc1234'
      });
    });

    it('should attach createdById when userId is provided', async () => {
      const result = await service.createShortUrl(
        { url: 'https://example.com' },
        'user-uuid-123'
      );

      expect(mockPrismaService.url.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          createdById: 'user-uuid-123'
        })
      });
      expect(result).toEqual({
        shortUrl: 'abc1234',
        destinationUrl: 'https://example.com',
        newUrl: 'http://sh.example.com/abc1234'
      });
    });

    it('should create a UrlDestination and UrlStat row inside the transaction', async () => {
      stubUrl = buildUrl({
        id: BigInt(1),
        shortUrl: 'abc1234' 
      });
      mockPrismaService.url.create.mockResolvedValue(stubUrl);

      await service.createShortUrl({ url: 'https://example.com' });

      expect(mockPrismaService.urlDestination.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          destinationUrl: 'https://example.com'
        })
      });
      expect(mockPrismaService.urlStat.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ totalClicks: 0 })
      });
    });

    it('should retry if the first short code is already taken', async () => {
      mockPrismaService.url.findUnique
        .mockResolvedValueOnce(buildUrl({ shortUrl: 'taken01' }))
        .mockResolvedValueOnce(null);

      await service.createShortUrl({ url: 'https://example.com' });

      expect(mockPrismaService.url.findUnique).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.url.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('getLinkedUrl', () => {
    const cachedEntry: UrlCacheEntry = {
      id: '1',
      shortUrl: 'abc1234',
      destinationUrl: 'https://example.com',
      isActive: true,
      expiresAt: null,
      activeDestinationId: '1'
    };

    it('should return cached entry without hitting DB on cache hit', async () => {
      mockCacheManager.get.mockResolvedValue(cachedEntry);

      const result = await service.getLinkedUrl('abc1234');

      expect(mockCacheManager.get).toHaveBeenCalledWith('redirect:abc1234');
      expect(mockPrismaService.url.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual(cachedEntry);
    });

    it('should query DB, build a UrlCacheEntry, and populate cache on cache miss', async () => {
      const destination = buildUrlDestination({
        id: BigInt(1),
        destinationUrl: 'https://example.com' 
      });
      const stubUrlWithDests = buildUrlWithDestinations(
        {
          id: BigInt(1),
          shortUrl: 'abc1234',
          isActive: true,
          expiresAt: null
        },
        [destination]
      );

      mockCacheManager.get.mockResolvedValue(undefined);
      mockPrismaService.url.findUnique.mockResolvedValue(stubUrlWithDests as never);

      const result = await service.getLinkedUrl('abc1234');

      expect(mockPrismaService.url.findUnique).toHaveBeenCalledWith({
        where: { shortUrl: 'abc1234' },
        include: {
          urlDestinations: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      expect(mockCacheManager.set).toHaveBeenCalledWith('redirect:abc1234', cachedEntry);
      expect(result).toEqual(cachedEntry);
    });

    it('should throw NotFoundException when short code does not exist', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      mockPrismaService.url.findUnique.mockResolvedValue(null);

      await expect(service.getLinkedUrl('notfound')).rejects.toThrow(NotFoundException);
    });

    it('should return cache entry populated by a concurrent request inside the coalesced fetcher (rechecked path)', async () => {
      mockCacheManager.get
        .mockResolvedValueOnce(undefined) // outer miss
        .mockResolvedValueOnce(cachedEntry); // inner recheck hit

      const result = await service.getLinkedUrl('abc1234');

      expect(mockCacheManager.get).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.url.findUnique).not.toHaveBeenCalled();
      expect(mockCacheManager.set).not.toHaveBeenCalled();
      expect(result).toEqual(cachedEntry);
    });
  });

  describe('getUrlInfo', () => {
    it('should return isExpired false when expiresAt is null', async () => {
      const entry: UrlCacheEntry = {
        id: '1',
        shortUrl: 'abc1234',
        destinationUrl: 'https://example.com',
        isActive: true,
        expiresAt: null,
        activeDestinationId: '1'
      };
      mockCacheManager.get.mockResolvedValue(entry);

      const result = await service.getUrlInfo('abc1234');

      expect(result).toEqual({
        shortUrl: 'abc1234',
        destinationUrl: 'https://example.com',
        isActive: true,
        isExpired: false,
        expiresAt: null
      });
    });

    it('should return isExpired true when expiresAt is in the past', async () => {
      const pastDate = new Date(Date.now() - 60_000).toISOString();
      const entry: UrlCacheEntry = {
        id: '1',
        shortUrl: 'abc1234',
        destinationUrl: 'https://example.com',
        isActive: true,
        expiresAt: pastDate,
        activeDestinationId: '1'
      };
      mockCacheManager.get.mockResolvedValue(entry);

      const result = await service.getUrlInfo('abc1234');

      expect(result.isExpired).toBe(true);
      expect(result.expiresAt).toBe(pastDate);
    });

    it('should return isExpired false when expiresAt is in the future', async () => {
      const futureDate = new Date(Date.now() + 60_000).toISOString();
      const entry: UrlCacheEntry = {
        id: '1',
        shortUrl: 'abc1234',
        destinationUrl: 'https://example.com',
        isActive: true,
        expiresAt: futureDate,
        activeDestinationId: '1'
      };
      mockCacheManager.get.mockResolvedValue(entry);

      const result = await service.getUrlInfo('abc1234');

      expect(result.isExpired).toBe(false);
    });
  });

  describe('recordClick', () => {
    const makeReq = () =>
      ({
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-real-ip': '10.0.0.1'
        },
        ip: '10.0.0.1'
      } as never);

    it('should return early without writing to DB when activeDestinationId is null', async () => {
      const entry: UrlCacheEntry = {
        id: '1',
        shortUrl: 'abc1234',
        destinationUrl: 'https://example.com',
        isActive: true,
        expiresAt: null,
        activeDestinationId: null
      };

      await service.recordClick(entry, makeReq());

      expect(mockPrismaService.urlClick.create).not.toHaveBeenCalled();
      expect(mockPrismaService.urlStat.updateMany).not.toHaveBeenCalled();
    });

    it('should create a UrlClick and increment totalClicks', async () => {
      const entry: UrlCacheEntry = {
        id: '10',
        shortUrl: 'abc1234',
        destinationUrl: 'https://example.com',
        isActive: true,
        expiresAt: null,
        activeDestinationId: '20'
      };

      await service.recordClick(entry, makeReq());

      expect(mockPrismaService.urlClick.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          urlId: BigInt(10),
          destinationId: BigInt(20),
          ipAddress: '10.0.0.1'
        })
      });
      expect(mockPrismaService.urlStat.updateMany).toHaveBeenCalledWith({
        where: { urlId: BigInt(10) },
        data: { totalClicks: { increment: 1 } }
      });
    });
  });

  describe('listUserUrls', () => {
    const userId = 'user-uuid';

    const buildStubWithStats = (id: bigint, overrides: Record<string, unknown> = {}) => ({
      ...buildUrl({
        id,
        createdById: userId,
        ...overrides
      }),
      urlStats: [{
        totalClicks: 0,
        lastClickedAt: null 
      }],
      urlDestinations: [{ destinationUrl: 'https://example.com' }]
    });

    beforeEach(() => {
      mockPrismaService.url.findMany.mockResolvedValue([]);
      mockPrismaService.url.count.mockResolvedValue(0);
    });

    it('should return paginated results', async () => {
      const stub = buildStubWithStats(BigInt(1), { shortUrl: 'abc1234' });
      mockPrismaService.url.findMany.mockResolvedValue([stub] as never);
      mockPrismaService.url.count.mockResolvedValue(1);

      const result = await service.listUserUrls(userId, {
        page: 1,
        pageSize: 20
      });

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          id: '1',
          shortUrl: 'abc1234',
          totalClicks: 0
        })
      );
    });

    it('should pass isActive filter to prisma', async () => {
      await service.listUserUrls(userId, { isActive: false });

      expect(mockPrismaService.url.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isActive: false }) })
      );
    });

    it('should not include isActive in where when filter is not provided', async () => {
      await service.listUserUrls(userId, {});

      const where = mockPrismaService.url.findMany.mock.calls[0]![0]!.where;
      expect(where).not.toHaveProperty('isActive');
    });

    it('should pass expiresAt lt filter when isExpired is true', async () => {
      await service.listUserUrls(userId, { isExpired: true });

      expect(mockPrismaService.url.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ expiresAt: { lt: expect.any(Date) } })
        })
      );
    });

    it('should pass OR expiresAt filter when isExpired is false', async () => {
      await service.listUserUrls(userId, { isExpired: false });

      const where = mockPrismaService.url.findMany.mock.calls[0]![0]!.where;
      expect(where!.OR).toEqual([
        { expiresAt: null },
        { expiresAt: { gt: expect.any(Date) } }
      ]);
    });

    it('should pass search OR filter across destinationUrl, shortUrl, and comments', async () => {
      await service.listUserUrls(userId, { search: 'hello' });

      const where = mockPrismaService.url.findMany.mock.calls[0]![0]!.where;
      expect(where!.OR).toEqual(
        expect.arrayContaining([
          {
            urlDestinations: {
              some: {
                destinationUrl: {
                  contains: 'hello',
                  mode: 'insensitive'
                }
              }
            }
          },
          {
            shortUrl: {
              contains: 'hello',
              mode: 'insensitive'
            }
          },
          {
            comments: {
              contains: 'hello',
              mode: 'insensitive'
            }
          }
        ])
      );
    });
  });

  describe('updateUrl', () => {
    const userId = 'owner-uuid';

    const buildWithStats = (overrides: Record<string, unknown> = {}) => ({
      ...buildUrl({
        id: BigInt(1),
        shortUrl: 'abc1234',
        createdById: userId,
        ...overrides
      }),
      urlStats: [{
        totalClicks: 0,
        lastClickedAt: null 
      }],
      urlDestinations: [{ destinationUrl: 'https://example.com' }]
    });

    it('should update url, bust cache, and return UrlResponse', async () => {
      mockPrismaService.url.findUnique.mockResolvedValue(
        buildUrl({
          id: BigInt(1),
          shortUrl: 'abc1234',
          createdById: userId
        })
      );
      mockPrismaService.url.update.mockResolvedValue(buildWithStats({ isActive: false }) as never);

      const result = await service.updateUrl('1', userId, { isActive: false });

      expect(mockPrismaService.url.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isActive: false }) })
      );
      expect(mockCacheManager.del).toHaveBeenCalledWith('redirect:abc1234');
      expect(result).toEqual(expect.objectContaining({
        id: '1',
        isActive: false
      }));
    });

    it('should throw NotFoundException when url does not exist', async () => {
      mockPrismaService.url.findUnique.mockResolvedValue(null);

      await expect(service.updateUrl('1', userId, {})).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own the url', async () => {
      mockPrismaService.url.findUnique.mockResolvedValue(
        buildUrl({
          id: BigInt(1),
          createdById: 'other-user'
        })
      );

      await expect(service.updateUrl('1', userId, {})).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listUrlDestinations', () => {
    const userId = 'owner-uuid';

    it('should return destinations with click counts', async () => {
      mockPrismaService.url.findUnique.mockResolvedValue(
        buildUrl({
          id: BigInt(1),
          createdById: userId
        })
      );
      mockPrismaService.urlDestination.findMany.mockResolvedValue([
        {
          ...buildUrlDestination({
            id: BigInt(5),
            urlId: BigInt(1)
          }),
          _count: { urlClicks: 3 }
        }
      ] as never);

      const result = await service.listUrlDestinations('1', userId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: '5',
          clickCount: 3
        })
      );
    });

    it('should throw NotFoundException when url does not exist', async () => {
      mockPrismaService.url.findUnique.mockResolvedValue(null);

      await expect(service.listUrlDestinations('1', userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own the url', async () => {
      mockPrismaService.url.findUnique.mockResolvedValue(
        buildUrl({
          id: BigInt(1),
          createdById: 'other'
        })
      );

      await expect(service.listUrlDestinations('1', userId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listDestinationClicks', () => {
    const userId = 'owner-uuid';
    const stubUrl = buildUrl({
      id: BigInt(1),
      createdById: userId
    });
    const stubDest = buildUrlDestination({
      id: BigInt(2),
      urlId: BigInt(1)
    });
    const stubClick = {
      id: BigInt(100),
      urlId: BigInt(1),
      destinationId: BigInt(2),
      ipAddress: '10.0.0.1',
      userAgent: 'Mozilla/5.0',
      referrer: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z')
    };

    it('should return paginated clicks', async () => {
      mockPrismaService.url.findUnique.mockResolvedValue(stubUrl);
      mockPrismaService.urlDestination.findFirst.mockResolvedValue(stubDest);
      mockPrismaService.urlClick.findMany.mockResolvedValue([stubClick] as never);
      mockPrismaService.urlClick.count.mockResolvedValue(1);

      const result = await service.listDestinationClicks('1', '2', userId, {
        page: 1,
        pageSize: 20
      });

      expect(result.total).toBe(1);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          id: '100',
          ipAddress: '10.0.0.1',
          createdAt: '2026-01-01T00:00:00.000Z'
        })
      );
    });

    it('should throw NotFoundException when url is not found', async () => {
      mockPrismaService.url.findUnique.mockResolvedValue(null);

      await expect(service.listDestinationClicks('1', '2', userId, {})).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when user does not own the url', async () => {
      mockPrismaService.url.findUnique.mockResolvedValue(
        buildUrl({
          id: BigInt(1),
          createdById: 'other'
        })
      );

      await expect(service.listDestinationClicks('1', '2', userId, {})).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw NotFoundException when destination is not found', async () => {
      mockPrismaService.url.findUnique.mockResolvedValue(stubUrl);
      mockPrismaService.urlDestination.findFirst.mockResolvedValue(null);

      await expect(service.listDestinationClicks('1', '2', userId, {})).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
