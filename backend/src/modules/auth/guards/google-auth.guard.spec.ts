import { GoogleAuthGuard, GoogleCallbackGuard } from '@modules/auth/guards/google-auth.guard';
import { AuthGuard } from '@nestjs/passport';

describe('GoogleAuthGuard', () => {
  it('should be defined', () => {
    const guard = new GoogleAuthGuard();
    expect(guard).toBeDefined();
  });

  it('extends AuthGuard("google")', () => {
    const GoogleParent = AuthGuard('google');
    expect(GoogleAuthGuard.prototype).toBeInstanceOf(GoogleParent);
  });
});

describe('GoogleCallbackGuard', () => {
  it('should be defined', () => {
    const guard = new GoogleCallbackGuard();
    expect(guard).toBeDefined();
  });

  it('extends AuthGuard("google")', () => {
    const GoogleParent = AuthGuard('google');
    expect(GoogleCallbackGuard.prototype).toBeInstanceOf(GoogleParent);
  });
});
