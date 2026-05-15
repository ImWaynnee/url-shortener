process.env.TZ = 'UTC';

module.exports = {
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],  
  transform: {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  setupFiles: ['reflect-metadata'],
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/$1',
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@modules/(.*)$': '<rootDir>/modules/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@guards/(.*)$': '<rootDir>/common/guards/$1',
    '^@factories/(.*)$': '<rootDir>/test/factories/$1',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coveragePathIgnorePatterns: [
    'src/test/',
    'node_modules',
    'main.ts',
    'prisma.service.ts',
    '.module.ts',
    '.dto.ts',
    '.entity.ts',
    'generated/prisma/',
  ],
  coverageDirectory: '../coverage',
  testTimeout: 15000
};