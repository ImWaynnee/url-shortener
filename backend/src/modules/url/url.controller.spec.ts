import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { UrlController } from '@modules/url/url.controller';
import { UrlService } from '@modules/url/url.service';

const mockUrlService = {
  createShortUrl: jest.fn(),
  getOriginalUrl: jest.fn(),
};

const mockResponse = () => {
  const res = {} as Response;
  res.redirect = jest.fn().mockReturnValue(res);
  return res;
};

describe('UrlController', () => {
  let controller: UrlController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UrlController],
      providers: [{ provide: UrlService, useValue: mockUrlService }],
    }).compile();

    controller = module.get<UrlController>(UrlController);
    jest.clearAllMocks();
  });

  describe('POST /urls/shorten', () => {
    it('should return the shortened URL response', async () => {
      const dto = { url: 'https://example.com' };
      const serviceResult = {
        shortUrl: 'abc1234',
        originalUrl: 'https://example.com',
        newUrl: 'http://sh-dev.wyzwyz.xyz/abc1234',
      };
      mockUrlService.createShortUrl.mockResolvedValue(serviceResult);

      const result = await controller.shorten(dto);

      expect(mockUrlService.createShortUrl).toHaveBeenCalledWith(dto);
      expect(result).toBe(serviceResult);
    });
  });

  describe('GET /:shortUrl', () => {
    it('should redirect to the original URL with 302', async () => {
      const res = mockResponse();
      mockUrlService.getOriginalUrl.mockResolvedValue('https://example.com');

      await controller.redirect('abc1234', res);

      expect(mockUrlService.getOriginalUrl).toHaveBeenCalledWith('abc1234');
      expect(res.redirect).toHaveBeenCalledWith(302, 'https://example.com');
    });

    it('should propagate NotFoundException when short code does not exist', async () => {
      const res = mockResponse();
      mockUrlService.getOriginalUrl.mockRejectedValue(
        new NotFoundException('Short code "notfound" not found'),
      );

      await expect(controller.redirect('notfound', res)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
