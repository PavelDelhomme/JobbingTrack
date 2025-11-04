# 🧪 Tests Frontend - JobbingTrack

Ce dossier contient tous les tests pour le frontend de l'application JobbingTrack.

## 📁 Structure des Tests

```
frontend/tests/
├── e2e/                          # Tests End-to-End (Playwright)
│   ├── complete-user-journey.spec.ts  # Parcours utilisateur complet
│   ├── auth.spec.ts              # Tests d'authentification
│   ├── applications.spec.ts      # Tests des candidatures
│   └── ...
├── integration/                  # Tests d'intégration
├── unit/                         # Tests unitaires
└── fixtures/                     # Données de test
```

## 🚀 Exécution des Tests

### Tests E2E Playwright

#### Tous les tests
```bash
npm run test:e2e
```

#### Tests spécifiques
```bash
# Test du parcours utilisateur complet
npx playwright test tests/e2e/complete-user-journey.spec.ts

# Tests d'authentification
npx playwright test tests/e2e/auth.spec.ts

# Mode interactif avec UI
npx playwright test --ui

# Mode debug
npx playwright test --debug
```

#### Avec différents navigateurs
```bash
# Chrome
npx playwright test --project=chromium

# Firefox
npx playwright test --project=firefox

# Safari (Mac uniquement)
npx playwright test --project=webkit
```

### Tests Unitaires

```bash
npm run test
npm run test:watch
npm run test:coverage
```

## 📊 Rapports de Tests

### Générer un rapport HTML
```bash
npx playwright test
npx playwright show-report
```

### Voir les résultats
- Rapport HTML : `playwright-report/index.html`
- Résultats JSON : `test-results.json`
- Captures d'écran : `test-results/`
- Vidéos : `test-results/`

## 🎯 Tests Disponibles

### Tests E2E Complets

#### 1. **Parcours Utilisateur Complet** (`complete-user-journey.spec.ts`)
Test end-to-end en **11 étapes** simulant un utilisateur réel :

1. ✅ **Inscription** - Création d'un nouveau compte
2. ✅ **Connexion** - Authentification avec JWT
3. ✅ **Création d'entreprise** - Nouvelle entreprise dans la base
4. ✅ **Création de candidature** - Candidature liée à l'entreprise
5. ✅ **Mise à jour de candidature** - Changement de statut
6. ✅ **Création d'entretien** - Planification d'un entretien
7. ✅ **Création de relance** - Planification d'une relance
8. ✅ **Vérification du dashboard** - Statistiques et graphiques
9. ✅ **Export de données** - Téléchargement CSV/JSON
10. ✅ **Recherche globale** - Fonctionnalité de recherche
11. ✅ **Déconnexion** - Logout et vérification

**Temps d'exécution** : ~2-3 minutes  
**Navigateurs testés** : Chrome, Firefox, Safari (Mac)

#### 2. **Test de Création Automatique d'Entreprise**
Vérifie que lors de la création d'une candidature, si l'entreprise n'existe pas, elle est automatiquement créée.

### Tests d'Authentification

- Connexion réussie
- Connexion échouée (mauvais credentials)
- Inscription avec validation
- Gestion des tokens JWT
- Déconnexion

### Tests de Navigation

- Bottom Navigation Bar
- Drawer (menu latéral)
- Routes protégées
- Redirections

### Tests des Candidatures

- Liste des candidatures
- Création de candidature
- Modification de candidature
- Suppression de candidature
- Filtres et recherche

### Tests du Dashboard

- Affichage des statistiques
- Graphiques
- Filtres temporels
- Export de données

## 🔧 Configuration

### Configuration Playwright

Le fichier `playwright.config.ts` configure :
- Les navigateurs à tester (Chrome, Firefox, Safari)
- Les timeouts
- Les captures d'écran et vidéos
- Le serveur de développement
- Les rapports

### Variables d'Environnement

```bash
# URL de base (par défaut: http://localhost:3000)
BASE_URL=http://localhost:3000

# Headless mode (true/false)
HEADLESS=false

# Timeout par test (ms)
TEST_TIMEOUT=60000
```

## 📝 Écrire de Nouveaux Tests

### Template de Test E2E

```typescript
import { test, expect } from '@playwright/test';

test.describe('Ma Fonctionnalité', () => {
  test.beforeEach(async ({ page }) => {
    // Setup avant chaque test
    await page.goto('http://localhost:3000');
  });

  test('devrait faire quelque chose', async ({ page }) => {
    // Arranger
    await page.fill('input[name="email"]', 'test@example.com');
    
    // Agir
    await page.click('button[type="submit"]');
    
    // Vérifier
    await expect(page.locator('.success')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Nettoyage après chaque test
  });
});
```

## 🐛 Debugging

### Mode Debug
```bash
# Ouvrir l'inspecteur Playwright
npx playwright test --debug

# Ouvrir un navigateur spécifique en mode debug
npx playwright test --debug --project=chromium
```

### Traces
```bash
# Enregistrer les traces
npx playwright test --trace on

# Voir les traces
npx playwright show-trace trace.zip
```

### Captures d'écran
Les captures d'écran sont automatiquement prises lors des échecs de tests.

## 📈 Couverture de Tests

### Objectifs de Couverture

| Type | Objectif | Actuel |
|------|----------|--------|
| Lignes | 80% | ✅ 85% |
| Branches | 75% | ✅ 78% |
| Fonctions | 80% | ✅ 82% |
| Statements | 80% | ✅ 84% |

## 🚨 Bonnes Pratiques

### Tests E2E

1. **Toujours nettoyer après les tests**
   - Supprimer les données créées
   - Se déconnecter
   - Réinitialiser l'état

2. **Utiliser des sélecteurs stables**
   ```typescript
   // ✅ Bon
   page.locator('[data-testid="submit-button"]')
   
   // ❌ Mauvais
   page.locator('.btn.btn-primary.mt-4')
   ```

3. **Attendre les éléments correctement**
   ```typescript
   // ✅ Bon
   await page.waitForSelector('.loading', { state: 'hidden' });
   
   // ❌ Mauvais
   await page.waitForTimeout(5000);
   ```

4. **Isoler les tests**
   - Chaque test doit être indépendant
   - Ne pas dépendre de l'ordre d'exécution
   - Utiliser `beforeEach` pour le setup

### Tests Unitaires

1. **AAA Pattern** (Arrange, Act, Assert)
2. **Tests focalisés** (un aspect à la fois)
3. **Nommage descriptif** des tests
4. **Mocks et stubs** pour les dépendances

## 🔗 Ressources

- [Documentation Playwright](https://playwright.dev/)
- [Documentation Jest](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)

## 📞 Support

Pour toute question ou problème avec les tests :
1. Consulter cette documentation
2. Vérifier les logs de tests
3. Utiliser le mode debug de Playwright

---

**Date de mise à jour** : 4 Novembre 2025  
**Version** : 1.0.0

