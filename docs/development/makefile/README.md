# 📘 Guide Makefile - JobbingTrack

[← Retour à la documentation](../../README.md) | [← README principal](../../../README.md) | [🧭 Navigation](../../navigation.md)

## ✨ Système modulaire avec aide contextuelle intégrée

### 🎯 Problème résolu

**AVANT** : Avertissements de conflits partout
```bash
makefiles/backend/Makefile:83: avertissement : surchargement de la recette pour la cible « up »
makefiles/services/Makefile:15: avertissement : ancienne recette ignorée pour la cible « up »
...
```

**APRÈS** : Aucun conflit, système propre et modulaire ✅

---

## 🏗️ Architecture

```
JobbingTrack/
├── Makefile                    # Point d'entrée (INCLUDES TOUT)
└── makefiles/
    ├── shared/common.mk        # Fonctions partagées
    ├── services/Makefile       # up, down, restart, profiles
    ├── diagnostic/Makefile     # health, diagnostic-*
    ├── database/Makefile       # db-*, environnements
    ├── compilation/Makefile    # build, rebuild, clean
    ├── tests/Makefile          # tous les tests
    ├── backend/Makefile        # monitoring UNIQUEMENT
    ├── frontend/Makefile       # commandes frontend spécifiques
    ├── utils/Makefile          # metrics, cadvisor
    └── help/Makefile           # système d'aide ⭐ NOUVEAU
```

---

## 🚀 Utilisation rapide

### Commandes principales

```bash
# Démarrage
make up                 # Services essentiels
make up-full            # TOUS les services
make down               # Arrêter tout

# Diagnostic
make status             # État des services
make health             # Vérifier santé
make diagnostic         # Diagnostic complet

# Tests
make test               # Tous les tests
make test-unit          # Tests unitaires
make lint               # Linting

# Monitoring
make monitoring-up      # Démarrer monitoring
make test-monitoring    # Tester monitoring

# Database
make db-seed            # Données de test
make db-backup          # Sauvegarde
```

---

## 💡 NOUVEAUTÉ : Aide contextuelle intégrée

### Système `help-<module>`

Chaque module dispose maintenant d'une aide complète et détaillée :

```bash
# Aide par module
make help-services        # Aide services (up, down, restart, etc.)
make help-backend         # Aide backend/monitoring
make help-frontend        # Aide frontend Next.js
make help-database        # Aide base de données
make help-compilation     # Aide build/rebuild
make help-diagnostic      # Aide diagnostic et corrections
make help-tests           # Aide tous les tests
make help-utils           # Aide utilitaires monitoring

# Aide générale (depuis makefiles/help/Makefile)
make help-up              # Aide détaillée 'make up'
make help-down            # Aide arrêter services
make help-status          # Aide vérifier état
make help-logs            # Aide logs
make help-monitoring-up   # Aide monitoring
make help-test            # Aide tests
make help-build           # Aide build
make help-clean           # Aide nettoyage
```

### Exemple d'utilisation

```bash
$ make help-up
================================================================
🚀 AIDE: make up
================================================================

📝 DESCRIPTION:
  Démarre les services essentiels de JobbingTrack:
  - PostgreSQL (base de données)
  - Redis (cache)
  - API Gateway
  - Frontend Next.js
  - Auth Service
  - Dashboard Service

🔧 USAGE:
  make up

🌐 ACCÈS:
  Frontend:    http://localhost:8080
  API Gateway: http://localhost:3000

⚙️ OPTIONS:
  make up-no-check  - Démarre sans vérification Docker
  make up-full      - Démarre TOUS les services

📋 VOIR AUSSI:
  make help-down       - Arrêter les services
  make help-status     - Vérifier l'état
```

---

## 📦 Commandes par catégorie

### 🚀 Services (makefiles/services/)
```bash
make up                 # Démarrer essentiels
make up-no-check        # Sans vérification Docker
make up-full            # TOUS les services
make down               # Arrêter tout
make restart            # Redémarrer actifs
make restart-clean      # Redémarrage + nettoyage
make status             # Statut détaillé
make ps                 # Liste conteneurs
make logs               # Tous les logs
```

### 🔍 Diagnostic (makefiles/diagnostic/)
```bash
make health             # Vérifier santé
make check-deps         # Vérifier dépendances
make diagnostic         # Diagnostic complet
make diagnostic-docker  # Docker uniquement
make diagnostic-cors    # CORS uniquement
make diagnostic-fix     # Correction auto
make cors-fix           # Corriger CORS
```

### 🗄️ Database (makefiles/database/)
```bash
make db-migrate         # Migrations
make db-seed            # Données test
make db-reset           # Reset DB
make db-backup          # Sauvegarde
make db-restore file=x  # Restauration
make db-up-dev          # PostgreSQL + Redis dev seuls (compose test)
make up-test            # Env test
make up-all-dbs         # Tous les envs
```

### 🔨 Build (makefiles/compilation/)
```bash
make build              # Build services
make rebuild            # Rebuild sans cache
make clean              # Nettoyage
make clean-force        # Nettoyage d'urgence
```

### 🧪 Tests (makefiles/tests/)
```bash
make test               # Tous les tests
make test-unit          # Unitaires
make test-integration   # Intégration
make test-e2e           # E2E
make test-backend       # Backend
make test-frontend      # Frontend
make lint               # Linting
make format             # Formatage
```

### 📊 Monitoring (makefiles/backend/)
```bash
make monitoring-up      # Démarrer monitoring
make monitoring-down    # Arrêter monitoring
make monitoring-ps      # Status services
make monitoring-logs-service SERVICE=prometheus
make test-monitoring    # Tests monitoring
```

### 🖥️ Frontend (makefiles/frontend/)
```bash
make dev-frontend       # Dev server
make build-frontend     # Build prod
make lint-frontend      # ESLint
make format-frontend    # Prettier
make type-check-frontend      # tsc --noEmit
make type-check-frontend-log  # idem + fichier frontend/logs/tsc-<date>.log (évite la troncature terminal)
make test-unit-frontend # Tests unitaires
```

### 🔧 Utils (makefiles/utils/)
```bash
make metrics            # Ouvrir Prometheus
make cadvisor           # Ouvrir cAdvisor
make logs-metrics       # Logs métriques
```

---

## 🎓 Tutoriel pas à pas

### Première utilisation

```bash
# 1. Vérifier les dépendances
make check-deps

# 2. Obtenir de l'aide sur une commande
make help-up

# 3. Démarrer les services
make up

# 4. Vérifier le statut
make status

# 5. Voir les logs
make logs
```

### Workflow de développement

```bash
# 1. Démarrer la stack complète (ou tout-en-un dev + BDD + tests depuis la racine)
make up-full
# ou : make up-dev   # racine uniquement : up-full → db-push-all → seed-auth → tests

# 2. Voir les logs en temps réel
make logs

# 3. Lancer les tests
make test-unit

# 4. Vérifier le code
make lint

# 5. Arrêter proprement
make down
```

### Debugging

```bash
# 1. Diagnostic complet
make diagnostic

# 2. Vérifier la santé
make health

# 3. Voir les logs d'un service
make logs-service SERVICE=api-gateway

# 4. Correction automatique
make diagnostic-fix
```

---

## ⚙️ Configuration

### Variables d'environnement

Les makefiles utilisent ces variables (définies dans `Makefile` racine):
- `ROOT_DIR` - Répertoire racine
- `BACKEND_DIR` - Répertoire backend
- `FRONTEND_DIR` - Répertoire frontend
- `TESTS_DIR` - Répertoire tests
- `MONITORING_DIR` - Répertoire monitoring

### Personnalisation

Pour ajouter une commande :

1. **Services généraux** → `makefiles/services/Makefile`
2. **Monitoring** → `makefiles/backend/Makefile`
3. **Frontend** → `makefiles/frontend/Makefile`
4. **Tests** → `makefiles/tests/Makefile`
5. **Aide** → `makefiles/help/Makefile`

---

## 🐛 Dépannage

### Problème : Avertissements de conflits

**Solution** : Les anciens makefiles dupliqués ont été nettoyés. Si vous voyez encore des avertissements :

```bash
# Supprimer les fichiers obsolètes
find makefiles -name "*.old" -o -name "*.backup" -delete
```

### Problème : Commande non trouvée

**Solution** : Vérifier l'include dans le `Makefile` racine

```bash
# Le Makefile racine doit contenir :
include makefiles/services/Makefile
include makefiles/diagnostic/Makefile
# etc.
```

### Problème : Erreur Docker Compose

**Solution** : 
```bash
make check-deps          # Vérifier installation
make clean-docker-cache  # Nettoyer cache
```

---

## 📚 Ressources

- **Documentation complète** : `makefiles/README.md`
- **Aide générale** : `make help`
- **Aide contextuelle** : `make help-<commande>`
- **Backend** : `make backend-help`
- **Frontend** : `make frontend-help`

---

## ✅ Checklist migration

- [x] Supprimer duplications backend/Makefile
- [x] Supprimer duplications frontend/Makefile  
- [x] Créer système d'aide makefiles/help/Makefile
- [x] Nettoyer fichiers obsolètes
- [x] Documenter le nouveau système
- [ ] Tester toutes les commandes principales
- [ ] Former l'équipe

---

## 🎉 Avantages

✅ **Aucun avertissement de conflit**  
✅ **Structure modulaire claire**  
✅ **Aide contextuelle pour chaque commande**  
✅ **150+ commandes accessibles depuis la racine**  
✅ **Facile à maintenir et étendre**  
✅ **Documentation intégrée**

---

## 🚀 Prochaines étapes

1. Tester : `make help-up && make up`
2. Explorer : `make help`
3. Développer : `make dev-frontend`
4. Monitorer : `make monitoring-up`

**Besoin d'aide ?** → `make help-<commande>` ! 🎯
