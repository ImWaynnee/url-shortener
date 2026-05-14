import { AuthService } from '@modules/auth/auth.service';
import { LocalStrategy } from '@modules/auth/strategies/local.strategy';
import { UnauthorizedException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UserModel } from '@src/generated/prisma/models/User';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: jest.Mocked<Pick<AuthService, 'validateLocalUser'>>;

  const mockUser: UserModel = {
    id: 'user-uuid',
    email: 'alice@example.com',
    fullName: null,
    lastLoginAt: null,
    lastLoginProvider: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: null
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthService,
          useValue: { validateLocalUser: jest.fn() }
        }
      ]
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate()', () => {
    it('returns the user when credentials are valid', async () => {
      (authService.validateLocalUser as jest.Mock).mockResolvedValue(mockUser);
      const result = await strategy.validate('alice@example.com', 'correct-pass');
      expect(result).toBe(mockUser);
    });

    it('throws UnauthorizedException when credentials are invalid', async () => {
      (authService.validateLocalUser as jest.Mock).mockResolvedValue(null);
      await expect(strategy.validate('alice@example.com', 'wrong-pass')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('throws with message "Invalid credentials"', async () => {
      (authService.validateLocalUser as jest.Mock).mockResolvedValue(null);
      await expect(strategy.validate('alice@example.com', 'wrong-pass')).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });
});
