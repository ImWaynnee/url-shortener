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
    jest.clearAllMocks();
  });

  describe('createShortUrl', () => {
    it('should generate a short code and return the shortened URL', async () => {
      mockPrismaService.url.findUnique.mockResolvedValue(null);
      mockPrismaService.url.create.mockResolvedValue({
        shortUrl: 'abc1234',
        originalUrl: 'https://example.com',
      });

      const result = await service.createShortUrl({ url: 'https://example.com' });

      expect(mockPrismaService.url.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ originalUrl: 'https://example.com' }),
      });

      expect(result).toEqual({
        shortUrl: 'abc1234',
        originalUrl: 'https://example.com',
        newUrl: 'http://sh.example.com/abc1234',
      });
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
