import type { UrlCacheEntry } from '@modules/url/interfaces/url-cache.interface';
import { UrlController } from '@modules/url/url.controller';
import { UrlService } from '@modules/url/url.service';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { Request, Response } from 'express';

const MOCK_FRONTEND_URL = 'https://app.example.com';

const makeReq = (userId?: string) =>
  ({
    user: userId ? {
      userId,
      email: 'test@example.com' 
    } : undefined,
    headers: {},
    ip: '127.0.0.1'
  } as unknown as Request);

const makeCacheEntry = (overrides: Partial<UrlCacheEntry> = {}): UrlCacheEntry => ({
  id: '1',
  shortUrl: 'abc1234',
  originalUrl: 'https://example.com',
  isActive: true,
  expiresAt: null,
  activeDestinationId: '1',
  ...overrides
});

describe('UrlController', () => {
  let controller: UrlController;
  let service: UrlService;

  const mockUrlService = {
    createShortUrl: jest.fn(),
    getOriginalUrl: jest.fn(),
    getUrlInfo: jest.fn(),
    recordClick: jest.fn().mockResolvedValue(undefined),
    listUserUrls: jest.fn(),
    updateUrl: jest.fn(),
    listUrlDestinations: jest.fn(),
    listDestinationClicks: jest.fn()
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'FRONTEND_URL') return MOCK_FRONTEND_URL;
      return null;
    })
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UrlController],
      providers: [
        {
          provide: UrlService,
          useValue: mockUrlService 
        },
        {
          provide: ConfigService,
          useValue: mockConfigService 
        }
      ]
    }).compile();

    controller = module.get<UrlController>(UrlController);
    service = module.get<UrlService>(UrlService);
  });

  describe('POST /urls/shorten', () => {
    const serviceResult = {
      shortUrl: 'abc1234',
      originalUrl: 'https://example.com',
      newUrl: 'http://s-local.wyzwyz.xyz/abc1234'
    };

    it('should call createShortUrl without userId when unauthenticated', async () => {
      mockUrlService.createShortUrl.mockResolvedValue(serviceResult);

      const result = await controller.shorten({ url: 'https://example.com' }, makeReq());

      expect(service.createShortUrl).toHaveBeenCalledWith(
        { url: 'https://example.com' },
        undefined
      );
      expect(result).toEqual(serviceResult);
    });

    it('should call createShortUrl with userId when authenticated', async () => {
      mockUrlService.createShortUrl.mockResolvedValue(serviceResult);

      const result = await controller.shorten(
        { url: 'https://example.com' },
        makeReq('user-uuid-123')
      );

      expect(service.createShortUrl).toHaveBeenCalledWith(
        { url: 'https://example.com' },
        'user-uuid-123'
      );
      expect(result).toEqual(serviceResult);
    });
  });

  describe('GET /:shortUrl', () => {
    const createMockResponse = () =>
      ({ redirect: jest.fn().mockReturnThis() } as unknown as Response);

    it('should redirect to the original URL with 302', async () => {
      const res = createMockResponse();
      const entry = makeCacheEntry();
      mockUrlService.getOriginalUrl.mockResolvedValue(entry);

      await controller.redirect('abc1234', makeReq(), res);

      expect(service.getOriginalUrl).toHaveBeenCalledWith('abc1234');
      expect(res.redirect).toHaveBeenCalledWith(302, 'https://example.com');
    });

    it('should fire-and-forget recordClick after redirect', async () => {
      const res = createMockResponse();
      const entry = makeCacheEntry();
      mockUrlService.getOriginalUrl.mockResolvedValue(entry);

      await controller.redirect('abc1234', makeReq(), res);

      expect(service.recordClick).toHaveBeenCalledWith(entry, expect.objectContaining({ ip: '127.0.0.1' }));
    });

    it('should redirect to frontend with link_disabled error when URL is disabled', async () => {
      const res = createMockResponse();
      mockUrlService.getOriginalUrl.mockResolvedValue(makeCacheEntry({ isActive: false }));

      await controller.redirect('abc1234', makeReq(), res);

      expect(res.redirect).toHaveBeenCalledWith(302, `${MOCK_FRONTEND_URL}/missing-link?code=abc1234&reason=disabled`);
      expect(service.recordClick).not.toHaveBeenCalled();
    });

    it('should redirect to frontend with link_expired error when URL has expired', async () => {
      const res = createMockResponse();
      const pastDate = new Date(Date.now() - 60_000).toISOString();
      mockUrlService.getOriginalUrl.mockResolvedValue(
        makeCacheEntry({ expiresAt: pastDate })
      );

      await controller.redirect('abc1234', makeReq(), res);

      expect(res.redirect).toHaveBeenCalledWith(302, `${MOCK_FRONTEND_URL}/missing-link?code=abc1234&reason=expired`);
      expect(service.recordClick).not.toHaveBeenCalled();
    });

    it('should not treat a future expiresAt as expired', async () => {
      const res = createMockResponse();
      const futureDate = new Date(Date.now() + 60_000).toISOString();
      mockUrlService.getOriginalUrl.mockResolvedValue(
        makeCacheEntry({ expiresAt: futureDate })
      );

      await controller.redirect('abc1234', makeReq(), res);

      expect(res.redirect).toHaveBeenCalledWith(302, 'https://example.com');
    });

    it('should redirect to frontend with link_not_found error when short code does not exist', async () => {
      const res = createMockResponse();
      mockUrlService.getOriginalUrl.mockRejectedValue(
        new NotFoundException('Short code "notfound" not found')
      );

      await controller.redirect('notfound', makeReq(), res);

      expect(res.redirect).toHaveBeenCalledWith(302, `${MOCK_FRONTEND_URL}/missing-link?code=notfound`);
    });

    it('should redirect to preview page when shortUrl ends with +', async () => {
      const res = createMockResponse();
      mockUrlService.getOriginalUrl.mockResolvedValue(makeCacheEntry());

      await controller.redirect('abc1234+', makeReq(), res);

      expect(service.getOriginalUrl).toHaveBeenCalledWith('abc1234');
      expect(res.redirect).toHaveBeenCalledWith(302, `${MOCK_FRONTEND_URL}/preview/abc1234`);
      expect(service.recordClick).not.toHaveBeenCalled();
    });

    it('should redirect to missing-link when preview target does not exist', async () => {
      const res = createMockResponse();
      mockUrlService.getOriginalUrl.mockRejectedValue(
        new NotFoundException('Short code "notfound" not found')
      );

      await controller.redirect('notfound+', makeReq(), res);

      expect(res.redirect).toHaveBeenCalledWith(302, `${MOCK_FRONTEND_URL}/missing-link?code=notfound`);
    });
  });

  describe('GET /urls', () => {
    it('should call listUserUrls with userId and query params', async () => {
      const expected = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20 
      };
      mockUrlService.listUserUrls.mockResolvedValue(expected);

      const query = {
        page: 1,
        pageSize: 20 
      };
      const result = await controller.listUrls(query as never, makeReq('user-uuid'));

      expect(service.listUserUrls).toHaveBeenCalledWith('user-uuid', query);
      expect(result).toEqual(expected);
    });
  });

  describe('PATCH /urls/:id', () => {
    it('should call updateUrl with id, userId, and dto', async () => {
      const expected = {
        id: '1',
        shortUrl: 'abc1234',
        isActive: false 
      };
      mockUrlService.updateUrl.mockResolvedValue(expected);

      const result = await controller.updateUrl('1', { isActive: false }, makeReq('user-uuid'));

      expect(service.updateUrl).toHaveBeenCalledWith('1', 'user-uuid', { isActive: false });
      expect(result).toEqual(expected);
    });
  });

  describe('GET /urls/:shortCode/info', () => {
    it('should delegate to getUrlInfo with the short code', async () => {
      const expected = {
        shortUrl: 'abc1234',
        originalUrl: 'https://example.com',
        isActive: true,
        isExpired: false,
        expiresAt: null
      };
      mockUrlService.getUrlInfo.mockResolvedValue(expected);

      const result = await controller.getUrlInfo('abc1234');

      expect(service.getUrlInfo).toHaveBeenCalledWith('abc1234');
      expect(result).toEqual(expected);
    });
  });

  describe('GET /urls/:id/destinations', () => {
    it('should call listUrlDestinations with id and userId', async () => {
      const expected = [{
        id: '1',
        destinationUrl: 'https://example.com',
        isActive: true,
        clickCount: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: null 
      }];
      mockUrlService.listUrlDestinations.mockResolvedValue(expected);

      const result = await controller.listDestinations('1', makeReq('user-uuid'));

      expect(service.listUrlDestinations).toHaveBeenCalledWith('1', 'user-uuid');
      expect(result).toEqual(expected);
    });
  });

  describe('GET /urls/:id/destinations/:destinationId/clicks', () => {
    it('should call listDestinationClicks with correct params', async () => {
      const expected = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20 
      };
      mockUrlService.listDestinationClicks.mockResolvedValue(expected);

      const query = {
        page: 1,
        pageSize: 20 
      };
      const result = await controller.listClicks('1', '2', query as never, makeReq('user-uuid'));

      expect(service.listDestinationClicks).toHaveBeenCalledWith('1', '2', 'user-uuid', query);
      expect(result).toEqual(expected);
    });
  });
});