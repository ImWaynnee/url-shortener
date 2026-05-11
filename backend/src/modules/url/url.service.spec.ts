import { UrlService } from '@modules/url/url.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@src/prisma.service';

const mockPrismaService = {
  url: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockConfigService = {
  get: jest.fn((key: string, defaultVal?: string) => {
    if (key === 'REDIRECT_DOMAIN') return 'http://sh.example.com';
    return defaultVal ?? null;
  }),
};

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

describe('UrlService', () => {
  let service: UrlService;

  beforeEach(async () => {
    jest.clearAllMocks();

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
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<UrlService>(UrlService);
  });

  describe('createShortUrl', () => {
    const mockUrl = {
      shortUrl: 'abc1234',
      originalUrl: 'https://example.com',
    };

    beforeEach(() => {
      mockPrismaService.url.findUnique.mockResolvedValue(null);
      mockPrismaService.url.create.mockResolvedValue(mockUrl);
    });

    it('should create a short URL without createdById when no userId provided', async () => {
      const result = await service.createShortUrl({ url: 'https://example.com' });

      expect(mockPrismaService.url.create).toHaveBeenCalledWith({
        data: expect.not.objectContaining({ createdById: expect.anything() }),
      });
      expect(result).toEqual({
        shortUrl: 'abc1234',
        originalUrl: 'https://example.com',
        newUrl: 'http://sh.example.com/abc1234',
      });
    });

    it('should attach createdById when userId is provided', async () => {
      const result = await service.createShortUrl(
        { url: 'https://example.com' },
        'user-uuid-123',
      );

      expect(mockPrismaService.url.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          originalUrl: 'https://example.com',
          createdById: 'user-uuid-123',
        }),
      });
      expect(result).toEqual({
        shortUrl: 'abc1234',
        originalUrl: 'https://example.com',
        newUrl: 'http://sh.example.com/abc1234',
      });
    });

    it('should retry if the first short code is already taken', async () => {
      mockPrismaService.url.findUnique
        .mockResolvedValueOnce({ shortUrl: 'taken01' })
        .mockResolvedValueOnce(null);

      await service.createShortUrl({ url: 'https://example.com' });

      expect(mockPrismaService.url.findUnique).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.url.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('getOriginalUrl', () => {
    it('should return cached value without hitting DB on cache hit', async () => {
      mockCacheManager.get.mockResolvedValue('https://example.com');

      const result = await service.getOriginalUrl('abc1234');

      expect(mockCacheManager.get).toHaveBeenCalledWith('redirect:abc1234');
      expect(mockPrismaService.url.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual('https://example.com');
    });

    it('should query DB and populate cache on cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      mockPrismaService.url.findUnique.mockResolvedValue({
        shortUrl: 'abc1234',
        originalUrl: 'https://example.com',
      });

      const result = await service.getOriginalUrl('abc1234');

      expect(mockCacheManager.get).toHaveBeenCalledWith('redirect:abc1234');
      expect(mockPrismaService.url.findUnique).toHaveBeenCalledWith({
        where: { shortUrl: 'abc1234' },
      });
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'redirect:abc1234',
        'https://example.com',
      );
      expect(result).toEqual('https://example.com');
    });

    it('should throw NotFoundException when short code does not exist', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      mockPrismaService.url.findUnique.mockResolvedValue(null);

      await expect(service.getOriginalUrl('notfound')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
