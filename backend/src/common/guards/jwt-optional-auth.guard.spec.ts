import { JwtOptionalAuthGuard } from '@common/guards/jwt-optional-auth.guard';
import type { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

describe('JwtOptionalAuthGuard', () => {
  it('should be defined', () => {
    const guard = new JwtOptionalAuthGuard();
    expect(guard).toBeDefined();
  });

  it('extends AuthGuard("jwt")', () => {
    const JwtParent = AuthGuard('jwt');
    expect(JwtOptionalAuthGuard.prototype).toBeInstanceOf(JwtParent);
  });

  describe('canActivate()', () => {
    it('returns true when super.canActivate resolves (valid token)', async () => {
      const guard = new JwtOptionalAuthGuard();
      const ctx = {} as ExecutionContext;
      jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockResolvedValue(true);

      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('returns true when super.canActivate throws (no/invalid token)', async () => {
      const guard = new JwtOptionalAuthGuard();
      const ctx = {} as ExecutionContext;
      jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockRejectedValue(new Error('Unauthorized'));

      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('returns true when super.canActivate returns false (missing token)', async () => {
      const guard = new JwtOptionalAuthGuard();
      const ctx = {} as ExecutionContext;
      jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockResolvedValue(false);

      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });
  });

  describe('handleRequest()', () => {
    it('returns the user when present', () => {
      const guard = new JwtOptionalAuthGuard();
      const user = {
        userId: 'abc',
        email: 'a@b.com' 
      };
      expect(guard.handleRequest(null, user)).toBe(user);
    });

    it('returns undefined (not throws) when user is falsy', () => {
      const guard = new JwtOptionalAuthGuard();
      expect(() => guard.handleRequest(null, undefined)).not.toThrow();
      expect(guard.handleRequest(null, undefined)).toBeUndefined();
    });

    it('returns undefined (not throws) even when err is set', () => {
      const guard = new JwtOptionalAuthGuard();
      expect(() => guard.handleRequest(new Error('bad token'), undefined)).not.toThrow();
    });
  });
});
