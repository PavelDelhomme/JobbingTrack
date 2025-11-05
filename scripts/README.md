# 📁 Scripts - Organisation

Ce dossier contient tous les scripts utilitaires du projet JobbingTrack, organisés par catégorie.

## 🗂️ Structure des Dossiers

```
scripts/
├── db/                     # 🗄️  Base de données
│   └── run-prisma-migrations.sh
│
├── docker/                 # 🐳 Docker
│   ├── cleanup-docker-volumes.sh
│   └── verify-docker-setup.sh
│
├── health/                 # 💊 Santé des services
│   ├── check-env.sh
│   └── check-services.sh
│
├── monitoring/             # 📊 Monitoring & Métriques
│   ├── check_integration.sh
│   ├── clean-monitoring.sh
│   ├── monitoring.sh
│   ├── restart-metrics.sh  ⬅️ DÉPLACÉ ICI
│   ├── start-metrics.sh
│   └── test-metrics.sh
│
├── testing/                # 🧪 Tests
│   ├── cleanup.sh          ⬅️ DÉPLACÉ ICI
│   ├── run-complete-tests.sh  ⬅️ DÉPLACÉ ICI
│   ├── test-containers-access.sh
│   ├── test-reset-password.sh
│   └── verify-all-metrics.sh  ⬅️ DÉPLACÉ ICI
│
├── utils/                  # 🔧 Utilitaires
│   ├── cleanup-old-files.sh
│   └── rebuild-all.sh
│
└── verify-user-journey.sh  # 🎯 Test User Journey (racine)
```

## 🎯 Scripts Principaux

### verify-user-journey.sh
**Emplacement** : `scripts/verify-user-journey.sh`

Test complet du parcours utilisateur via API :
- Authentification (Register/Login)
- Companies (List/Create)
- Applications (List/Create)
- Contacts, Interviews, Calls, Followups
- Génération de token permanent (100 ans)

**Utilisation** :
```bash
bash scripts/verify-user-journey.sh
# OU
make tests-user-journey
```

## 🗄️ Base de Données

### run-prisma-migrations.sh
Exécute les migrations Prisma sur tous les services.

## 🐳 Docker

### cleanup-docker-volumes.sh
Nettoie les volumes Docker inutilisés.

### verify-docker-setup.sh
Vérifie que Docker est bien configuré.

## 💊 Santé des Services

### check-env.sh
Vérifie que toutes les variables d'environnement sont définies.

### check-services.sh
Vérifie que tous les services sont opérationnels.

## 📊 Monitoring & Métriques

### restart-metrics.sh
Redémarre le service de métriques.

### start-metrics.sh
Démarre le monitoring des métriques.

### test-metrics.sh
Teste la collecte des métriques.

### check_integration.sh
Vérifie l'intégration du monitoring.

### clean-monitoring.sh
Nettoie les données de monitoring.

## 🧪 Testing

### run-complete-tests.sh
Lance la suite complète de tests (API, E2E, intégration).

**Utilisation** :
```bash
bash scripts/testing/run-complete-tests.sh
# OU
make tests-complete
```

### verify-all-metrics.sh
Vérifie que toutes les métriques sont collectées correctement.

**Utilisation** :
```bash
bash scripts/testing/verify-all-metrics.sh
# OU
make tests-metrics
```

### cleanup.sh
Nettoie les fichiers temporaires de tests.

**Utilisation** :
```bash
bash scripts/testing/cleanup.sh
# OU
make tests-cleanup
```

### test-containers-access.sh
Teste l'accès aux containers Docker.

### test-reset-password.sh
Teste la fonctionnalité de reset de mot de passe.

## 🔧 Utilitaires

### cleanup-old-files.sh
Nettoie les anciens fichiers du projet.

### rebuild-all.sh
Rebuild tous les services Docker.

## 🎮 Commandes Make Disponibles

Toutes ces commandes sont accessibles via le Makefile :

```bash
# Aide sur les tests
make tests-help

# Tests principaux
make tests-user-journey      # Test parcours utilisateur
make tests-start             # Interface web de test
make tests-complete          # Suite complète de tests
make tests-e2e               # Tests Playwright

# Tests spécifiques
make tests-metrics           # Vérifier métriques
make tests-api               # Tests API
make tests-database          # Tests DB
make tests-integration       # Tests d'intégration

# Utilitaires
make tests-cleanup           # Nettoyer fichiers tests
make tests-reset             # Reset complet + redémarrage
make tests-all               # Lancer TOUS les tests
```

## 📝 Conventions

1. **Noms de fichiers** : `kebab-case.sh`
2. **Shebang** : Toujours `#!/bin/bash`
3. **Documentation** : Commentaires en début de fichier
4. **Messages** : Emojis pour clarté visuelle
5. **Erreurs** : Exit codes appropriés (0 = succès, 1 = erreur)

## 🔗 Liens Utiles

- [Documentation Tests](../docs/tests/)
- [STATUS.md](../STATUS.md) - État du projet
- [Makefile](../Makefile) - Commandes disponibles

