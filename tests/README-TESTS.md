# Structure des Tests

Cette documentation explique l'organisation des tests dans le projet JobbingTrack.

## Structure des dossiers

```
tests/
├── data/                    # Données de test pour les tests automatisés
│   ├── test-users.json      # Utilisateurs de test
│   ├── test-companies.json  # Entreprises de test
│   └── test-applications.json # Candidatures de test
├── e2e/                     # Tests end-to-end avec Playwright
│   ├── specs/               # Tests organisés par fonctionnalité
│   │   ├── login.spec.ts    # Tests d'authentification
│   │   └── ...
│   ├── fixtures/            # Données de test pour e2e
│   │   └── test-data.ts     # Fixtures réutilisables
│   ├── utils/               # Utilitaires pour les tests e2e
│   │   └── test-helpers.ts  # Fonctions helper pour les tests
│   └── playwright.config.ts # Configuration Playwright
├── application-tests.sh     # Tests d'application
├── auth-tests.sh           # Tests d'authentification
├── automated-tests.sh      # Tests automatisés
└── cleanup.sh              # Nettoyage après tests
```

## Données de Test

Le dossier `data/` était vide car il n'y avait pas encore de données de test structurées. J'ai ajouté :

- **test-users.json** : Utilisateurs avec différents rôles (USER, ADMIN, SUPER_ADMIN)
- **test-companies.json** : Entreprises fictives pour les tests
- **test-applications.json** : Candidatures avec différents statuts

Ces données permettent de :
- Tester l'authentification avec différents rôles
- Tester les fonctionnalités CRUD sur les entités métier
- Avoir des données cohérentes pour les tests d'intégration

## Tests End-to-End (E2E)

Les tests e2e utilisent Playwright et sont organisés par fonctionnalité :
- Chaque fichier `.spec.ts` dans `specs/` teste une fonctionnalité spécifique
- Les fixtures dans `fixtures/` fournissent des données de test réutilisables
- Les helpers dans `utils/` simplifient les interactions répétitives

## Lancement des Tests

```bash
# Tests unitaires
npm run test

# Tests e2e
npx playwright test

# Tests d'application
./tests/application-tests.sh

# Tests d'authentification
./tests/auth-tests.sh

# Tous les tests automatisés
./tests/automated-tests.sh
```

## Bonnes Pratiques

1. **Données de test cohérentes** : Utiliser les fixtures plutôt que des données hardcodées
2. **Tests indépendants** : Chaque test doit pouvoir s'exécuter indépendamment
3. **Nettoyage** : Toujours nettoyer après les tests avec `cleanup.sh`
4. **Captures d'écran** : Les tests e2e prennent automatiquement des captures en cas d'échec
