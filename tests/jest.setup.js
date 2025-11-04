// Setup global pour les tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/jobbingtrack_test';

// Configuration pour les tests
global.testConfig = {
  timeout: 10000,
  retries: 3,
  baseURL: 'http://localhost:8080'
};

// Helper functions globales
global.createTestUser = () => ({
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User',
  role: 'admin'
});

global.createTestCompany = () => ({
  name: 'Test Company',
  description: 'Test company description',
  website: 'https://example.com',
  industry: 'Technology'
});

global.createTestApplication = () => ({
  title: 'Test Application',
  description: 'Test job application',
  companyId: 1,
  userId: 1,
  status: 'applied'
});

// Mock console methods pour éviter le bruit dans les tests
global.mockConsole = {
  log: jest.spyOn(console, 'log').mockImplementation(() => {}),
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
  warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
  info: jest.spyOn(console, 'info').mockImplementation(() => {})
};

// Cleanup après chaque test
afterEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  global.mockConsole.log.mockRestore();
  global.mockConsole.error.mockRestore();
  global.mockConsole.warn.mockRestore();
  global.mockConsole.info.mockRestore();
});
