# Structure des dossiers Frontend

Cette documentation décrit la nouvelle organisation des dossiers dans `frontend/src/app` pour une meilleure maintenabilité et organisation du code.

## Structure actuelle

```
frontend/src/app/
├── access-denied/          # Pages d'accès refusé
├── admin/                  # Fonctionnalités d'administration
│   ├── analytics/         # Analytics et métriques
│   ├── archives/          # Gestion des archives
│   ├── data-management/   # Gestion des données
│   ├── deployments/       # Gestion des déploiements
│   ├── logs/             # Logs système
│   ├── maintenance/      # Maintenance système
│   ├── notifications/    # Notifications
│   ├── search/           # Recherche
│   ├── settings/         # Paramètres
│   ├── statistics/       # Statistiques
│   ├── test-data/        # Données de test
│   └── trash/            # Corbeille
├── api/                   # API routes (Next.js)
├── applications/          # Gestion des applications
│   ├── applications/     # CRUD des applications
│   ├── mobile-emulator/  # Émulateur mobile
│   └── services/         # Gestion des services
├── backoffice/           # Backoffice principal
├── entities/             # Entités métier
│   ├── calls/           # Gestion des appels
│   ├── companies/       # Gestion des entreprises
│   ├── contacts/        # Gestion des contacts
│   ├── events/          # Gestion des événements
│   ├── followups/       # Gestion des suivis
│   ├── interviews/      # Gestion des entretiens
│   └── users/           # Gestion des utilisateurs
├── forgot-password/      # Mot de passe oublié
├── globals.css          # Styles globaux
├── layout.tsx           # Layout principal
├── login/               # Connexion
├── page.tsx             # Page d'accueil
├── register/            # Inscription
├── reset-password/      # Réinitialisation mot de passe
├── security/            # Fonctionnalités de sécurité
│   ├── security-alerts/       # Alertes de sécurité
│   ├── security-analysis/     # Analyse de sécurité
│   ├── security-data-generator/ # Générateur de données de test sécurité
│   ├── security-ddos/         # Protection DDoS
│   ├── security-intrusions/   # Détection d'intrusions
│   ├── security-logs/         # Logs de sécurité
│   └── security-vulnerabilities/ # Vulnérabilités
├── shared/              # Composants partagés
│   └── components/      # Composants réutilisables
├── styles/              # Fichiers de styles
└── tests/               # Tests et outils de test
    ├── api-tester/      # Testeur d'API
    ├── performance-tests/ # Tests de performance
    └── playwright-tests/  # Tests Playwright
```

## Règles d'organisation

### 1. **Tests** (`/tests/`)
Tous les éléments liés aux tests :
- Tests E2E (Playwright)
- Tests de performance
- Tests d'API
- Outils de test

### 2. **Sécurité** (`/security/`)
Tous les éléments liés à la sécurité :
- Alertes de sécurité
- Analyse de sécurité
- Protection DDoS
- Détection d'intrusions
- Logs de sécurité
- Gestion des vulnérabilités

### 3. **Entités** (`/entities/`)
Entités métier de l'application :
- Utilisateurs (users)
- Entreprises (companies)
- Contacts (contacts)
- Candidatures (applications)
- Entretiens (interviews)
- Appels (calls)
- Événements (events)
- Suivis (followups)

### 4. **Administration** (`/admin/`)
Fonctionnalités d'administration système :
- Analytics et métriques
- Gestion des déploiements
- Logs système
- Maintenance
- Paramètres
- Statistiques
- Corbeille

### 5. **Applications** (`/applications/`)
Gestion des applications et services :
- CRUD des applications
- Gestion des services
- Émulateur mobile

### 6. **Backoffice** (`/backoffice/`)
Interface d'administration principale

### 7. **Shared** (`/shared/`)
Composants et utilitaires partagés entre les modules

## Bonnes pratiques

1. **Nommage cohérent** : Utiliser des noms en kebab-case pour les dossiers
2. **Regroupement logique** : Regrouper les fonctionnalités similaires
3. **Séparation des préoccupations** : Chaque dossier a une responsabilité claire
4. **Évolutivité** : Structure facile à étendre avec de nouvelles fonctionnalités

## Navigation

- **Tests** : `/backoffice/tests/` ou directement `/tests/`
- **Sécurité** : `/backoffice/security/` ou directement `/security/`
- **Entités** : `/backoffice/entities/` ou directement `/entities/`
- **Admin** : `/backoffice/admin/` ou directement `/admin/`
- **Applications** : `/backoffice/applications/` ou directement `/applications/`
