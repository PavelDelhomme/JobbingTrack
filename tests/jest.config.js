module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/unit/**/*.test.js',
    '**/unit/**/*.spec.js',
    '**/integration/**/*.test.js',
    '**/integration/**/*.spec.js',
    '**/api/**/*.test.js',
    '**/api/**/*.spec.js',
    '**/backend/**/*.test.js',
    '**/backend/**/*.spec.js',
    '**/frontend/**/*.test.js',
    '**/frontend/**/*.spec.js',
    '**/mobile/**/*.test.js',
    '**/mobile/**/*.spec.js'
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
