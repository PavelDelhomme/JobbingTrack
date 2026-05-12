# 📁 Makefiles - Organisation Modulaire

[← Retour au README principal](../README.md) | [📚 Documentation](../docs/README.md) | [🧭 Navigation](../docs/navigation.md)

📖 **[Guide complet Makefile](../docs/development/makefile/README.md)** - Nouveau système avec aide intégrée

## 🎯 Objectif

Tous les Makefiles sont organisés de manière modulaire dans ce dossier. Le `Makefile` racine les inclut automatiquement, rendant **TOUTES** les commandes accessibles depuis la racine du projet.

## 🏗️ Structure

```
/
├── Makefile                          # Point d'entrée unique (includes tout)
└── makefiles/
    ├── shared/
    │   └── common.mk                 # Fonctions réutilisables
    ├── services/
    │   └── Makefile                  # Démarrage/arrêt services
    ├── diagnostic/
    │   └── Makefile                  # Diagnostics et corrections
    ├── database/
    │   └── Makefile                  # Gestion base de données
    ├── compilation/
    │   └── Makefile                  # Build et nettoyage
    ├── tests/
    │   └── Makefile                  # Tous les tests
    ├── backend/
    │   └── Makefile                  # Backend + monitoring
    ├── frontend/
    │   └── Makefile                  # Frontend Next.js
    ├── utils/
    │   └── Makefile                  # Utilitaires divers
    ├── Makefile                      # Commandes générales (help)
    └── README.md                     # Ce fichier
```

## ✨ Fonctionnement

### Depuis la RACINE du projet

**Toutes les commandes sont accessibles directement :**

```bash
# Commandes générales (makefiles/Makefile)
make up
make down
make status
make logs

# Commandes backend (makefiles/backend/Makefile)
make monitoring-up
make monitoring-down
make monitoring-ps
make test-monitoring

# Commandes frontend (makefiles/frontend/Makefile)
make dev-frontend
make build-frontend
make type-check-frontend       # tsc --noEmit (conteneur si up, sinon hôte)
make type-check-frontend-log  # idem + fichier frontend/logs/tsc-<date>.log (sortie complète)
```

### Ordre des includes

Le `Makefile` racine charge dans cet ordre :

1. **`makefiles/shared/common.mk`** - Fonctions communes (couleurs, messages, etc.)
2. **`makefiles/services/Makefile`** - Gestion des services Docker
3. **`makefiles/diagnostic/Makefile`** - Diagnostics et corrections
4. **`makefiles/database/Makefile`** - Gestion base de données
5. **`makefiles/compilation/Makefile`** - Build et nettoyage
6. **`makefiles/tests/Makefile`** - Suite de tests complète
7. **`makefiles/backend/Makefile`** - Backend + monitoring
8. **`makefiles/frontend/Makefile`** - Frontend Next.js
9. **`makefiles/utils/Makefile`** - Utilitaires (quick access)
10. **`makefiles/Makefile`** - Commandes générales et help

## 📚 Aides Disponibles

```bash
make help              # Aide générale
make help-backend      # Aide backend complète
make help-frontend     # Aide frontend complète
```

## ➕ Ajouter une Nouvelle Commande

### Catégories disponibles

| Catégorie | Makefile | Usage |
|----------|----------|-------|
| **Services** | `makefiles/services/Makefile` | up, down, restart, profiles |
| **Diagnostic** | `makefiles/diagnostic/Makefile` | health, diagnostic-*, cors-fix |
| **Database** | `makefiles/database/Makefile` | db-*, db-up-dev, up-test |
| **Build** | `makefiles/compilation/Makefile` | build, rebuild, clean |
| **Tests** | `makefiles/tests/Makefile` | test-*, lint, format |
| **Backend** | `makefiles/backend/Makefile` | monitoring-*, backend specifics |
| **Frontend** | `makefiles/frontend/Makefile` | frontend specifics |
| **Utils** | `makefiles/utils/Makefile` | metrics |
| **Général** | `makefiles/Makefile` | help, info |

### Exemple : Ajouter une commande de service

Éditez `makefiles/services/Makefile` :

```makefile
mon-service-custom: ## Démarrer mon service personnalisé
	@echo "🚀 Démarrage..."
	$(call docker_compose, up -d mon-service)
```

Puis depuis la racine :
```bash
make mon-service-custom
```

### Pour une fonction réutilisable

Éditez `makefiles/shared/common.mk` :

```makefile
# Exemple de fonction
define ma_fonction
	@echo "$(GREEN)✅ Ma fonction$(NC)"
endef
```

## 📊 Catégories de Commandes

### 🚀 Services (makefiles/services/Makefile)
```bash
make up                 # Démarrer services essentiels
make dev-https-up       # Démarrer le proxy HTTPS local fiable
make dev-https-install-ca # Installer la CA locale navigateur si possible
make up-no-check        # Démarrer SANS vérification Docker
make up-full            # Démarrer TOUS les services
make down               # Arrêter tous les services
make restart            # Redémarrer conteneurs actifs (pas de --force-recreate)
make restart-metrics-recreate  # Recrée monitoring-c + metrics-aggregator (env / image)
make monitoring-clock-refresh  # Recrée postgres + monitoring (fuseaux .env, volumes conservés)
make restart-clean      # Redémarrage avec nettoyage
make up-profile PROFILE=auth  # Démarrer un profil
make stop-service SERVICE=x   # Arrêter un service
make restart-service SERVICE=x # Redémarrer un service
make logs-service SERVICE=x    # Logs d'un service
make status             # Status détaillé (légende ports hôte → conteneur, ex. monitoring-c 8015)
make status-watch       # Boucle : buffer terminal alternatif par défaut (ALTSCREEN=1) — remplace l’affichage sans polluer le scrollback ; ALTSCREEN=0 + CLEAR=1 = ancien clear plein écran ; INTERVAL=5
make status-live        # Idem, INTERVAL=2 par défaut (mêmes variables ALTSCREEN / CLEAR)
make ps                 # Liste conteneurs
make logs               # Tous les logs
```

### 🔍 Diagnostic (makefiles/diagnostic/Makefile)
```bash
make health             # Vérification santé
make check-deps         # Vérifier dépendances
make diagnostic         # Diagnostic complet
make diagnostic-docker  # Diagnostic Docker
make diagnostic-cors    # Diagnostic CORS
make diagnostic-fix     # Correction auto
make cors-fix           # Corriger CORS
make diag-services      # Diagnostic services
```

### 🗄️ Database (makefiles/database/Makefile)
```bash
make db-migrate         # Migrations
make db-seed            # Insérer données test
make db-reset           # Reset DB
make db-backup          # Sauvegarde
make db-restore file=x  # Restauration
make db-fix-role        # Réparer rôle/DB
make db-up-dev          # PostgreSQL + Redis dev (compose test)
make up-test            # Env test
make up-all-dbs         # Tous les envs
make reset-db DB=dev    # Reset env spécifique
```

### 🔨 Build (makefiles/compilation/Makefile)
```bash
make build              # Build tous services
make rebuild            # Rebuild sans cache
make clean              # Nettoyage complet
make clean-force        # Nettoyage d'urgence
```

### 🧪 Tests (makefiles/tests/Makefile)
```bash
make test               # Tous les tests
make test-unit          # Tests unitaires
make test-integration   # Tests intégration
make test-e2e           # Tests E2E
make test-backend       # Tests backend
make test-frontend      # Tests frontend
make test-performance   # Tests performance
make test-all           # Suite complète
make test-coverage      # Avec coverage
make lint               # Linting projet
make format             # Formatage code
```

### 📊 Monitoring (makefiles/backend/Makefile)
```bash
make monitoring-up      # Démarrer monitoring
make monitoring-down    # Arrêter monitoring
make monitoring-ps      # Status services
make monitoring-logs-service SERVICE=x
make test-monitoring    # Tests monitoring
```

### 🔧 Utils (makefiles/utils/Makefile)
```bash
make metrics            # Ouvrir Prometheus
make logs-metrics       # Logs métriques
```

## ⚠️ Attention aux Conflits

Si deux Makefiles définissent la même target (ex: `help`), **la dernière incluse écrase les précédentes**.

**Solution :** Utilisez des préfixes explicites :
- Services : `up-*`, `restart-*`, `stop-*`
- Diagnostic : `diagnostic-*`, `cors-*`
- Database : `db-*`, `db-up-dev`, `up-test` — **`make up-dev` à la racine** = stack + push + seed + tests (ne pas dupliquer dans database)
- Tests : `test-*`, `lint`, `format`
- Monitoring : `monitoring-*`

## 🧪 Commandes de Test

Nouvelles commandes monitoring ajoutées :

```bash
# Backend
make monitoring-ps                              # Status services
make monitoring-logs-service SERVICE=prometheus # Logs d'un service
make monitoring-test-auth TOKEN=xyz             # Test API avec JWT
make test-monitoring                            # Suite de tests complète

# Principal (depuis racine via include)
make test-monitoring                            # Défini dans makefiles/Makefile
```

## 📖 Exemples d'Usage

### Démarrer le monitoring

```bash
# Depuis la racine
make monitoring-up

# Vérifier le status
make monitoring-ps

# Voir les logs d'un service
make monitoring-logs-service SERVICE=prometheus

# Lancer les tests
make test-monitoring
```

### Workflow complet

```bash
# 1. Démarrer tout
make up

# 2. Démarrer monitoring
make monitoring-up

# 3. Vérifier
make status
make monitoring-ps

# 4. Tests
make test-monitoring

# 5. Arrêter
make monitoring-down
make down
```

## 🔍 Diagnostic

Si une commande ne fonctionne pas :

1. **Vérifier que le Makefile racine inclut bien tous les sous-makefiles**
   ```bash
   grep "^include\|^-include" Makefile
   ```

2. **Vérifier que la commande existe dans un sous-makefile**
   ```bash
   grep "ma-commande:" makefiles/*/Makefile
   ```

3. **Tester le Makefile directement**

## 🎨 Convention de Nommage

- **`monitoring-*`** : Gestion monitoring
- **`test-*`** : Tests
- **`db-*`** : Base de données
- **`*-backend`** : Spécifique backend
- **`*-frontend`** : Spécifique frontend

## 💡 Conseils

1. **Toujours travailler depuis la racine** du projet
2. **Ne PAS modifier** le `Makefile` racine (sauf pour ajouter des includes)
3. **Ajouter des descriptions** avec `##` pour que `make help` fonctionne
4. **Tester localement** avant de commit

---

**🚀 JobbingTrack - Système de Makefiles Modulaire v1.0**
