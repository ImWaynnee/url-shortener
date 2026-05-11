import { UrlController } from '@modules/url/url.controller';
import { UrlService } from '@modules/url/url.service';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';

describe('UrlController', () => {
  let controller: UrlController;
  let service: UrlService;

  // Define the mock implementation clearly
  const mockUrlService = {
    createShortUrl: jest.fn(),
    getOriginalUrl: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UrlController],
      providers: [
        {
          provide: UrlService,
          // UseValue is fine, but in larger suites, useFactory is more flexible
          useValue: mockUrlService,
        },
      ],
    }).compile();

    controller = module.get<UrlController>(UrlController);
    service = module.get<UrlService>(UrlService);
  });

  describe('POST /urls/shorten', () => {
    it('should return the shortened URL response', async () => {
      const dto = { url: 'https://example.com' };
      const serviceResult = {
        shortUrl: 'abc1234',
        originalUrl: 'https://example.com',
        newUrl: 'http://s-local.wyzwyz.xyz/abc1234',
      };
      
      mockUrlService.createShortUrl.mockResolvedValue(serviceResult);

      const result = await controller.shorten(dto);

      expect(service.createShortUrl).toHaveBeenCalledWith(dto);
      // Check for deep equality rather than reference identity
      expect(result).toEqual(serviceResult);
    });
  });

  describe('GET /:shortUrl', () => {
    // Utility for generating a fresh response mock per test
    const createMockResponse = () => ({
      redirect: jest.fn().mockReturnThis(),
    } as unknown as Response);

    it('should redirect to the original URL with 302', async () => {
      const res = createMockResponse();
      const targetUrl = 'https://example.com';
      mockUrlService.getOriginalUrl.mockResolvedValue(targetUrl);

      await controller.redirect('abc1234', res);

      expect(service.getOriginalUrl).toHaveBeenCalledWith('abc1234');
      expect(res.redirect).toHaveBeenCalledWith(302, targetUrl);
    });

    it('should propagate NotFoundException when short code does not exist', async () => {
      const res = createMockResponse();
      const errorMsg = 'Short code "notfound" not found';
      
      mockUrlService.getOriginalUrl.mockRejectedValue(
        new NotFoundException(errorMsg),
      );

      await expect(controller.redirect('notfound', res)).rejects.toThrow(
        new NotFoundException(errorMsg),
      );
    });
  });
});