// Configuration Jest pour les tests backend
const path = require('path');

// Configuration de l'environnement de test
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.SECURITY_INTERNAL_SECRET = 'test-internal-security-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.PORT = '3000';
process.env.TRUST_PROXY_HOPS = '1';
process.env.SECURITY_SERVICE_URL = 'http://localhost:3017';

// Timeout global pour les tests
jest.setTimeout(10000);

// Nettoyage après chaque test
afterEach(() => {
  // Nettoyer les mocks
  jest.clearAllMocks();
});

// Configuration pour les tests d'API
global.testConfig = {
  timeout: 10000,
  retries: 3,
};
