import { CanActivate, ExecutionContext, Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Ensures Google OAuth environment variables are configured before the
 * passport-google strategy runs. Returns HTTP 501 otherwise, so missing
 * env vars cause a graceful error instead of a crash.
 */
@Injectable()
export class GoogleOAuthEnabledGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(_ctx: ExecutionContext): boolean {
    const clientId = this.configService.get<string>('GOOGLE_OAUTH_CLIENT_ID');
    if (!clientId) {
      throw new NotImplementedException('Login method unsupported');
    }
    return true;
  }
}
