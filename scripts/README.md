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

## 🎮 Commandes Make Simplifiées

**4 commandes essentielles pour tester** :

```bash
make tests-help              # Guide complet d'utilisation
make tests-reset             # Reset complet (BDD + services)
make tests-user-journey      # Test automatique via API
make tests-interface-web     # Interface web de test
```

### 📖 Processus Complet

**1. Première fois ou après `make down`** :
```bash
make tests-reset
# ↓ Fait TOUT automatiquement :
# - Arrête les services
# - Redémarre pour tests
# - Crée les tables
# - Crée l'admin
```

**2. Tester via API (rapide)** :
```bash
make tests-user-journey
# ↓ Teste automatiquement tout le parcours
```

**3. Tester via navigateur (visuel)** :
```bash
make tests-interface-web
# ↓ Ouvre http://localhost:8080/backoffice/user-journey
```

### 🔍 Différence user-journey vs interface-web

**tests-user-journey** :
- ✓ Automatique, rapide
- ✓ Via API
- ✓ Résultats dans le terminal
- ✓ Parfait pour vérifier que tout fonctionne

**tests-interface-web** :
- ✓ Manuel, visuel
- ✓ Via navigateur
- ✓ Interface graphique
- ✓ Parfait pour débugger

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

