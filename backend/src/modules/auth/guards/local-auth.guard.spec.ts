import { LocalAuthGuard } from '@modules/auth/guards/local-auth.guard';
import type { ExecutionContext } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';

jest.mock('@nestjs/passport', () => ({
  AuthGuard: () =>
    class {
      canActivate() {
        return true;
      }
    }
}));

function makeContext(body: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ body })
    })
  } as unknown as ExecutionContext;
}

describe('LocalAuthGuard', () => {
  let guard: LocalAuthGuard;

  beforeEach(() => {
    guard = new LocalAuthGuard();
  });

  it('calls super.canActivate and returns true when body is valid', async () => {
    const ctx = makeContext({
      email: 'alice@example.com',
      password: 'password123' 
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('throws BadRequestException when email is missing', async () => {
    const ctx = makeContext({ password: 'password123' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when password is missing', async () => {
    const ctx = makeContext({ email: 'alice@example.com' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(BadRequestException);
  });

  it('throws with "Validation failed" message when email is invalid', async () => {
    const ctx = makeContext({
      email: 'not-an-email',
      password: 'password123' 
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow('Validation failed');
  });
});
