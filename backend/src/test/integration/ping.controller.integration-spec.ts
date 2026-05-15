import type { TestApp } from '@src/test/helpers/create-test-app';
import { createTestApp } from '@src/test/helpers/create-test-app';

describe('PingController', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  describe('GET /ping', () => {
    it('returns 200 with pong message, no auth required', async () => {
      const res = await t.request.get('/ping');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'pong!' });
    });
  });
});
