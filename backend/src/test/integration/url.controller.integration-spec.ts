import { createTestUser, issueAccessToken } from '@src/test/helpers/auth.helper';
import type { TestApp } from '@src/test/helpers/create-test-app';
import { createTestApp } from '@src/test/helpers/create-test-app';
import { truncateAll } from '@src/test/helpers/db-cleaner';

// Seeded by migration; truncateAll removes it so we re-insert before every test.
const ANON_USER_ID = '00000000-0000-0000-0000-000000000001';
const FRONTEND_URL = 'http://localhost:7777';

describe('UrlController', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  beforeEach(async () => {
    await truncateAll(t.prisma);
    await t.prisma.user.create({
      data: {
        id: ANON_USER_ID,
        email: 'default@wyzwyz.xyz',
        fullName: 'Default User' 
      }
    });
  });

  // ─── helpers ────────────────────────────────────────────────────────────────

  let _codeSeq = 0;
  const nextCode = () => `tc${String(++_codeSeq).padStart(5, '0')}`;

  async function seedUrl(opts: {
    userId: string;
    destinationUrl?: string;
    shortUrl?: string;
    isActive?: boolean;
    expiresAt?: Date | null;
    comments?: string | null;
  }) {
    const shortUrl = opts.shortUrl ?? nextCode();
    const url = await t.prisma.url.create({
      data: {
        shortUrl,
        createdById: opts.userId,
        isActive: opts.isActive ?? true,
        expiresAt: opts.expiresAt ?? null,
        comments: opts.comments ?? null
      }
    });
    const destination = await t.prisma.urlDestination.create({
      data: {
        urlId: url.id,
        destinationUrl: opts.destinationUrl ?? 'https://example.com' 
      }
    });
    await t.prisma.urlStat.create({
      data: {
        urlId: url.id,
        totalClicks: 0 
      } 
    });
    return {
      url,
      destination 
    };
  }

  // ─── POST /urls/shorten ─────────────────────────────────────────────────────

  describe('POST /urls/shorten', () => {
    describe('happy path', () => {
      it('anonymous user — 201 with correct shape and DB rows', async () => {
        const res = await t.request
          .post('/urls/shorten')
          .send({ url: 'https://example.com' });

        expect(res.status).toBe(201);
        expect(res.body.shortUrl).toHaveLength(7);
        expect(res.body.destinationUrl).toBe('https://example.com');
        expect(res.body.newUrl).toContain(res.body.shortUrl);

        const url = await t.prisma.url.findUnique({ where: { shortUrl: res.body.shortUrl } });
        expect(url).not.toBeNull();
        expect(url!.createdById).toBe(ANON_USER_ID);

        const dest = await t.prisma.urlDestination.findFirst({ where: { urlId: url!.id } });
        expect(dest!.destinationUrl).toBe('https://example.com');

        const stat = await t.prisma.urlStat.findFirst({ where: { urlId: url!.id } });
        expect(stat!.totalClicks).toBe(0);
      });

      it('authenticated user — URL linked to their account', async () => {
        const user = await createTestUser(t.prisma);
        const token = issueAccessToken(t.jwtService, user);

        const res = await t.request
          .post('/urls/shorten')
          .set('Authorization', `Bearer ${token}`)
          .send({ url: 'https://example.com' });

        expect(res.status).toBe(201);

        const url = await t.prisma.url.findUnique({ where: { shortUrl: res.body.shortUrl } });
        expect(url!.createdById).toBe(user.id);
      });

      it('URL without protocol is accepted (require_protocol: false)', async () => {
        const res = await t.request
          .post('/urls/shorten')
          .send({ url: 'example.com' });

        expect(res.status).toBe(201);
      });
    });

    describe('validation → 400', () => {
      it('missing url field', async () => {
        const res = await t.request.post('/urls/shorten').send({});
        expect(res.status).toBe(400);
      });

      it('empty url string', async () => {
        const res = await t.request.post('/urls/shorten').send({ url: '' });
        expect(res.status).toBe(400);
      });

      it('url is null', async () => {
        const res = await t.request.post('/urls/shorten').send({ url: null });
        expect(res.status).toBe(400);
      });

      it('non-URL string', async () => {
        const res = await t.request.post('/urls/shorten').send({ url: 'not a url' });
        expect(res.status).toBe(400);
      });

      it('extra unknown field (forbidNonWhitelisted)', async () => {
        const res = await t.request
          .post('/urls/shorten')
          .send({
            url: 'https://example.com',
            extra: 'field' 
          });
        expect(res.status).toBe(400);
      });
    });
  });

  // ─── GET /urls ──────────────────────────────────────────────────────────────

  describe('GET /urls', () => {
    it('returns empty list when user has no URLs', async () => {
      const user = await createTestUser(t.prisma);
      const token = issueAccessToken(t.jwtService, user);

      const res = await t.request
        .get('/urls')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20 
      });
    });

    it('returns own URLs with correct shape, newest first', async () => {
      const user = await createTestUser(t.prisma);
      const token = issueAccessToken(t.jwtService, user);

      const { url: older } = await seedUrl({
        userId: user.id,
        destinationUrl: 'https://older.com' 
      });
      await new Promise(r => setTimeout(r, 10)); // ensure distinct createdAt
      const { url: newer } = await seedUrl({
        userId: user.id,
        destinationUrl: 'https://newer.com' 
      });

      const res = await t.request.get('/urls').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.items[0].id).toBe(newer.id.toString());
      expect(res.body.items[1].id).toBe(older.id.toString());
    });

    it('does not return other users URLs (isolation)', async () => {
      const userA = await createTestUser(t.prisma);
      const userB = await createTestUser(t.prisma);
      await seedUrl({ userId: userA.id });

      const res = await t.request
        .get('/urls')
        .set('Authorization', `Bearer ${issueAccessToken(t.jwtService, userB)}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
    });

    it('search filters across destinationUrl, shortUrl and comments', async () => {
      const user = await createTestUser(t.prisma);
      const token = issueAccessToken(t.jwtService, user);

      await seedUrl({
        userId: user.id,
        destinationUrl: 'https://findme.com/path' 
      });
      await seedUrl({
        userId: user.id,
        shortUrl: 'findme1',
        destinationUrl: 'https://other.com' 
      });
      await seedUrl({
        userId: user.id,
        destinationUrl: 'https://other.com',
        comments: 'findme note' 
      });
      await seedUrl({
        userId: user.id,
        destinationUrl: 'https://unrelated.com' 
      });

      const res = await t.request
        .get('/urls?search=findme')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(3);
    });

    it('search is case-insensitive', async () => {
      const user = await createTestUser(t.prisma);
      const token = issueAccessToken(t.jwtService, user);
      await seedUrl({
        userId: user.id,
        destinationUrl: 'https://UPPERCASE.com' 
      });

      const res = await t.request
        .get('/urls?search=uppercase')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.total).toBe(1);
    });

    it('?isActive=true returns only active URLs', async () => {
      const user = await createTestUser(t.prisma);
      const token = issueAccessToken(t.jwtService, user);
      await seedUrl({
        userId: user.id,
        isActive: true 
      });
      await seedUrl({
        userId: user.id,
        isActive: false 
      });

      const res = await t.request
        .get('/urls?isActive=true')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.items.every((u: { isActive: boolean }) => u.isActive)).toBe(true);
      expect(res.body.total).toBe(1);
    });

    it('?isActive=false returns only inactive URLs', async () => {
      const user = await createTestUser(t.prisma);
      const token = issueAccessToken(t.jwtService, user);
      await seedUrl({
        userId: user.id,
        isActive: true 
      });
      await seedUrl({
        userId: user.id,
        isActive: false 
      });

      const res = await t.request
        .get('/urls?isActive=false')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.items.every((u: { isActive: boolean }) => !u.isActive)).toBe(true);
      expect(res.body.total).toBe(1);
    });

    it('?isExpired=true returns only past-expiry URLs', async () => {
      const user = await createTestUser(t.prisma);
      const token = issueAccessToken(t.jwtService, user);
      const yesterday = new Date(Date.now() - 86_400_000);
      const tomorrow = new Date(Date.now() + 86_400_000);
      await seedUrl({
        userId: user.id,
        expiresAt: yesterday 
      }); // expired
      await seedUrl({
        userId: user.id,
        expiresAt: tomorrow 
      }); // not expired
      await seedUrl({
        userId: user.id,
        expiresAt: null 
      }); // no expiry

      const res = await t.request
        .get('/urls?isExpired=true')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.total).toBe(1);
    });

    it('?isExpired=false returns URLs with no expiry or future expiry', async () => {
      const user = await createTestUser(t.prisma);
      const token = issueAccessToken(t.jwtService, user);
      const yesterday = new Date(Date.now() - 86_400_000);
      const tomorrow = new Date(Date.now() + 86_400_000);
      await seedUrl({
        userId: user.id,
        expiresAt: yesterday 
      }); // expired — excluded
      await seedUrl({
        userId: user.id,
        expiresAt: tomorrow 
      }); // included
      await seedUrl({
        userId: user.id,
        expiresAt: null 
      }); // included

      const res = await t.request
        .get('/urls?isExpired=false')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.total).toBe(2);
    });

    it('pagination slices correctly', async () => {
      const user = await createTestUser(t.prisma);
      const token = issueAccessToken(t.jwtService, user);
      for (let i = 0; i < 3; i++) await seedUrl({ userId: user.id });

      const page1 = await t.request
        .get('/urls?page=1&pageSize=2')
        .set('Authorization', `Bearer ${token}`);
      expect(page1.body.items).toHaveLength(2);
      expect(page1.body.total).toBe(3);

      const page2 = await t.request
        .get('/urls?page=2&pageSize=2')
        .set('Authorization', `Bearer ${token}`);
      expect(page2.body.items).toHaveLength(1);
    });

    describe('auth → 401', () => {
      it('no token', async () => {
        expect((await t.request.get('/urls')).status).toBe(401);
      });
      it('invalid token', async () => {
        expect(
          (await t.request.get('/urls').set('Authorization', 'Bearer bad')).status
        ).toBe(401);
      });
    });

    describe('validation → 400', () => {
      let token: string;
      beforeEach(async () => {
        const user = await createTestUser(t.prisma);
        token = issueAccessToken(t.jwtService, user);
      });

      it('page=0', async () => {
        expect((await t.request.get('/urls?page=0').set('Authorization', `Bearer ${token}`)).status).toBe(400);
      });
      it('page=-1', async () => {
        expect((await t.request.get('/urls?page=-1').set('Authorization', `Bearer ${token}`)).status).toBe(400);
      });
      it('pageSize=0', async () => {
        expect((await t.request.get('/urls?pageSize=0').set('Authorization', `Bearer ${token}`)).status).toBe(400);
      });
      it('pageSize=101', async () => {
        expect((await t.request.get('/urls?pageSize=101').set('Authorization', `Bearer ${token}`)).status).toBe(400);
      });
      it('pageSize=abc', async () => {
        expect((await t.request.get('/urls?pageSize=abc').set('Authorization', `Bearer ${token}`)).status).toBe(400);
      });
      it('search longer than 200 chars', async () => {
        const long = 'a'.repeat(201);
        expect((await t.request.get(`/urls?search=${long}`).set('Authorization', `Bearer ${token}`)).status).toBe(400);
      });
      it('isActive not a boolean string', async () => {
        expect((await t.request.get('/urls?isActive=maybe').set('Authorization', `Bearer ${token}`)).status).toBe(400);
      });
    });
  });

  // ─── PATCH /urls/:id ────────────────────────────────────────────────────────

  describe('PATCH /urls/:id', () => {
    describe('happy path', () => {
      it('toggles isActive off and DB reflects it', async () => {
        const user = await createTestUser(t.prisma);
        const token = issueAccessToken(t.jwtService, user);
        const { url } = await seedUrl({
          userId: user.id,
          isActive: true 
        });

        const res = await t.request
          .patch(`/urls/${url.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ isActive: false });

        expect(res.status).toBe(200);
        expect(res.body.isActive).toBe(false);
        const row = await t.prisma.url.findUnique({ where: { id: url.id } });
        expect(row!.isActive).toBe(false);
      });

      it('toggles isActive on', async () => {
        const user = await createTestUser(t.prisma);
        const token = issueAccessToken(t.jwtService, user);
        const { url } = await seedUrl({
          userId: user.id,
          isActive: false 
        });

        const res = await t.request
          .patch(`/urls/${url.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ isActive: true });

        expect(res.status).toBe(200);
        const row = await t.prisma.url.findUnique({ where: { id: url.id } });
        expect(row!.isActive).toBe(true);
      });

      it('sets comments', async () => {
        const user = await createTestUser(t.prisma);
        const token = issueAccessToken(t.jwtService, user);
        const { url } = await seedUrl({ userId: user.id });

        const res = await t.request
          .patch(`/urls/${url.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ comments: 'my note' });

        expect(res.status).toBe(200);
        const row = await t.prisma.url.findUnique({ where: { id: url.id } });
        expect(row!.comments).toBe('my note');
      });

      it('clears comments with null', async () => {
        const user = await createTestUser(t.prisma);
        const token = issueAccessToken(t.jwtService, user);
        const { url } = await seedUrl({
          userId: user.id,
          comments: 'existing' 
        });

        const res = await t.request
          .patch(`/urls/${url.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ comments: null });

        expect(res.status).toBe(200);
        const row = await t.prisma.url.findUnique({ where: { id: url.id } });
        expect(row!.comments).toBeNull();
      });

      it('updates destinationUrl — creates new destination row, keeps old one', async () => {
        const user = await createTestUser(t.prisma);
        const token = issueAccessToken(t.jwtService, user);
        const { url } = await seedUrl({
          userId: user.id,
          destinationUrl: 'https://old.com' 
        });

        const res = await t.request
          .patch(`/urls/${url.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ destinationUrl: 'https://new.com' });

        expect(res.status).toBe(200);
        expect(res.body.destinationUrl).toBe('https://new.com');

        const allDests = await t.prisma.urlDestination.findMany({ where: { urlId: url.id } });
        expect(allDests).toHaveLength(2);
        expect(allDests.some(d => d.destinationUrl === 'https://old.com')).toBe(true);
        expect(allDests.some(d => d.destinationUrl === 'https://new.com')).toBe(true);
      });

      it('sets expiresAt', async () => {
        const user = await createTestUser(t.prisma);
        const token = issueAccessToken(t.jwtService, user);
        const { url } = await seedUrl({ userId: user.id });
        const future = '2030-06-15T10:00:00.000Z';

        const res = await t.request
          .patch(`/urls/${url.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ expiresAt: future });

        expect(res.status).toBe(200);
        const row = await t.prisma.url.findUnique({ where: { id: url.id } });
        expect(row!.expiresAt?.toISOString()).toBe(future);
      });

      it('clears expiresAt with null', async () => {
        const user = await createTestUser(t.prisma);
        const token = issueAccessToken(t.jwtService, user);
        const { url } = await seedUrl({
          userId: user.id,
          expiresAt: new Date('2025-01-01') 
        });

        const res = await t.request
          .patch(`/urls/${url.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ expiresAt: null });

        expect(res.status).toBe(200);
        const row = await t.prisma.url.findUnique({ where: { id: url.id } });
        expect(row!.expiresAt).toBeNull();
      });

      it('empty body — 200 and URL unchanged', async () => {
        const user = await createTestUser(t.prisma);
        const token = issueAccessToken(t.jwtService, user);
        const { url } = await seedUrl({ userId: user.id });

        const res = await t.request
          .patch(`/urls/${url.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({});

        expect(res.status).toBe(200);
      });

      it('multiple fields updated in one request', async () => {
        const user = await createTestUser(t.prisma);
        const token = issueAccessToken(t.jwtService, user);
        const { url } = await seedUrl({ userId: user.id });

        const res = await t.request
          .patch(`/urls/${url.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            isActive: false,
            comments: 'batch',
            destinationUrl: 'https://batch.com' 
          });

        expect(res.status).toBe(200);
        const row = await t.prisma.url.findUnique({ where: { id: url.id } });
        expect(row!.isActive).toBe(false);
        expect(row!.comments).toBe('batch');
      });
    });

    describe('cache invalidation (observable)', () => {
      it('redirect reflects new destinationUrl after update', async () => {
        const user = await createTestUser(t.prisma);
        const token = issueAccessToken(t.jwtService, user);
        const shortUrl = nextCode();
        const { url } = await seedUrl({
          userId: user.id,
          shortUrl,
          destinationUrl: 'https://old.com' 
        });

        // Prime cache
        await t.request.get(`/${shortUrl}`).redirects(0);

        await t.request
          .patch(`/urls/${url.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ destinationUrl: 'https://new.com' });

        const res = await t.request.get(`/${shortUrl}`).redirects(0);
        expect(res.headers.location).toBe('https://new.com');
      });

      it('redirect goes to missing-link after isActive set to false', async () => {
        const user = await createTestUser(t.prisma);
        const token = issueAccessToken(t.jwtService, user);
        const shortUrl = nextCode();
        const { url } = await seedUrl({
          userId: user.id,
          shortUrl 
        });

        await t.request.get(`/${shortUrl}`).redirects(0); // prime cache

        await t.request
          .patch(`/urls/${url.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ isActive: false });

        const res = await t.request.get(`/${shortUrl}`).redirects(0);
        expect(res.headers.location).toContain('/missing-link');
        expect(res.headers.location).toContain('reason=disabled');
      });
    });

    describe('auth / authorization', () => {
      it('no token → 401', async () => {
        const { url } = await seedUrl({ userId: ANON_USER_ID });
        expect((await t.request.patch(`/urls/${url.id}`).send({})).status).toBe(401);
      });

      it('other user URL → 403', async () => {
        const owner = await createTestUser(t.prisma);
        const other = await createTestUser(t.prisma);
        const { url } = await seedUrl({ userId: owner.id });

        const res = await t.request
          .patch(`/urls/${url.id}`)
          .set('Authorization', `Bearer ${issueAccessToken(t.jwtService, other)}`)
          .send({ isActive: false });

        expect(res.status).toBe(403);
      });

      it('non-existent id → 404', async () => {
        const user = await createTestUser(t.prisma);
        const res = await t.request
          .patch('/urls/999999999')
          .set('Authorization', `Bearer ${issueAccessToken(t.jwtService, user)}`)
          .send({ isActive: false });
        expect(res.status).toBe(404);
      });
    });

    describe('validation → 400', () => {
      let token: string;
      let urlId: string;

      beforeEach(async () => {
        const user = await createTestUser(t.prisma);
        token = issueAccessToken(t.jwtService, user);
        const { url } = await seedUrl({ userId: user.id });
        urlId = url.id.toString();
      });

      it('destinationUrl without protocol (require_protocol: true)', async () => {
        const res = await t.request
          .patch(`/urls/${urlId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ destinationUrl: 'example.com' });
        expect(res.status).toBe(400);
      });

      it('destinationUrl not a URL', async () => {
        const res = await t.request
          .patch(`/urls/${urlId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ destinationUrl: 'not-a-url' });
        expect(res.status).toBe(400);
      });

      it('destinationUrl empty string', async () => {
        const res = await t.request
          .patch(`/urls/${urlId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ destinationUrl: '' });
        expect(res.status).toBe(400);
      });

      it('comments over 100 chars', async () => {
        const res = await t.request
          .patch(`/urls/${urlId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ comments: 'a'.repeat(101) });
        expect(res.status).toBe(400);
      });

      it('expiresAt plain text', async () => {
        const res = await t.request
          .patch(`/urls/${urlId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ expiresAt: 'not-a-date' });
        expect(res.status).toBe(400);
      });

      it('expiresAt date-only (no time component)', async () => {
        const res = await t.request
          .patch(`/urls/${urlId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ expiresAt: '2030-01-01' });
        expect(res.status).toBe(400);
      });

      it('expiresAt slash-separated date', async () => {
        const res = await t.request
          .patch(`/urls/${urlId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ expiresAt: '2030/01/01' });
        expect(res.status).toBe(400);
      });

      it('expiresAt US format', async () => {
        const res = await t.request
          .patch(`/urls/${urlId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ expiresAt: '01/01/2030' });
        expect(res.status).toBe(400);
      });

      it('expiresAt datetime without timezone offset', async () => {
        // ISO 8601 datetime but no Z / +HH:MM — verify validator rejects it
        const res = await t.request
          .patch(`/urls/${urlId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ expiresAt: '2030-01-01T00:00:00' });
        expect(res.status).toBe(400);
      });

      it('isActive as string "yes"', async () => {
        const res = await t.request
          .patch(`/urls/${urlId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ isActive: 'yes' });
        expect(res.status).toBe(400);
      });

      it('extra unknown field (forbidNonWhitelisted)', async () => {
        const res = await t.request
          .patch(`/urls/${urlId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ unknown: 'field' });
        expect(res.status).toBe(400);
      });
    });
  });

  // ─── GET /urls/:shortCode/info ───────────────────────────────────────────────

  describe('GET /urls/:shortCode/info', () => {
    it('active non-expired URL', async () => {
      const { url } = await seedUrl({
        userId: ANON_USER_ID,
        destinationUrl: 'https://example.com' 
      });
      const res = await t.request.get(`/urls/${url.shortUrl}/info`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        shortUrl: url.shortUrl,
        destinationUrl: 'https://example.com',
        isActive: true,
        isExpired: false,
        expiresAt: null
      });
    });

    it('URL with future expiresAt — isExpired: false', async () => {
      const future = new Date(Date.now() + 86_400_000);
      const { url } = await seedUrl({
        userId: ANON_USER_ID,
        expiresAt: future 
      });
      const res = await t.request.get(`/urls/${url.shortUrl}/info`);

      expect(res.status).toBe(200);
      expect(res.body.isExpired).toBe(false);
      expect(res.body.expiresAt).not.toBeNull();
    });

    it('URL with past expiresAt — isExpired: true', async () => {
      const past = new Date(Date.now() - 86_400_000);
      const { url } = await seedUrl({
        userId: ANON_USER_ID,
        expiresAt: past 
      });
      const res = await t.request.get(`/urls/${url.shortUrl}/info`);

      expect(res.status).toBe(200);
      expect(res.body.isExpired).toBe(true);
    });

    it('inactive URL — 200 with isActive: false (not a 404)', async () => {
      const { url } = await seedUrl({
        userId: ANON_USER_ID,
        isActive: false 
      });
      const res = await t.request.get(`/urls/${url.shortUrl}/info`);

      expect(res.status).toBe(200);
      expect(res.body.isActive).toBe(false);
    });

    it('non-existent shortCode → 404', async () => {
      expect((await t.request.get('/urls/missing/info')).status).toBe(404);
    });
  });

  // ─── GET /urls/:id/destinations ─────────────────────────────────────────────

  describe('GET /urls/:id/destinations', () => {
    it('returns single destination for fresh URL', async () => {
      const user = await createTestUser(t.prisma);
      const token = issueAccessToken(t.jwtService, user);
      const { url, destination } = await seedUrl({
        userId: user.id,
        destinationUrl: 'https://example.com' 
      });

      const res = await t.request
        .get(`/urls/${url.id}/destinations`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(destination.id.toString());
      expect(res.body[0].destinationUrl).toBe('https://example.com');
    });

    it('returns all destinations newest first after URL updates', async () => {
      const user = await createTestUser(t.prisma);
      const token = issueAccessToken(t.jwtService, user);
      const { url } = await seedUrl({
        userId: user.id,
        destinationUrl: 'https://first.com' 
      });

      await t.request
        .patch(`/urls/${url.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ destinationUrl: 'https://second.com' });

      const res = await t.request
        .get(`/urls/${url.id}/destinations`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.body).toHaveLength(2);
      expect(res.body[0].destinationUrl).toBe('https://second.com');
      expect(res.body[1].destinationUrl).toBe('https://first.com');
    });

    it('clickCount reflects actual click rows', async () => {
      const user = await createTestUser(t.prisma);
      const token = issueAccessToken(t.jwtService, user);
      const { url, destination } = await seedUrl({ userId: user.id });

      await t.prisma.urlClick.create({
        data: {
          urlId: url.id,
          destinationId: destination.id,
          ipAddress: '1.2.3.4' 
        }
      });
      await t.prisma.urlClick.create({
        data: {
          urlId: url.id,
          destinationId: destination.id,
          ipAddress: '1.2.3.5' 
        }
      });

      const res = await t.request
        .get(`/urls/${url.id}/destinations`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.body[0].clickCount).toBe(2);
    });

    describe('auth / authorization', () => {
      it('no token → 401', async () => {
        const { url } = await seedUrl({ userId: ANON_USER_ID });
        expect((await t.request.get(`/urls/${url.id}/destinations`)).status).toBe(401);
      });

      it('other user URL → 403', async () => {
        const owner = await createTestUser(t.prisma);
        const other = await createTestUser(t.prisma);
        const { url } = await seedUrl({ userId: owner.id });

        const res = await t.request
          .get(`/urls/${url.id}/destinations`)
          .set('Authorization', `Bearer ${issueAccessToken(t.jwtService, other)}`);
        expect(res.status).toBe(403);
      });

      it('non-existent urlId → 404', async () => {
        const user = await createTestUser(t.prisma);
        const res = await t.request
          .get('/urls/999999999/destinations')
          .set('Authorization', `Bearer ${issueAccessToken(t.jwtService, user)}`);
        expect(res.status).toBe(404);
      });
    });
  });

  // ─── GET /urls/:id/destinations/:destinationId/clicks ───────────────────────

  describe('GET /urls/:id/destinations/:destinationId/clicks', () => {
    it('returns empty list when no clicks', async () => {
      const user = await createTestUser(t.prisma);
      const token = issueAccessToken(t.jwtService, user);
      const { url, destination } = await seedUrl({ userId: user.id });

      const res = await t.request
        .get(`/urls/${url.id}/destinations/${destination.id}/clicks`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20 
      });
    });

    it('returns click records with correct fields, newest first', async () => {
      const user = await createTestUser(t.prisma);
      const token = issueAccessToken(t.jwtService, user);
      const { url, destination } = await seedUrl({ userId: user.id });

      await t.prisma.urlClick.create({
        data: {
          urlId: url.id,
          destinationId: destination.id,
          ipAddress: '1.1.1.1',
          userAgent: 'ua',
          referrer: 'https://ref.com' 
        }
      });

      const res = await t.request
        .get(`/urls/${url.id}/destinations/${destination.id}/clicks`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0]).toMatchObject({
        ipAddress: '1.1.1.1',
        userAgent: 'ua',
        referrer: 'https://ref.com'
      });
    });

    it('paginates correctly', async () => {
      const user = await createTestUser(t.prisma);
      const token = issueAccessToken(t.jwtService, user);
      const { url, destination } = await seedUrl({ userId: user.id });

      for (let i = 0; i < 3; i++) {
        await t.prisma.urlClick.create({
          data: {
            urlId: url.id,
            destinationId: destination.id,
            ipAddress: `1.1.1.${i}` 
          }
        });
      }

      const page1 = await t.request
        .get(`/urls/${url.id}/destinations/${destination.id}/clicks?page=1&pageSize=2`)
        .set('Authorization', `Bearer ${token}`);
      expect(page1.body.items).toHaveLength(2);
      expect(page1.body.total).toBe(3);
    });

    describe('auth / authorization', () => {
      it('no token → 401', async () => {
        const { url, destination } = await seedUrl({ userId: ANON_USER_ID });
        expect(
          (await t.request.get(`/urls/${url.id}/destinations/${destination.id}/clicks`)).status
        ).toBe(401);
      });

      it('other user URL → 403', async () => {
        const owner = await createTestUser(t.prisma);
        const other = await createTestUser(t.prisma);
        const { url, destination } = await seedUrl({ userId: owner.id });

        const res = await t.request
          .get(`/urls/${url.id}/destinations/${destination.id}/clicks`)
          .set('Authorization', `Bearer ${issueAccessToken(t.jwtService, other)}`);
        expect(res.status).toBe(403);
      });

      it('non-existent urlId → 404', async () => {
        const user = await createTestUser(t.prisma);
        const { destination } = await seedUrl({ userId: user.id });
        const res = await t.request
          .get(`/urls/999999999/destinations/${destination.id}/clicks`)
          .set('Authorization', `Bearer ${issueAccessToken(t.jwtService, user)}`);
        expect(res.status).toBe(404);
      });

      it('non-existent destinationId → 404', async () => {
        const user = await createTestUser(t.prisma);
        const { url } = await seedUrl({ userId: user.id });
        const res = await t.request
          .get(`/urls/${url.id}/destinations/999999999/clicks`)
          .set('Authorization', `Bearer ${issueAccessToken(t.jwtService, user)}`);
        expect(res.status).toBe(404);
      });

      it('destinationId belonging to a different URL → 404', async () => {
        const user = await createTestUser(t.prisma);
        const token = issueAccessToken(t.jwtService, user);
        const { url: urlA } = await seedUrl({ userId: user.id });
        const { destination: destB } = await seedUrl({ userId: user.id });

        const res = await t.request
          .get(`/urls/${urlA.id}/destinations/${destB.id}/clicks`)
          .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(404);
      });
    });

    describe('validation → 400', () => {
      it('page=0', async () => {
        const user = await createTestUser(t.prisma);
        const { url, destination } = await seedUrl({ userId: user.id });
        const res = await t.request
          .get(`/urls/${url.id}/destinations/${destination.id}/clicks?page=0`)
          .set('Authorization', `Bearer ${issueAccessToken(t.jwtService, user)}`);
        expect(res.status).toBe(400);
      });

      it('pageSize=101', async () => {
        const user = await createTestUser(t.prisma);
        const { url, destination } = await seedUrl({ userId: user.id });
        const res = await t.request
          .get(`/urls/${url.id}/destinations/${destination.id}/clicks?pageSize=101`)
          .set('Authorization', `Bearer ${issueAccessToken(t.jwtService, user)}`);
        expect(res.status).toBe(400);
      });
    });
  });

  // ─── GET /:shortUrl (redirect) ───────────────────────────────────────────────

  describe('GET /:shortUrl', () => {
    describe('happy path', () => {
      it('active URL → 302 to destinationUrl', async () => {
        const { url } = await seedUrl({
          userId: ANON_USER_ID,
          destinationUrl: 'https://target.com' 
        });
        const res = await t.request.get(`/${url.shortUrl}`).redirects(0);

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('https://target.com');
      });

      it('preview mode (shortUrl+) → 302 to FRONTEND_URL/preview/:code', async () => {
        const { url } = await seedUrl({ userId: ANON_USER_ID });
        const res = await t.request.get(`/${url.shortUrl}+`).redirects(0);

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe(`${FRONTEND_URL}/preview/${url.shortUrl}`);
      });
    });

    describe('missing-link redirects', () => {
      it('non-existent code → missing-link with code param', async () => {
        const res = await t.request.get('/doesntexist').redirects(0);

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain(`${FRONTEND_URL}/missing-link`);
        expect(res.headers.location).toContain('code=doesntexist');
      });

      it('inactive URL → missing-link with reason=disabled', async () => {
        const { url } = await seedUrl({
          userId: ANON_USER_ID,
          isActive: false 
        });
        const res = await t.request.get(`/${url.shortUrl}`).redirects(0);

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('reason=disabled');
      });

      it('expired URL → missing-link with reason=expired', async () => {
        const past = new Date(Date.now() - 86_400_000);
        const { url } = await seedUrl({
          userId: ANON_USER_ID,
          expiresAt: past 
        });
        const res = await t.request.get(`/${url.shortUrl}`).redirects(0);

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('reason=expired');
      });

      it('inactive URL in preview mode → missing-link, NOT preview', async () => {
        const { url } = await seedUrl({
          userId: ANON_USER_ID,
          isActive: false 
        });
        const res = await t.request.get(`/${url.shortUrl}+`).redirects(0);

        expect(res.headers.location).toContain('reason=disabled');
        expect(res.headers.location).not.toContain('/preview/');
      });

      it('expired URL in preview mode → missing-link, NOT preview', async () => {
        const past = new Date(Date.now() - 86_400_000);
        const { url } = await seedUrl({
          userId: ANON_USER_ID,
          expiresAt: past 
        });
        const res = await t.request.get(`/${url.shortUrl}+`).redirects(0);

        expect(res.headers.location).toContain('reason=expired');
        expect(res.headers.location).not.toContain('/preview/');
      });
    });

    describe('click recording', () => {
      it('successful redirect records a click and increments totalClicks', async () => {
        const { url } = await seedUrl({
          userId: ANON_USER_ID,
          destinationUrl: 'https://example.com' 
        });

        await t.request.get(`/${url.shortUrl}`)
          .set('User-Agent', 'test-agent')
          .set('X-Real-IP', '1.2.3.4')
          .set('Referer', 'https://referrer.com')
          .redirects(0);

        await new Promise((resolve) => setTimeout(resolve, 100)); // wait for async click recording

        const click = await t.prisma.urlClick.findFirst({ where: { urlId: url.id } });
        expect(click).not.toBeNull();

        const stat = await t.prisma.urlStat.findFirst({ where: { urlId: url.id } });
        expect(stat!.totalClicks).toBe(1);
      });

      it('successful redirect without referral records a click and increments totalClicks', async () => {
        const { url } = await seedUrl({
          userId: ANON_USER_ID,
          destinationUrl: 'https://example.com' 
        });

        await t.request.get(`/${url.shortUrl}`)
          .set('User-Agent', 'test-agent-2')
          .set('X-Real-IP', '1.2.3.4')
          .redirects(0);

        await new Promise((resolve) => setTimeout(resolve, 100)); // wait for async click recording

        const click = await t.prisma.urlClick.findFirst({ where: { urlId: url.id } });
        expect(click).not.toBeNull();

        const stat = await t.prisma.urlStat.findFirst({ where: { urlId: url.id } });
        expect(stat!.totalClicks).toBe(1);
      });

      it('preview mode does NOT record a click', async () => {
        const { url } = await seedUrl({ userId: ANON_USER_ID });

        await t.request.get(`/${url.shortUrl}+`).redirects(0);

        await new Promise((resolve) => setTimeout(resolve, 100)); // wait for async click recording

        const stat = await t.prisma.urlStat.findFirst({ where: { urlId: url.id } });
        expect(stat!.totalClicks).toBe(0);
      });

      it('missing-link redirect does NOT record a click', async () => {
        const { url } = await seedUrl({
          userId: ANON_USER_ID,
          isActive: false 
        });

        await t.request.get(`/${url.shortUrl}`).redirects(0);

        await new Promise((resolve) => setTimeout(resolve, 100)); // wait for async click recording

        const stat = await t.prisma.urlStat.findFirst({ where: { urlId: url.id } });
        expect(stat!.totalClicks).toBe(0);
      });
    });
  });
});
