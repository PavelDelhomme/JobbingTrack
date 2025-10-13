# Tests Automatisés JobbingTrack

Ce répertoire contient la configuration et les tests automatisés pour le projet JobbingTrack.

## Structure des Tests

```
tests/
├── e2e/                    # Tests End-to-End avec Playwright
│   ├── login.spec.ts       # Tests de la page de connexion
│   ├── backoffice.spec.ts  # Tests du backoffice administrateur
│   ├── api-critiques.spec.ts # Tests des APIs critiques
│   ├── global-setup.ts     # Configuration globale des tests
│   ├── global-teardown.ts  # Nettoyage après les tests
│   └── test-init.sql       # Données de test pour la base de données
├── README.md              # Cette documentation
└── playwright.config.ts   # Configuration Playwright
```

## Types de Tests

### 1. Tests End-to-End (E2E)
- **Objectif** : Tester le comportement complet de l'application comme un utilisateur réel
- **Outil** : Playwright
- **Couverture** : Interface utilisateur, interactions, flux complets

### 2. Tests d'API
- **Objectif** : Tester les endpoints API directement
- **Outil** : Playwright avec requêtes HTTP
- **Couverture** : Routes critiques, erreurs, sécurité

### 3. Tests d'Intégration
- **Objectif** : Tester l'interaction entre les composants
- **Outil** : Jest + Testing Library

## Configuration

### Prérequis
- Node.js 20+
- npm ou yarn
- Docker et Docker Compose (pour les tests avec services backend)

### Installation
```bash
# Installer les dépendances
npm install

# Installer les navigateurs Playwright
npx playwright install --with-deps
```

## Exécution des Tests

### Tests Unitaires et d'Intégration
```bash
# Tous les tests unitaires
npm test

# Tests en mode watch
npm run test:watch
```

### Tests End-to-End

#### Tests Rapides (sans services backend)
```bash
# Tests e2e de base
npm run test:e2e

# Tests avec interface graphique
npm run test:e2e:ui

# Tests en mode headed (avec navigateur visible)
npm run test:e2e:headed

# Tests en mode debug
npm run test:e2e:debug

# Voir le rapport de tests
npm run test:e2e:report
```

#### Tests Complets (avec services backend)
```bash
# Tests e2e avec démarrage automatique des services backend
npm run test:e2e:full

# Ou manuellement :
./scripts/test-e2e.sh
```

### Tous les Tests
```bash
# Exécuter tous les tests (unitaires + e2e)
npm run test:all
```

## CI/CD

Les tests sont automatiquement exécutés dans GitHub Actions sur :
- Push vers `main`, `develop`, et branches `feat/*`
- Pull requests vers `main` et `develop`

Le pipeline inclut :
1. Tests backend avec base de données PostgreSQL
2. Tests frontend avec Playwright
3. Tests d'intégration
4. Vérifications de sécurité
5. Déploiement automatique sur `main`

## Écriture de Nouveaux Tests

### Tests E2E avec Playwright

```typescript
import { test, expect } from '@playwright/test';

test.describe('Ma fonctionnalité', () => {
  test.beforeEach(async ({ page }) => {
    // Configuration avant chaque test
    await page.goto('/ma-page');
  });

  test('devrait faire quelque chose', async ({ page }) => {
    // Actions de l'utilisateur
    await page.click('button[type="submit"]');

    // Assertions
    await expect(page.locator('.success')).toBeVisible();
  });
});
```

### Tests d'API

```typescript
test('devrait retourner les données utilisateur', async ({ page }) => {
  const response = await page.request.get('/api/v1/users');
  expect(response.ok()).toBeTruthy();

  const data = await response.json();
  expect(Array.isArray(data.users)).toBeTruthy();
});
```

## Environnements de Test

### Développement Local
- Frontend : `http://localhost:3000`
- API Gateway : `http://localhost:3000`
- Services backend : `http://localhost:3001-3013`

### Tests CI/CD
- Utilise des conteneurs Docker isolés
- Base de données de test dédiée
- Services backend mockés si nécessaire

## Données de Test

Les données de test sont automatiquement créées dans la base de données de test PostgreSQL :

- **Utilisateurs** : 4 comptes avec différents rôles
- **Entreprises** : 3 entreprises fictives
- **Candidatures** : 3 candidatures avec différents statuts
- **Contacts** : 3 contacts associés aux entreprises

## Debugging

### Playwright UI Mode
```bash
npm run test:e2e:ui
```
Ouvre une interface graphique pour exécuter et déboguer les tests.

### Mode Debug
```bash
npm run test:e2e:debug
```
Exécute les tests en mode debug avec des points d'arrêt.

### Mode Headed
```bash
npm run test:e2e:headed
```
Exécute les tests avec le navigateur visible.

## Bonnes Pratiques

1. **Tests indépendants** : Chaque test doit pouvoir s'exécuter indépendamment
2. **Données cohérentes** : Utiliser des données de test prévisibles
3. **Assertions claires** : Des assertions spécifiques et compréhensibles
4. **Nettoyage** : Nettoyer les données créées pendant les tests
5. **Sélection de tests** : Utiliser des groupes logiques avec `test.describe()`

## Support

Pour toute question concernant les tests :
- Consultez la documentation Playwright : https://playwright.dev/
- Ouvrez une issue sur le repository GitHub
- Contactez l'équipe de développement
