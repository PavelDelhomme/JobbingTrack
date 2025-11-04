# JobbingTrack Backend

[← Retour au README principal](../README.md) | [📚 Documentation](../docs/README.md) | [🧭 Navigation](../docs/navigation.md)

Backend monorepo pour la plateforme JobbingTrack avec microservices Node.js.

## Structure

```
backend/
├── api-gateway/          # API Gateway principal
├── auth-service/         # Service d'authentification
├── application-service/  # Service de gestion des candidatures
├── company-service/      # Service de gestion des entreprises
├── contact-service/      # Service de gestion des contacts
├── interview-service/    # Service de gestion des entretiens
├── notification-service/ # Service de notifications
├── dashboard-service/    # Service de tableau de bord
├── ... autres services
├── package.json          # Configuration monorepo
└── README.md            # Cette documentation
```

## Installation

### Prérequis

- Node.js >= 18.0.0
- npm >= 8.0.0
- Docker & Docker Compose

### Installation des dépendances

```bash
# Installation pour tous les services
npm install

# Ou installation service par service
cd api-gateway && npm install
cd ../auth-service && npm install
# etc.
```

## Tests

### Configuration des tests

Chaque service backend est configuré avec Jest et Supertest pour les tests.

### Exécution des tests

```bash
# Tests pour tous les services
npm run test

# Tests pour un service spécifique
cd api-gateway
npm run test

# Tests en mode watch
npm run test:watch

# Tests avec coverage
npm run test:ci
```

### Structure des tests

```
service/
├── tests/
│   ├── setup.js              # Configuration Jest
│   ├── server.test.js        # Tests du serveur principal
│   ├── controllers/          # Tests des contrôleurs
│   │   └── admin.controller.test.js
│   └── integration/          # Tests d'intégration
└── jest.config.js           # Configuration Jest
```

### Exemple de test unitaire

```javascript
const request = require('supertest');
const app = require('../src/server');

describe('API Tests', () => {
  test('GET /health should return 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
  });
});
```

## Qualité du code

### Linting

```bash
# Linting pour tous les services
npm run lint

# Linting pour un service spécifique
cd api-gateway
npm run lint

# Auto-correction
npm run lint:fix
```

### Formatage

```bash
# Vérification du formatage
npm run format:check

# Formatage automatique
npm run format
```

### Configuration ESLint

- Règles standard JavaScript
- Règles TypeScript pour les fichiers .ts
- Règles Node.js spécifiques
- Configuration dans `.eslintrc.js`

### Configuration Prettier

- Configuration dans `.prettierrc`
- Semicolons activés
- Quotes simples
- Largeur de ligne: 100 caractères

## Services principaux

### API Gateway
- Port: 3000
- Tests: `cd api-gateway && npm run test`
- Linting: `cd api-gateway && npm run lint`

### Auth Service
- Port: 3001
- Tests: `cd auth-service && npm run test`
- Linting: `cd auth-service && npm run lint`

### Dashboard Service
- Port: 3007
- Tests: `cd dashboard-service && npm run test`
- Linting: `cd dashboard-service && npm run lint`

## Scripts disponibles

### Scripts monorepo (backend/package.json)

```bash
npm run lint          # ESLint tous services
npm run lint:fix      # ESLint auto-fix tous services
npm run format        # Prettier tous services
npm run format:check  # Vérifier formatage tous services
npm run test          # Tests tous services
npm run test:ci       # Tests avec coverage tous services
npm run build         # Build tous services
npm run clean         # Nettoyer tous services
npm run audit         # Audit sécurité
npm run audit:fix     # Corriger vulnérabilités
```

### Scripts par service

```bash
# Dans n'importe quel service
npm run test          # Tests unitaires
npm run test:ci       # Tests avec coverage
npm run test:watch    # Tests en mode watch
npm run lint          # ESLint
npm run lint:fix      # ESLint auto-fix
npm run format        # Prettier
npm run format:check  # Vérifier Prettier
```

## Variables d'environnement

### Configuration commune

```bash
NODE_ENV=test
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://user:pass@localhost:5432/db
REDIS_URL=redis://localhost:6379
```

### Configuration par service

Chaque service peut avoir ses propres variables dans son `.env` respectif.

## Coverage des tests

### Seuil minimum

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

### Rapport de coverage

```bash
# Générer le rapport de coverage
npm run test:ci

# Le rapport sera dans coverage/lcov-report/index.html
```

## CI/CD

La pipeline CI/CD exécute automatiquement :
- Analyse de sécurité (audit npm)
- Linting et formatage
- Tests unitaires avec coverage
- Tests d'intégration
- Tests de santé système

Voir `.github/workflows/ci-cd.yml` pour la configuration complète.

## Développement

### Démarrage en développement

```bash
# Démarrer tous les services
make up

# Ou service par service
cd api-gateway
npm run dev
```

### Debug

```bash
# Avec debugger
node --inspect src/server.js

# Avec nodemon et debugger
npm run dev -- --inspect
```

## Troubleshooting

### Problèmes courants

1. **Tests qui échouent**
   - Vérifier la configuration des variables d'environnement
   - S'assurer que les services de test (PostgreSQL, Redis) sont démarrés
   - Vérifier les mocks dans les tests

2. **Linting qui échoue**
   - Exécuter `npm run lint:fix` pour auto-correction
   - Vérifier la configuration ESLint
   - S'assurer que les fichiers sont dans les bons répertoires

3. **Tests de coverage insuffisants**
   - Ajouter des tests pour le code non couvert
   - Ajuster les seuils dans `jest.config.js` si nécessaire
   - Utiliser `npm run test:ci` pour voir le rapport détaillé

### Logs de debug

```bash
# Activer les logs verbeux pour Jest
DEBUG=* npm run test

# Logs du service
npm run dev  # Mode développement avec logs
```

## Contribution

### Standards de code

- Respecter les règles ESLint
- Maintenir le formatage Prettier
- Écrire des tests pour tout nouveau code
- Maintenir le coverage au-dessus des seuils
- Documenter les fonctions complexes

### Tests requis

- Tests unitaires pour toutes les fonctions
- Tests d'intégration pour les API
- Tests de santé pour les services
- Tests de sécurité pour les fonctions sensibles

## Support

Pour plus d'informations, consultez :
- Documentation principale : `../docs/`
- Guide de développement : `../docs/DEVELOPMENT.md`
- Guide des tests : `../docs/tests/`
