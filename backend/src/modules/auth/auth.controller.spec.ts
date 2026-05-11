import { AuthController } from '@modules/auth/auth.controller';
import { AuthService } from '@modules/auth/auth.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';

const CLIENT_INFO = {
  deviceInfo: 'TestAgent/1.0',
  ipAddress: '127.0.0.1' 
};
const TOKEN_RESPONSE = {
  accessToken: 'signed-jwt',
  refreshToken: 'refresh-uuid' 
};
const MOCK_USER = {
  id: 'user-uuid',
  email: 'alice@example.com' 
} as any;

function buildRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {
      'user-agent': CLIENT_INFO.deviceInfo,
      'x-real-ip': CLIENT_INFO.ipAddress 
    },
    ip: CLIENT_INFO.ipAddress,
    user: MOCK_USER,
    ...overrides,
  } as unknown as Request;
}

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshTokens: jest.fn(),
            loginWithGoogle: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    configService = module.get(ConfigService);
  });

  // ──────────────── POST /auth/register ────────────────
  describe('register()', () => {
    const registrationData = {
      email: 'alice@example.com',
      password: 'password123',
      fullName: 'Alice' 
    } as any;

    it('delegates to authService.register with client info', async () => {
      authService.register.mockResolvedValue(TOKEN_RESPONSE);
      const req = buildRequest();
      await controller.register(req, registrationData);
      expect(authService.register).toHaveBeenCalledWith(registrationData, CLIENT_INFO);
    });

    it('returns the token response', async () => {
      authService.register.mockResolvedValue(TOKEN_RESPONSE);
      const result = await controller.register(buildRequest(), registrationData);
      expect(result).toBe(TOKEN_RESPONSE);
    });
  });

  // ──────────────── POST /auth/login ────────────────
  describe('login()', () => {
    const loginData = {
      email: 'alice@example.com',
      password: 'password123' 
    } as any;

    it('delegates to authService.login with req.user and client info', async () => {
      authService.login.mockResolvedValue(TOKEN_RESPONSE);
      const req = buildRequest({ user: MOCK_USER });
      await controller.login(req, loginData);
      expect(authService.login).toHaveBeenCalledWith(MOCK_USER, CLIENT_INFO);
    });

    it('returns the token response', async () => {
      authService.login.mockResolvedValue(TOKEN_RESPONSE);
      const result = await controller.login(buildRequest(), loginData);
      expect(result).toBe(TOKEN_RESPONSE);
    });
  });

  // ──────────────── POST /auth/refresh ────────────────
  describe('refresh()', () => {
    const refreshData = { refreshToken: 'refresh-uuid' } as any;

    it('delegates to authService.refreshTokens with token and client info', async () => {
      authService.refreshTokens.mockResolvedValue(TOKEN_RESPONSE);
      await controller.refresh(buildRequest(), refreshData);
      expect(authService.refreshTokens).toHaveBeenCalledWith('refresh-uuid', CLIENT_INFO);
    });

    it('returns the new token response', async () => {
      authService.refreshTokens.mockResolvedValue(TOKEN_RESPONSE);
      const result = await controller.refresh(buildRequest(), refreshData);
      expect(result).toBe(TOKEN_RESPONSE);
    });
  });

  // ──────────────── GET /auth/google ────────────────
  describe('googleAuth()', () => {
    it('returns undefined (guard handles the redirect)', () => {
      expect(controller.googleAuth()).toBeUndefined();
    });
  });

  // ──────────────── GET /auth/google/callback ────────────────
  describe('googleCallback()', () => {
    it('redirects to frontendUrl with tokens as query params', async () => {
      authService.loginWithGoogle.mockResolvedValue(TOKEN_RESPONSE);
      configService.getOrThrow.mockReturnValue('https://app.example.com');

      const redirectMock = jest.fn();
      const res = { redirect: redirectMock } as unknown as Response;
      const req = buildRequest({ user: MOCK_USER });

      await controller.googleCallback(req, res);

      expect(redirectMock).toHaveBeenCalledWith(
        'https://app.example.com/auth/callback?access_token=signed-jwt&refresh_token=refresh-uuid',
      );
    });
  });

  // ──────────────── GET /auth/me ────────────────
  describe('me()', () => {
    it('returns req.user', () => {
      const jwtUser = {
        userId: 'user-uuid',
        email: 'alice@example.com' 
      };
      const req = buildRequest({ user: jwtUser });
      const result = controller.me(req);
      expect(result).toBe(jwtUser);
    });
  });
});
