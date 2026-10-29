/**
 * Integration tests against a real PostgreSQL. Each run creates a throwaway
 * database (and drops it afterwards) on the server named by TEST_DB_HOST /
 * TEST_DB_PORT / TEST_DB_USERNAME / TEST_DB_PASSWORD — never DB_NAME.
 *
 *   npm run test:integration
 */
module.exports = {
  rootDir: '.',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.int-spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/../../tsconfig.json' }] },
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/env.ts'],
  testTimeout: 120_000,
  maxWorkers: 1,
};
