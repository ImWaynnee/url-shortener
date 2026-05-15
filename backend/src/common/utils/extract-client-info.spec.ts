import { extractClientInfo } from '@common/utils/extract-client-info';
import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';

type RequestOverrides = {
  userAgent?: string;
  xRealIp?: string;
  xForwardedFor?: string;
  ip?: string;
};

function buildRequest(overrides: RequestOverrides = {}): Request {
  const headers: Record<string, string> = {};

  const userAgent = 'userAgent' in overrides ? overrides.userAgent : 'Mozilla/5.0';

  if (userAgent !== undefined) {
    headers['user-agent'] = userAgent;
  }

  if (overrides.xRealIp !== undefined) {
    headers['x-real-ip'] = overrides.xRealIp;
  }

  if (overrides.xForwardedFor !== undefined) {
    headers['x-forwarded-for'] = overrides.xForwardedFor;
  }

  const ip = 'ip' in overrides 
    ? overrides.ip 
    : '127.0.0.1';

  return {
    headers,
    ip 
  } as unknown as Request;
}

describe('extractClientInfo', () => {
  describe('when all headers are present', () => {
    it('returns user-agent as deviceInfo', () => {
      const req = buildRequest({
        userAgent: 'TestAgent/1.0',
        xRealIp: '1.2.3.4' 
      });
      const result = extractClientInfo(req);
      expect(result.deviceInfo).toBe('TestAgent/1.0');
    });

    it('uses x-real-ip as ipAddress first', () => {
      const req = buildRequest({
        xRealIp: '10.0.0.1',
        xForwardedFor: '192.168.1.1',
        ip: '127.0.0.1' 
      });
      const result = extractClientInfo(req);
      expect(result.ipAddress).toBe('10.0.0.1');
    });
  });

  describe('x-forwarded-for fallback', () => {
    it('uses first entry of x-forwarded-for when x-real-ip is absent', () => {
      const req = buildRequest({
        xForwardedFor: '203.0.113.5, 10.0.0.1',
        ip: '127.0.0.1' 
      });
      const result = extractClientInfo(req);
      expect(result.ipAddress).toBe('203.0.113.5');
    });

    it('trims whitespace from x-forwarded-for first entry', () => {
      const req = buildRequest({ xForwardedFor: '  203.0.113.5  , 10.0.0.1' });
      const result = extractClientInfo(req);
      expect(result.ipAddress).toBe('203.0.113.5');
    });
  });

  describe('req.ip fallback', () => {
    it('falls back to req.ip when no proxy headers are present', () => {
      const req = buildRequest({ ip: '5.6.7.8' });
      const result = extractClientInfo(req);
      expect(result.ipAddress).toBe('5.6.7.8');
    });
  });

  describe('error cases', () => {
    it('throws BadRequestException when user-agent is missing', () => {
      const req = buildRequest({
        userAgent: undefined,
        xRealIp: '1.2.3.4'
      });
      expect(() => extractClientInfo(req)).toThrow(BadRequestException);
    });

    it('throws BadRequestException when IP cannot be determined', () => {
      const req = buildRequest({ ip: undefined });
      expect(() => extractClientInfo(req)).toThrow(BadRequestException);
    });
  });
});
