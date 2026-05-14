import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';

describe('JwtAuthGuard', () => {
  it('should be defined', () => {
    const guard = new JwtAuthGuard();
    expect(guard).toBeDefined();
  });

  it('extends AuthGuard("jwt")', () => {
    const JwtParent = AuthGuard('jwt');
    expect(JwtAuthGuard.prototype).toBeInstanceOf(JwtParent);
  });

  it('inherits canActivate from passport AuthGuard', () => {
    const guard = new JwtAuthGuard();
    // JwtAuthGuard adds no logic — just verify the method exists on the prototype chain
    expect(typeof guard.canActivate).toBe('function');
  });
});
