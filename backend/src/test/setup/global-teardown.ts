import fs from 'fs';
import os from 'os';
import path from 'path';
import type { StartedTestContainer } from 'testcontainers';

declare global {
  var __PG_CONTAINER__: StartedTestContainer | undefined;
  var __REDIS_CONTAINER__: StartedTestContainer | undefined;
}

const SETUP_FILE = path.join(os.tmpdir(), 'jest-integration-setup.json');

export default async function globalTeardown(): Promise<void> {
  if (globalThis.__PG_CONTAINER__) {
    await globalThis.__PG_CONTAINER__.stop();
  }
  
  if (globalThis.__REDIS_CONTAINER__) {
    await globalThis.__REDIS_CONTAINER__.stop();
  }

  if (fs.existsSync(SETUP_FILE)) {
    fs.unlinkSync(SETUP_FILE);
  }
}