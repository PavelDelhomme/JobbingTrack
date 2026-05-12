// Configuration Jest pour les tests du service auth
const path = require('path');

// Configuration de l'environnement de test
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || (
  `postgresql://${process.env.POSTGRES_USER || 'jobbingtrack'}:${process.env.POSTGRES_PASSWORD || 'jobbingtrack123'}@` +
  `${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5000'}/${process.env.POSTGRES_DB || 'jobbingtrack'}?schema=public`
);

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
