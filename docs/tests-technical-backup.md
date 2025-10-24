# Tests JobbingTrack - Documentation Technique

## Configuration

### Variables d'environnement
```bash
# Copier et adapter
cp tests/.env.test tests/.env.test.local
```

### Démarrage des services de test
```bash
# Services de test
docker-compose -f tests/docker-compose.test.yml up -d

# Frontend pour tests E2E
cd frontend && npm run dev

# Backend API
cd backend/api-gateway && npm run dev
```

## Exécution

### Tests unitaires
```bash
npm run test:unit
```

### Tests E2E
```bash
npm run test:e2e
# Avec interface
npm run test:playwright
```

### Tests API
```bash
npm run test:api
```

## Structure

- `unit/` - Tests unitaires (Jest)
- `e2e/` - Tests end-to-end (Playwright)
- `api/` - Tests API (Supertest)
- `integration/` - Tests d'intégration
- `performance/` - Tests de performance
- `security/` - Tests de sécurité

## Fixtures

Données de test disponibles dans `tests/fixtures/`:
- `users.json` - Utilisateurs de test
- `companies.json` - Entreprises de test
- `applications.json` - Candidatures de test
