import { UrlService } from '@modules/url/url.service';
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
    it('should return the original URL when the short code exists', async () => {
      const mockShortUrl = 'abc1234';
      const mockOriginalUrl = 'https://example.com';
      const mockData = {
        shortUrl: mockShortUrl,
        originalUrl: mockOriginalUrl,
      };

      mockPrismaService.url.findUnique.mockResolvedValue(mockData);

      const result = await service.getOriginalUrl(mockShortUrl);

      expect(mockPrismaService.url.findUnique).toHaveBeenCalledWith({
        where: { shortUrl: mockShortUrl },
      });
      expect(result).toEqual(mockOriginalUrl);
    });

    it('should throw NotFoundException when short code does not exist', async () => {
      mockPrismaService.url.findUnique.mockResolvedValue(null);

      await expect(service.getOriginalUrl('notfound')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
