import { AuthService } from '@modules/auth/auth.service';
import { GoogleStrategy } from '@modules/auth/strategies/google.strategy';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { UserModel } from '@src/generated/prisma/models/User';
import { Profile } from 'passport-google-oauth20';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let authService: jest.Mocked<Pick<AuthService, 'findOrCreateGoogleUser'>>;

  const mockUser: UserModel = {
    id: 'user-uuid',
    email: 'alice@example.com',
    fullName: null,
    lastLoginAt: null,
    lastLoginProvider: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('fake-value'),
          },
        },
        {
          provide: AuthService,
          useValue: { findOrCreateGoogleUser: jest.fn() },
        },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate()', () => {
    const buildProfile = (overrides: Partial<Profile> = {}): Profile =>
      ({
        id: 'google-id-123',
        displayName: 'Alice Smith',
        emails: [{
          value: 'alice@example.com',
          verified: 'true' 
        }],
        ...overrides,
      } as Profile);

    it('calls findOrCreateGoogleUser with mapped profile data', async () => {
      (authService.findOrCreateGoogleUser as jest.Mock).mockResolvedValue(mockUser);
      const profile = buildProfile();

      await strategy.validate('access', 'refresh', profile);

      expect(authService.findOrCreateGoogleUser).toHaveBeenCalledWith({
        email: 'alice@example.com',
        fullName: 'Alice Smith',
        providerUserId: 'google-id-123',
      });
    });

    it('returns the user resolved by findOrCreateGoogleUser', async () => {
      (authService.findOrCreateGoogleUser as jest.Mock).mockResolvedValue(mockUser);
      const profile = buildProfile();

      const result = await strategy.validate('access', 'refresh', profile);

      expect(result).toBe(mockUser);
    });

    it('passes undefined email when profile has no emails', async () => {
      (authService.findOrCreateGoogleUser as jest.Mock).mockResolvedValue(mockUser);
      const profile = buildProfile({ emails: undefined });

      await strategy.validate('access', 'refresh', profile);

      expect(authService.findOrCreateGoogleUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: undefined }),
      );
    });
  });
});
