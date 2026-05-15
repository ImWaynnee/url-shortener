import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { ClientConfig } from 'pg';
import{ Client } from 'pg';
import type { StartedTestContainer } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

// Explicitly declare global types so globalThis attaches properly without compilation errors
declare global {
  var __PG_CONTAINER__: StartedTestContainer | undefined;
  var __REDIS_CONTAINER__: StartedTestContainer | undefined;
}

const MAX_WORKERS = 4;
const SETUP_FILE = path.join(os.tmpdir(), 'jest-integration-setup.json');
const BACKEND_ROOT = path.join(__dirname, '../../..');

export default async function globalSetup(): Promise<void> {
  // --- Postgres ---
  const pgContainer: StartedTestContainer = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
      POSTGRES_DB: 'test_template'
    })
    .withExposedPorts(5432)
    .withWaitStrategy(
      Wait.forLogMessage('database system is ready to accept connections', 2)
    )
    .start();

  const pgHost = pgContainer.getHost();
  const pgPort = pgContainer.getMappedPort(5432);
  const pgBaseUrl = `postgresql://test:test@${pgHost}:${pgPort}`;

  // Run Prisma migrations against template database
  execSync('pnpm exec prisma migrate deploy', {
    cwd: BACKEND_ROOT,
    env: {
      ...process.env,
      DATABASE_URL: `${pgBaseUrl}/test_template` 
    },
    stdio: 'inherit'
  });

  // Create worker databases by cloning template
  const clientConfig: ClientConfig = {
    host: pgHost,
    port: pgPort,
    user: 'test',
    password: 'test',
    database: 'template1'
  };
  
  const adminClient = new Client(clientConfig);
  await adminClient.connect();

  // Terminate lingering connections
  await adminClient.query(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = 'test_template' AND pid <> pg_backend_pid()
  `);

  for (let i = 1; i <= MAX_WORKERS; i++) {
    await adminClient.query(
      `CREATE DATABASE test_worker_${i} TEMPLATE test_template`
    );
  }
  await adminClient.end();

  // --- Redis ---
  const redisContainer: StartedTestContainer = await new GenericContainer('redis:7-alpine')
    .withCommand(['redis-server', '--requirepass', 'test'])
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
    .start();

  const redisHost = redisContainer.getHost();
  const redisPort = redisContainer.getMappedPort(6379);

  // Write configuration to shared environment file
  fs.writeFileSync(
    SETUP_FILE,
    JSON.stringify({
      pgHost,
      pgPort,
      pgUser: 'test',
      pgPassword: 'test',
      redisHost,
      redisPort,
      redisPassword: 'test'
    }, null, 2)
  );

  // Store references for globalTeardown
  globalThis.__PG_CONTAINER__ = pgContainer;
  globalThis.__REDIS_CONTAINER__ = redisContainer;
}