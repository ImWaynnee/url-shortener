process.env.TZ = 'UTC';

/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  roots: ['<rootDir>/src/test/integration'],
  testRegex: '\\.integration-spec\\.ts$',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  setupFiles: ['reflect-metadata'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup/worker-setup.ts'],
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@guards/(.*)$': '<rootDir>/src/common/guards/$1',
    '^@factories/(.*)$': '<rootDir>/src/test/factories/$1',
  },
  globalSetup: '<rootDir>/src/test/setup/global-setup.ts',
  globalTeardown: '<rootDir>/src/test/setup/global-teardown.ts',
  // Each worker gets its own DB. Each DB index maps to a Redis DB (1–15 max).
  maxWorkers: 4,
  testTimeout: 60000,
  forceExit: true
};
