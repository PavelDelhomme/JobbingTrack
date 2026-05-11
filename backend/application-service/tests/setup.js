process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

jest.setTimeout(10000);

afterEach(() => {
  jest.clearAllMocks();
});
