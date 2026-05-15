import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

interface SetupConfig {
  pgHost: string;
  pgPort: number;
  pgUser: string;
  pgPassword: string;
  redisHost: string;
  redisPort: number;
  redisPassword: string;
}

const SETUP_FILE = path.join(os.tmpdir(), 'jest-integration-setup.json');
const config: SetupConfig = JSON.parse(fs.readFileSync(SETUP_FILE, 'utf-8'));

// JEST_WORKER_ID is 1-based; maps directly to a Redis DB index (1–15 max).
const workerId = parseInt(process.env.JEST_WORKER_ID ?? '1', 10);

process.env.DATABASE_URL = `postgresql://${config.pgUser}:${config.pgPassword}@${config.pgHost}:${config.pgPort}/test_worker_${workerId}`;
process.env.REDIS_URL = `redis://:${config.redisPassword}@${config.redisHost}:${config.redisPort}/${workerId}`;

// Static values required by ConfigModule env validation.
process.env.NODE_ENV = 'test';
process.env.CACHE_L1_TTL_MS = '60000';
process.env.CACHE_L2_TTL_MS = '86400000';
process.env.FRONTEND_URL = 'http://localhost:7777';
process.env.REDIRECT_DOMAIN = 'https://example.com';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-and-secure-definitely-not-used-in-production';
process.env.JWT_EXPIRATION = '3600';
process.env.JWT_REFRESH_EXPIRATION = '604800';
process.env.GOOGLE_OAUTH_SESSION_SECRET = 'test-session-secret';
