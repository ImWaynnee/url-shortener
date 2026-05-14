import { GoogleOAuthEnabledGuard } from '@modules/auth/guards/google-oauth-enabled.guard';
import type { ExecutionContext } from '@nestjs/common';
import { NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

describe('GoogleOAuthEnabledGuard', () => {
  let guard: GoogleOAuthEnabledGuard;
  let configService: jest.Mocked<ConfigService>;

  const mockContext = {} as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleOAuthEnabledGuard,
        {
          provide: ConfigService,
          useValue: { get: jest.fn() }
        }
      ]
    }).compile();

    guard = module.get<GoogleOAuthEnabledGuard>(GoogleOAuthEnabledGuard);
    configService = module.get(ConfigService);
  });

  describe('when GOOGLE_OAUTH_CLIENT_ID is configured', () => {
    it('returns true', () => {
      configService.get.mockReturnValue('fake-client-id');
      expect(guard.canActivate(mockContext)).toBe(true);
    });
  });

  describe('when GOOGLE_OAUTH_CLIENT_ID is not configured', () => {
    it('throws NotImplementedException', () => {
      configService.get.mockReturnValue(undefined);
      expect(() => guard.canActivate(mockContext)).toThrow(NotImplementedException);
    });

    it('throws with message "Login method unsupported"', () => {
      configService.get.mockReturnValue(undefined);
      expect(() => guard.canActivate(mockContext)).toThrow('Login method unsupported');
    });
  });
});
