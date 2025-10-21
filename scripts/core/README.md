# Scripts Core - JobbingTrack

[← Retour à la documentation des scripts](../README.md)

## 🎯 Vue d'ensemble

Les scripts core constituent le cœur du système de gestion de JobbingTrack. Ils permettent de démarrer, arrêter et vérifier l'état de santé du système complet.

## 📁 Scripts disponibles

| Script | Description | Usage |
|--------|-------------|-------|
| `start.sh` | Démarre le système avec options avancées | `./scripts/core/start.sh --rebuild --with-metrics` |
| `stop.sh` | Arrête le système proprement | `./scripts/core/stop.sh --clean` |
| `check.sh` | Vérifie l'état de santé du système | `./scripts/core/check.sh --detailed` |

## 🚀 Utilisation

### Démarrage du système

```bash
# Démarrage standard
./scripts/core/start.sh

# Démarrage avec reconstruction des images
./scripts/core/start.sh --rebuild

# Démarrage avec métriques activées
./scripts/core/start.sh --with-metrics

# Démarrage en mode développement
./scripts/core/start.sh --dev
```

### Arrêt du système

```bash
# Arrêt standard
./scripts/core/stop.sh

# Arrêt avec nettoyage des volumes
./scripts/core/stop.sh --clean

# Arrêt avec suppression des images
./scripts/core/stop.sh --remove-images
```

### Vérification de l'état

```bash
# Vérification rapide
./scripts/core/check.sh

# Vérification détaillée
./scripts/core/check.sh --detailed

# Vérification avec correction automatique
./scripts/core/check.sh --fix
```

## ⚙️ Options disponibles

### Options communes

- `--help` : Afficher l'aide détaillée
- `--quick` : Mode rapide (moins de vérifications)
- `--detailed` : Mode détaillé (plus d'informations)
- `--fix` : Tenter de corriger automatiquement les problèmes

### Options spécifiques à start.sh

- `--rebuild` : Reconstruire toutes les images Docker
- `--with-metrics` : Démarrer avec le système de métriques
- `--dev` : Mode développement (hot reload)
- `--profile=<profile>` : Utiliser un profil spécifique

### Options spécifiques à stop.sh

- `--clean` : Nettoyer les volumes Docker
- `--remove-images` : Supprimer les images Docker
- `--force` : Forcer l'arrêt sans confirmation

## 🔧 Configuration

### Variables d'environnement

```bash
# Configuration des timeouts
export STARTUP_TIMEOUT=300
export HEALTH_CHECK_INTERVAL=10

# Configuration des logs
export LOG_LEVEL=info
export LOG_FILE="/tmp/jobbingtrack-core.log"

# Configuration des services
export ENABLE_METRICS=false
export ENABLE_DEV_MODE=false
```

### Fichiers de configuration

- `config/services.json` : Configuration des services
- `config/profiles.json` : Profils de démarrage
- `.env` : Variables d'environnement locales

## 🏗️ Architecture

Les scripts core orchestrent les services suivants :

### Services essentiels (démarrage standard)
- PostgreSQL (base de données)
- Redis (cache)
- API Gateway (point d'entrée)
- Frontend (interface utilisateur)

### Services optionnels (avec --with-metrics)
- Prometheus (métriques)
- Grafana (tableaux de bord)
- cAdvisor (métriques Docker)

### Services de développement (avec --dev)
- Hot reload pour le frontend
- Debug mode pour les services
- Logs détaillés

## 📊 Monitoring et santé

### Vérifications automatiques

Le script `check.sh` effectue les vérifications suivantes :

1. **État des conteneurs Docker**
2. **Connectivité des services**
3. **Santé des bases de données**
4. **Disponibilité des APIs**
5. **Ressources système**

### Codes de sortie

- `0` : Succès
- `1` : Erreur générale
- `2` : Service non disponible
- `3` : Configuration invalide

## 🐛 Résolution de problèmes

### Problèmes courants

1. **Docker non démarré**
   ```bash
   sudo systemctl start docker
   ```

2. **Ports déjà utilisés**
   ```bash
   ./scripts/core/check.sh --fix
   ```

3. **Services ne démarrent pas**
   ```bash
   ./scripts/core/stop.sh --clean
   ./scripts/core/start.sh --rebuild
   ```

### Logs et debugging

- **Logs des scripts** : `/tmp/jobbingtrack-core.log`
- **Logs Docker** : `docker-compose logs`
- **Logs des services** : `make logs`

## 🔄 Intégration avec Makefile

Les scripts core sont intégrés avec le Makefile principal :

```bash
# Équivalents Makefile
make up          # = ./scripts/core/start.sh
make down        # = ./scripts/core/stop.sh
make health      # = ./scripts/core/check.sh --detailed
```

## 📚 Ressources supplémentaires

- [Documentation des scripts](../README.md) - Vue d'ensemble
- [Documentation Makefile](../../docs/MAKEFILE.md) - Commandes Make
- [Guide de développement](../../docs/DEVELOPMENT.md) - Développement
- [Architecture du système](../../docs/ARCHITECTURE.md) - Architecture

---

[← Retour à la documentation des scripts](../README.md) | [Scripts Docker →](../docker/README.md)
