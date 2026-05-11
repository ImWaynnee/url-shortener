import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Soft JWT guard — attaches req.user when a valid Bearer token is present,
 * but never throws. Unauthenticated requests pass through with req.user = undefined.
 */
@Injectable()
export class JwtOptionalAuthGuard extends AuthGuard('jwt') {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      // No token or invalid token — allow through anonymously
    }
    return true;
  }

  // Prevent Passport from throwing when there is no user
  override handleRequest<T>(_err: unknown, user: T): T {
    return user;
  }
}
