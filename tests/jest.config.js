module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/unit/test-utils.js',
    '<rootDir>/unit/test-environment-variables.js',
    '<rootDir>/integration/test-frontend-integration.js',
    '<rootDir>/integration/test-full-system.js',
    '<rootDir>/integration/test-hydration-fixes.js',
    '<rootDir>/integration/test-implementation.js',
    '<rootDir>/integration/test-websocket.js',
    '<rootDir>/integration/verify-test-system.js',
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!jest.config.js',
    '!**/test-*.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 10000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
