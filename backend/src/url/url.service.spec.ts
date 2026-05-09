import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UrlService } from './url.service';
import { PrismaService } from '../prisma.service';

const mockPrismaService = {
  url: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('UrlService', () => {
  let service: UrlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlService,
        { provide: PrismaService, useValue: mockPrismaService },
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
      expect(result).toHaveProperty('shortUrl');
      expect(result).toHaveProperty('shortUrl');
    });
  });

  describe('getOriginalUrl', () => {
    it('should throw NotFoundException when short code does not exist', async () => {
      mockPrismaService.url.findUnique.mockResolvedValue(null);

      await expect(service.getOriginalUrl('notfound')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
