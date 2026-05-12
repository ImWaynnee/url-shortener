process.env.TZ = 'UTC';

module.exports = {
  setupFiles: ['reflect-metadata'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coveragePathIgnorePatterns: [
    'node_modules',
    'main.ts',
    'prisma.service.ts',
    '.module.ts',
    '.dto.ts',
    '.entity.ts',
    'generated/prisma/',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/$1',
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@modules/(.*)$': '<rootDir>/modules/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@guards/(.*)$': '<rootDir>/common/guards/$1',
    '^@factories/(.*)$': '<rootDir>/test/factories/$1',
  }
};