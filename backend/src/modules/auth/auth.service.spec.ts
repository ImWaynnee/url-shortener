import { AuthService } from '@modules/auth/auth.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserModel } from '@src/generated/prisma/models';
import { PrismaService } from '@src/prisma.service';
import * as bcrypt from 'bcrypt';

const CLIENT_INFO = {
  deviceInfo: 'TestAgent/1.0',
  ipAddress: '127.0.0.1' 
};

const MOCK_USER = {
  id: 'user-uuid',
  email: 'alice@example.com',
  fullName: 'Alice' 
} as UserModel;

function buildPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userAuthProvider: {
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
      create: jest.fn(),
    },
    userRefreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof buildPrismaMock>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    prisma = buildPrismaMock();

    // Default: $transaction runs the callback with the same mock
    prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma 
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('signed-jwt') } 
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(604800) },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService);
  });

  // ──────────────── validateLocalUser ────────────────
  describe('validateLocalUser()', () => {
    it('returns null when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.validateLocalUser('x@x.com', 'pass');
      expect(result).toBeNull();
    });

    it('returns null when user has no local provider', async () => {
      prisma.user.findUnique.mockResolvedValue(MOCK_USER);
      prisma.userAuthProvider.findFirst.mockResolvedValue(null);
      const result = await service.validateLocalUser('alice@example.com', 'pass');
      expect(result).toBeNull();
    });

    it('returns null when password does not match', async () => {
      prisma.user.findUnique.mockResolvedValue(MOCK_USER);
      prisma.userAuthProvider.findFirst.mockResolvedValue({ secret: await bcrypt.hash('correct', 10) });
      const result = await service.validateLocalUser('alice@example.com', 'wrong');
      expect(result).toBeNull();
    });

    it('returns user when credentials are valid', async () => {
      const hash = await bcrypt.hash('correct', 10);
      prisma.user.findUnique.mockResolvedValue(MOCK_USER);
      prisma.userAuthProvider.findFirst.mockResolvedValue({ secret: hash });
      const result = await service.validateLocalUser('alice@example.com', 'correct');
      expect(result).toBe(MOCK_USER);
    });
  });

  // ──────────────── register ────────────────
  describe('register()', () => {
    const registrationData = {
      email: 'alice@example.com',
      password: 'password123',
      fullName: 'Alice' 
    };

    beforeEach(() => {
      prisma.userRefreshToken.create.mockResolvedValue({});
    });

    it('throws ConflictException when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(MOCK_USER);
      await expect(service.register(registrationData, CLIENT_INFO)).rejects.toThrow(ConflictException);
    });

    it('throws with "Account already exists" message', async () => {
      prisma.user.findUnique.mockResolvedValue(MOCK_USER);
      await expect(service.register(registrationData, CLIENT_INFO)).rejects.toThrow(
        'Account already exists, try logging in.',
      );
    });

    it('creates a new user and returns token pair', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(MOCK_USER);

      const result = await service.register(registrationData, CLIENT_INFO);

      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ accessToken: 'signed-jwt' });
      expect(typeof result.refreshToken).toBe('string');
    });

    it('stores a hashed password (not plain-text)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(MOCK_USER);

      await service.register(registrationData, CLIENT_INFO);

      const createCall = prisma.user.create.mock.calls[0][0];
      const storedHash = createCall.data.authProviders.create.secret;
      expect(storedHash).not.toBe(registrationData.password);
      expect(await bcrypt.compare(registrationData.password, storedHash)).toBe(true);
    });
  });

  // ──────────────── login ────────────────
  describe('login()', () => {
    beforeEach(() => {
      prisma.userAuthProvider.findFirstOrThrow.mockResolvedValue({});
      prisma.user.update.mockResolvedValue(MOCK_USER);
      prisma.userRefreshToken.create.mockResolvedValue({});
    });

    it('returns token pair', async () => {
      const result = await service.login(MOCK_USER, CLIENT_INFO);
      expect(result).toMatchObject({ accessToken: 'signed-jwt' });
      expect(typeof result.refreshToken).toBe('string');
    });

    it('updates lastLoginAt and lastLoginProvider', async () => {
      await service.login(MOCK_USER, CLIENT_INFO);
      const updateCall = prisma.user.update.mock.calls[0][0];
      expect(updateCall.data.lastLoginProvider).toBe('local');
      expect(updateCall.data.lastLoginAt).toBeInstanceOf(Date);
    });
  });

  // ──────────────── findOrCreateGoogleUser ────────────────
  describe('findOrCreateGoogleUser()', () => {
    const googleProfile = {
      email: 'alice@example.com',
      fullName: 'Alice',
      providerUserId: 'gid-123' 
    };

    it('returns existing user when google provider already exists', async () => {
      prisma.userAuthProvider.findFirst.mockResolvedValue({ user: MOCK_USER });
      prisma.user.update.mockResolvedValue(MOCK_USER);

      const result = await service.findOrCreateGoogleUser(googleProfile);
      expect(result).toBe(MOCK_USER);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('links provider to existing user matched by email', async () => {
      prisma.userAuthProvider.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(MOCK_USER);
      prisma.userAuthProvider.create.mockResolvedValue({});
      prisma.user.update.mockResolvedValue(MOCK_USER);

      const result = await service.findOrCreateGoogleUser(googleProfile);
      expect(prisma.userAuthProvider.create).toHaveBeenCalledTimes(1);
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(result).toBe(MOCK_USER);
    });

    it('creates new user when no existing user or provider found', async () => {
      prisma.userAuthProvider.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(MOCK_USER);
      prisma.userAuthProvider.create.mockResolvedValue({});
      prisma.user.update.mockResolvedValue(MOCK_USER);

      const result = await service.findOrCreateGoogleUser(googleProfile);
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(result).toBe(MOCK_USER);
    });

    it('creates new user directly when profile has no email (skips findUnique)', async () => {
      prisma.userAuthProvider.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(MOCK_USER);
      prisma.userAuthProvider.create.mockResolvedValue({});
      prisma.user.update.mockResolvedValue(MOCK_USER);

      await service.findOrCreateGoogleUser({ providerUserId: 'gid-123' });

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('updates lastLoginAt with provider "google"', async () => {
      prisma.userAuthProvider.findFirst.mockResolvedValue({ user: MOCK_USER });
      prisma.user.update.mockResolvedValue(MOCK_USER);

      await service.findOrCreateGoogleUser(googleProfile);
      const updateCall = prisma.user.update.mock.calls[0][0];
      expect(updateCall.data.lastLoginProvider).toBe('google');
    });
  });

  // ──────────────── loginWithGoogle ────────────────
  describe('loginWithGoogle()', () => {
    it('returns token pair', async () => {
      prisma.userRefreshToken.create.mockResolvedValue({});
      const result = await service.loginWithGoogle(MOCK_USER, CLIENT_INFO);
      expect(result).toMatchObject({ accessToken: 'signed-jwt' });
      expect(typeof result.refreshToken).toBe('string');
    });

    it('omits fullName from JWT when user has no fullName', async () => {
      const userWithoutName = {
        ...MOCK_USER,
        fullName: null 
      };
      prisma.userRefreshToken.create.mockResolvedValue({});
      await service.loginWithGoogle(userWithoutName, CLIENT_INFO);
      const signArg = (jwtService.sign as jest.Mock).mock.calls[0][0];
      expect(signArg).not.toHaveProperty('fullName');
    });
  });

  // ──────────────── refreshTokens ────────────────
  describe('refreshTokens()', () => {
    const validToken = '550e8400-e29b-41d4-a716-446655440000';
    const futureExpiry = new Date(Date.now() + 60_000);

    function buildRow(overrides = {}) {
      return {
        id: 'row-id',
        userId: 'user-uuid',
        isRevoked: false,
        revokedAt: null,
        expiresAt: futureExpiry,
        user: MOCK_USER,
        ...overrides,
      };
    }

    beforeEach(() => {
      prisma.userRefreshToken.update.mockResolvedValue({});
      prisma.userRefreshToken.create.mockResolvedValue({});
    });

    it('throws UnauthorizedException when token row does not exist', async () => {
      prisma.userRefreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refreshTokens(validToken, CLIENT_INFO)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws "Invalid session" when token is not found', async () => {
      prisma.userRefreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refreshTokens(validToken, CLIENT_INFO)).rejects.toThrow('Invalid session');
    });

    it('revokes all sessions and throws "Token already used" when revoked token is reused after grace period', async () => {
      const revokedAt = new Date(Date.now() - 20_000); // 20s ago > 10s grace
      prisma.userRefreshToken.findUnique.mockResolvedValue(
        buildRow({
          isRevoked: true,
          revokedAt 
        }),
      );
      prisma.userRefreshToken.updateMany.mockResolvedValue({ count: 1 });

      await expect(service.refreshTokens(validToken, CLIENT_INFO)).rejects.toThrow('Token already used');
      expect(prisma.userRefreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isRevoked: true }) }),
      );
    });

    it('throws "Invalid session" when revoked token is within grace period', async () => {
      const revokedAt = new Date(Date.now() - 1_000); // 1s ago < 10s grace
      prisma.userRefreshToken.findUnique.mockResolvedValue(
        buildRow({
          isRevoked: true,
          revokedAt 
        }),
      );

      await expect(service.refreshTokens(validToken, CLIENT_INFO)).rejects.toThrow('Invalid session');
      expect(prisma.userRefreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('throws "Session expired" when token has expired', async () => {
      prisma.userRefreshToken.findUnique.mockResolvedValue(
        buildRow({ expiresAt: new Date(Date.now() - 1_000) }),
      );
      await expect(service.refreshTokens(validToken, CLIENT_INFO)).rejects.toThrow('Session expired');
    });

    it('rotates tokens and returns new token pair on valid token', async () => {
      prisma.userRefreshToken.findUnique.mockResolvedValue(buildRow());

      const result = await service.refreshTokens(validToken, CLIENT_INFO);

      expect(result).toMatchObject({ accessToken: 'signed-jwt' });
      expect(typeof result.refreshToken).toBe('string');
      // Old token must be revoked
      expect(prisma.userRefreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isRevoked: true }) }),
      );
      // New token record must be created
      expect(prisma.userRefreshToken.create).toHaveBeenCalledTimes(1);
    });

    it('signs the JWT with the correct sub, email, and fullName', async () => {
      prisma.userRefreshToken.findUnique.mockResolvedValue(buildRow());
      await service.refreshTokens(validToken, CLIENT_INFO);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: MOCK_USER.id,
        email: MOCK_USER.email,
        fullName: MOCK_USER.fullName,
      });
    });

    it('omits fullName from JWT when user has no fullName', async () => {
      const userWithoutName = {
        ...MOCK_USER,
        fullName: null 
      };
      prisma.userRefreshToken.findUnique.mockResolvedValue(
        buildRow({ user: userWithoutName }),
      );
      await service.refreshTokens(validToken, CLIENT_INFO);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: userWithoutName.id,
        email: userWithoutName.email,
      });
      const signArg = (jwtService.sign as jest.Mock).mock.calls[0][0];
      expect(signArg).not.toHaveProperty('fullName');
    });
  });
});
