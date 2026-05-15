import type { ClientInfo } from '@common/interfaces/client-info.interface';
import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Extracts User-Agent and IP address from the request.
 * Throws 400 if either cannot be determined, used for routes such as /refresh where
 * a refresh token should not be generated without knowing the origin device and IP.
 *
 * IP resolution order (to support Nginx reverse-proxy):
 *   X-Real-IP → first entry of X-Forwarded-For → req.ip
 */
export function extractClientInfo(req: Request): ClientInfo {
  const deviceInfo = req.headers['user-agent'];

  const ipAddress =
    (req.headers['x-real-ip'] as string | undefined) ||
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() ||
    req.ip;

  const referrer = (req.headers['referer'] as string | undefined) ?? null;

  if (!deviceInfo || !ipAddress) {
    throw new BadRequestException('Unable to identify client device or origin');
  }

  return {
    deviceInfo,
    ipAddress,
    referrer
  };
}
