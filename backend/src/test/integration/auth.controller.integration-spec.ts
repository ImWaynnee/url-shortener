import { createHash, randomUUID } from 'node:crypto';

import { issueAccessToken } from '@src/test/helpers/auth.helper';
import type { TestApp } from '@src/test/helpers/create-test-app';
import { createTestApp } from '@src/test/helpers/create-test-app';
import { truncateAll } from '@src/test/helpers/db-cleaner';
import * as bcrypt from 'bcrypt';

describe('AuthController', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  beforeEach(async () => {
    await truncateAll(t.prisma);
  });

  // ─── helpers ────────────────────────────────────────────────────────────────

  async function seedLocalUser(opts: {
    email?: string;
    password?: string;
    fullName?: string | null;
  } = {}) {
    const suffix = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const email = opts.email ?? `test-${suffix}@example.com`;
    const password = opts.password ?? 'Password123!';
    const hash = await bcrypt.hash(password, 10);
    const user = await t.prisma.user.create({
      data: {
        email,
        fullName: opts.fullName ?? null,
        lastLoginAt: new Date(),
        lastLoginProvider: 'local',
        authProviders: {
          create: {
            provider: 'local',
            secret: hash 
          }
        }
      }
    });
    return {
      user,
      email,
      password 
    };
  }

  async function seedRefreshToken(
    userId: string,
    opts: { expiresAt?: Date;
      isRevoked?: boolean;
      revokedAt?: Date | null } = {}
  ): Promise<string> {
    const token = randomUUID();
    const tokenHash = createHash('sha256')
      .update(token)
      .digest('hex');
    await t.prisma.userRefreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: opts.expiresAt ?? new Date(Date.now() + 7 * 24 * 3600_000),
        isRevoked: opts.isRevoked ?? false,
        revokedAt: opts.revokedAt ?? null,
        deviceInfo: 'test-agent',
        ipAddress: '127.0.0.1'
      }
    });
    return token;
  }

  // ─── POST /auth/register ─────────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    describe('happy path', () => {
      it('email + password → 201 with token pair', async () => {
        const res = await t.request
          .post('/auth/register')
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({
            email: 'alice@example.com',
            password: 'Password123!' 
          });

        expect(res.status).toBe(201);
        expect(typeof res.body.accessToken).toBe('string');
        expect(typeof res.body.refreshToken).toBe('string');
      });

      it('persists user row with fullName, lastLoginAt, lastLoginProvider', async () => {
        await t.request
          .post('/auth/register')
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({
            email: 'alice@example.com',
            password: 'Password123!',
            fullName: 'Alice' 
          });

        const user = await t.prisma.user.findUniqueOrThrow({ where: { email: 'alice@example.com' } });
        expect(user.fullName).toBe('Alice');
        expect(user.lastLoginProvider).toBe('local');
        expect(user.lastLoginAt).not.toBeNull();
      });

      it('omits fullName from user row when not provided', async () => {
        await t.request
          .post('/auth/register')
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({
            email: 'alice@example.com',
            password: 'Password123!' 
          });

        const user = await t.prisma.user.findUniqueOrThrow({ where: { email: 'alice@example.com' } });
        expect(user.fullName).toBeNull();
      });

      it('creates local auth provider row with bcrypt-hashed secret', async () => {
        await t.request
          .post('/auth/register')
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({
            email: 'alice@example.com',
            password: 'Password123!' 
          });

        const user = await t.prisma.user.findUniqueOrThrow({ where: { email: 'alice@example.com' } });
        const provider = await t.prisma.userAuthProvider.findFirst({
          where: {
            userId: user.id,
            provider: 'local' 
          }
        });

        expect(provider).not.toBeNull();
        expect(provider!.providerUserId).toBeNull();
        expect(await bcrypt.compare('Password123!', provider!.secret!)).toBe(true);
      });

      it('persists refresh token row with correct hash and metadata', async () => {
        const res = await t.request
          .post('/auth/register')
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({
            email: 'alice@example.com',
            password: 'Password123!' 
          });

        const expectedHash = createHash('sha256')
          .update(res.body.refreshToken)
          .digest('hex');
        const row = await t.prisma.userRefreshToken.findUnique({ where: { tokenHash: expectedHash } });

        expect(row).not.toBeNull();
        expect(row!.isRevoked).toBe(false);
        expect(row!.expiresAt.getTime()).toBeGreaterThan(Date.now());
        expect(row!.deviceInfo).toBe('test-agent');
      });
    });

    describe('conflict → 409', () => {
      it('duplicate email returns 409', async () => {
        await t.request.post('/auth/register')
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({
            email: 'dup@example.com',
            password: 'Password123!' 
          });
        const res = await t.request.post('/auth/register')
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({
            email: 'dup@example.com',
            password: 'Different1!' 
          });

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/account already exists/i);
      });
    });

    describe('validation → 400', () => {
      const cases: Array<[string, object]> = [
        ['missing email', { password: 'Password123!' }],
        ['invalid email format', {
          email: 'not-an-email',
          password: 'Password123!' 
        }],
        ['email > 254 chars', {
          email: `${'a'.repeat(250)}@e.com`,
          password: 'Password123!' 
        }],
        ['missing password', { email: 'v@example.com' }],
        ['password < 8 chars', {
          email: 'v@example.com',
          password: 'short7!' 
        }],
        ['password > 72 chars', {
          email: 'v@example.com',
          password: 'a'.repeat(73) 
        }],
        ['fullName empty string', {
          email: 'v@example.com',
          password: 'Password123!',
          fullName: '' 
        }],
        ['fullName > 100 chars', {
          email: 'v@example.com',
          password: 'Password123!',
          fullName: 'a'.repeat(101) 
        }],
        ['unknown field rejected', {
          email: 'v@example.com',
          password: 'Password123!',
          extra: 'x' 
        }]
      ];

      it.each(cases)('%s → 400', async (_, body) => {
        const res = await t.request.post('/auth/register')
          .set('X-Real-IP', '1.2.3.4')
          .set('User-Agent', 'test-agent')
          .send(body);
        expect(res.status).toBe(400);
      });
    });
  });

  // ─── POST /auth/login ────────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    describe('happy path', () => {
      it('correct credentials → 201 with token pair', async () => {
        const { email, password } = await seedLocalUser();
        const res = await t.request.post('/auth/login')
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({
            email,
            password 
          });

        expect(res.status).toBe(201);
        expect(typeof res.body.accessToken).toBe('string');
        expect(typeof res.body.refreshToken).toBe('string');
      });

      it('creates a new refresh token row in DB', async () => {
        const { user, email, password } = await seedLocalUser();
        const before = await t.prisma.userRefreshToken.count({ where: { userId: user.id } });

        await t.request.post('/auth/login')
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({
            email,
            password 
          });

        const after = await t.prisma.userRefreshToken.count({ where: { userId: user.id } });
        expect(after).toBe(before + 1);
      });

      it('updates lastLoginAt and sets lastLoginProvider to "local"', async () => {
        const { user, email, password } = await seedLocalUser();
        const originalLoginAt = user.lastLoginAt!.getTime();

        await new Promise(r => setTimeout(r, 10));
        await t.request.post('/auth/login')
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({
            email,
            password 
          });

        const updated = await t.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
        expect(updated.lastLoginProvider).toBe('local');
        expect(updated.lastLoginAt!.getTime()).toBeGreaterThan(originalLoginAt);
      });
    });

    describe('auth → 401', () => {
      it('wrong password → 401', async () => {
        const { email } = await seedLocalUser({ password: 'CorrectPass1!' });
        const res = await t.request.post('/auth/login')
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({
            email,
            password: 'WrongPass1!' 
          });
        expect(res.status).toBe(401);
      });

      it('non-existent email → 401', async () => {
        const res = await t.request
          .post('/auth/login')
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')  
          .send({
            email: 'nobody@example.com',
            password: 'Password123!' 
          });
        expect(res.status).toBe(401);
      });

      it('google-only account (no local auth provider) → 401', async () => {
        await t.prisma.user.create({
          data: {
            email: 'googleonly@example.com',
            authProviders: {
              create: {
                provider: 'google',
                providerUserId: 'gid-123',
                secret: null 
              }
            }
          }
        });
        const res = await t.request
          .post('/auth/login') 
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({
            email: 'googleonly@example.com',
            password: 'anything' 
          });
        expect(res.status).toBe(401);
      });
    });

    describe('validation → 400', () => {
      const cases: Array<[string, object]> = [
        ['missing email', { password: 'Password123!' }],
        ['invalid email format', {
          email: 'not-an-email',
          password: 'Password123!' 
        }],
        ['email > 254 chars', {
          email: `${'a'.repeat(250)}@e.com`,
          password: 'Password123!' 
        }],
        ['missing password', { email: 'v@example.com' }],
        ['empty password', {
          email: 'v@example.com',
          password: '' 
        }],
        ['password > 72 chars', {
          email: 'v@example.com',
          password: 'a'.repeat(73) 
        }],
        ['unknown field rejected', {
          email: 'v@example.com',
          password: 'Password123!',
          extra: 'x' 
        }]
      ];

      it.each(cases)('%s → 400', async (_, body) => {
        const res = await t.request.post('/auth/login')
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send(body);
        expect(res.status).toBe(400);
      });
    });
  });

  // ─── POST /auth/refresh ──────────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    describe('happy path', () => {
      it('valid token → 201 with a new token pair', async () => {
        const { email, password } = await seedLocalUser();
        const { body: { refreshToken } } = await t.request.post('/auth/login')
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({
            email,
            password 
          });

        const res = await t.request.post('/auth/refresh')
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({ refreshToken });

        expect(res.status).toBe(201);
        expect(typeof res.body.accessToken).toBe('string');
        expect(typeof res.body.refreshToken).toBe('string');
        expect(res.body.refreshToken).not.toBe(refreshToken);
      });

      it('old token is revoked in DB after rotation', async () => {
        const { email, password } = await seedLocalUser();
        const { body: { refreshToken } } = await t.request.post('/auth/login')
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({
            email,
            password 
          });
        const oldHash = createHash('sha256')
          .update(refreshToken)
          .digest('hex');

        await t.request.post('/auth/refresh')
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({ refreshToken });

        const old = await t.prisma.userRefreshToken.findUniqueOrThrow({ where: { tokenHash: oldHash } });
        expect(old.isRevoked).toBe(true);
        expect(old.revokedAt).not.toBeNull();
      });

      it('new token row persisted with correct hash and userId', async () => {
        const { user, email, password } = await seedLocalUser();
        const { body: { refreshToken } } = await t.request.post('/auth/login')
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({
            email,
            password 
          });

        const { body: { refreshToken: newToken } } = await t.request.post('/auth/refresh')
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({ refreshToken });
        const newHash = createHash('sha256')
          .update(newToken)
          .digest('hex');

        const row = await t.prisma.userRefreshToken.findUnique({ where: { tokenHash: newHash } });
        expect(row).not.toBeNull();
        expect(row!.isRevoked).toBe(false);
        expect(row!.userId).toBe(user.id);
      });
    });

    describe('token reuse detection', () => {
      it('reuse within grace period → 401 "Invalid session", active sessions preserved', async () => {
        const { user, email, password } = await seedLocalUser();
        const { body: { refreshToken } } = await t.request.post('/auth/login')
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({
            email,
            password 
          });

        // First refresh rotates the old token; revokedAt is just now (within grace)
        await t.request.post('/auth/refresh') 
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({ refreshToken });

        // Re-submit the already-rotated token immediately
        const res = await t.request.post('/auth/refresh') 
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({ refreshToken });
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/invalid session/i);

        // The session created by the first refresh must still be alive
        const activeCount = await t.prisma.userRefreshToken.count({
          where: {
            userId: user.id,
            isRevoked: false 
          }
        });
        expect(activeCount).toBeGreaterThan(0);
      });

      it('reuse outside grace period → 401 "Token already used", all sessions revoked', async () => {
        const { user } = await seedLocalUser();

        // Seed an old token already revoked 15 s ago (outside the 10 s grace window)
        const oldToken = await seedRefreshToken(user.id, {
          isRevoked: true,
          revokedAt: new Date(Date.now() - 15_000)
        });

        // Seed a second active session to verify cascade revocation
        await seedRefreshToken(user.id);

        const res = await t.request.post('/auth/refresh') 
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({ refreshToken: oldToken });
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/token already used/i);

        const activeCount = await t.prisma.userRefreshToken.count({
          where: {
            userId: user.id,
            isRevoked: false 
          }
        });
        expect(activeCount).toBe(0);
      });
    });

    describe('auth → 401', () => {
      it('token not in DB → "Invalid session"', async () => {
        const res = await t.request.post('/auth/refresh') 
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({ refreshToken: randomUUID() });
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/invalid session/i);
      });

      it('expired token → "Session expired"', async () => {
        const { user } = await seedLocalUser();
        const expiredToken = await seedRefreshToken(user.id, {
          expiresAt: new Date(Date.now() - 1_000)
        });

        const res = await t.request.post('/auth/refresh') 
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send({ refreshToken: expiredToken });
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/session expired/i);
      });
    });

    describe('validation → 400', () => {
      const cases: Array<[string, object]> = [
        ['missing refreshToken', {}],
        ['non-UUID string', { refreshToken: 'not-a-uuid' }],
        ['UUID v1 (not v4)', { refreshToken: 'd290f1ee-6c54-11e8-9caf-6bf58cf7beae' }],
        ['unknown field rejected', {
          refreshToken: randomUUID(),
          extra: 'x' 
        }]
      ];

      it.each(cases)('%s → 400', async (_, body) => {
        const res = await t.request.post('/auth/refresh') 
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .send(body);
        expect(res.status).toBe(400);
      });
    });
  });

  // ─── GET /auth/me ────────────────────────────────────────────────────────────

  describe('GET /auth/me', () => {
    describe('happy path', () => {
      it('valid token → 200 with userId, email, fullName', async () => {
        const { user } = await seedLocalUser({ fullName: 'Alice' });
        const token = issueAccessToken(t.jwtService, user);

        const res = await t.request.get('/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
          userId: user.id,
          email: user.email,
          fullName: 'Alice' 
        });
      });

      it('user without fullName omits the field from response', async () => {
        const { user } = await seedLocalUser({ fullName: null });
        const token = issueAccessToken(t.jwtService, user);

        const res = await t.request.get('/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.fullName).toBeUndefined();
      });
    });

    describe('auth → 401', () => {
      it('no Authorization header → 401', async () => {
        expect((await t.request.get('/auth/me')).status).toBe(401);
      });

      it('malformed token → 401', async () => {
        expect(
          (await t.request.get('/auth/me')
            .set('Authorization', 'Bearer garbage')).status
        ).toBe(401);
      });

      it('expired JWT → 401', async () => {
        const user = await t.prisma.user.create({ data: { email: 'exp@example.com' } });
        const expiredToken = t.jwtService.sign({
          sub: user.id,
          email: user.email,
          exp: Math.floor(Date.now() / 1000) - 10
        });

        expect(
          (await t.request.get('/auth/me')
            .set('Authorization', `Bearer ${expiredToken}`)).status
        ).toBe(401);
      });
    });
  });
});
