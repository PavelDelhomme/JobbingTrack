# Scripts JobbingTrack

[← Retour au README principal](../README.md) | [📚 Documentation](../docs/README.md) | [🧭 Navigation](../docs/navigation.md)

Cette documentation présente la structure organisée des scripts du projet JobbingTrack. Tous les scripts ont été centralisés et consolidés pour une meilleure maintenabilité et utilisabilité.

## 📁 Structure des dossiers

```
scripts/
├── README.md           # Cette documentation
├── core/              # Démarrage, arrêt, vérification système
├── database/          # Scripts liés à la base de données
├── deployment/        # Déploiement et gestion des services
├── development/       # Développement et utilitaires
├── monitoring/        # Surveillance et métriques
├── security/          # Sécurité et authentification
├── testing/           # Tests automatisés
└── utilities/         # Outils et utilitaires divers
```

## 🚀 Démarrage rapide

### Démarrer le système complet
```bash
./scripts/core/start.sh --with-metrics
```

### Arrêter le système
```bash
./scripts/core/stop.sh --clean
```

### Vérifier l'état du système
```bash
./scripts/core/check.sh --detailed
```

### Exécuter les tests
```bash
./scripts/testing/run-tests.sh --all
```

## 📋 Scripts principaux par catégorie

### 🔧 Core (`scripts/core/`)

Scripts de base pour la gestion du système.

| Script | Description | Usage |
|--------|-------------|-------|
| `start.sh` | Démarre le système avec options avancées | `./scripts/core/start.sh --rebuild --with-metrics` |
| `stop.sh` | Arrête le système proprement | `./scripts/core/stop.sh --clean` |
| `check.sh` | Vérifie l'état de santé du système | `./scripts/core/check.sh --detailed` |

### 🗄️ Database (`scripts/database/`)

Gestion de la base de données PostgreSQL.

| Script | Description | Usage |
|--------|-------------|-------|
| `create-admin-user.sh` | Crée un utilisateur administrateur | `./scripts/database/create-admin-user.sh [email] [password]` |
| `wait-for-postgres.sh` | Attend que PostgreSQL soit prêt | `./scripts/database/wait-for-postgres.sh` |

### 🚀 Deployment (`scripts/deployment/`)

Scripts de déploiement et gestion des services.

| Script | Description | Usage |
|--------|-------------|-------|
| `start-system.sh` | Démarrage principal avec options | `./scripts/deployment/start-system.sh --rebuild` |
| `stop-system.sh` | Arrêt propre du système | `./scripts/deployment/stop-system.sh --clean` |
| `restart-system.sh` | Redémarrage complet | `./scripts/deployment/restart-system.sh` |

### 🔧 Development (`scripts/development/`)

Outils de développement et débogage.

| Script | Description | Usage |
|--------|-------------|-------|
| `setup-colors.sh` | Configure les couleurs du terminal | `./scripts/development/setup-colors.sh` |
| `fix-connection.sh` | Corrige les problèmes de connexion | `./scripts/development/fix-connection.sh` |

### 📊 Monitoring (`scripts/monitoring/`)

Surveillance et métriques du système.

| Script | Description | Usage |
|--------|-------------|-------|
| `start.sh` | Démarre le système de monitoring | `./scripts/monitoring/start.sh` |
| `stop.sh` | Arrête les services de monitoring | `./scripts/monitoring/stop.sh` |
| `health-monitor.sh` | Surveillance continue | `./scripts/monitoring/health-monitor.sh 60` |

### 🔒 Security (`scripts/security/`)

Sécurité et authentification.

| Script | Description | Usage |
|--------|-------------|-------|
| `firewall-setup.sh` | Configure le firewall | `./scripts/security/firewall-setup.sh` |
| `security-monitoring-setup.sh` | Configure la surveillance sécurité | `./scripts/security/security-monitoring-setup.sh` |

### 🧪 Testing (`scripts/testing/`)

Tests automatisés du système.

| Script | Description | Usage |
|--------|-------------|-------|
| `run-tests.sh` | Exécute les tests automatisés | `./scripts/testing/run-tests.sh --auth` |
| `test-integration.sh` | Tests d'intégration | `./scripts/testing/test-integration.sh` |
| `test-e2e.sh` | Tests end-to-end | `./scripts/testing/test-e2e.sh` |

### 🛠️ Utilities (`scripts/utilities/`)

Outils et utilitaires divers.

| Script | Description | Usage |
|--------|-------------|-------|
| `docker-exec.sh` | Exécute des commandes dans les conteneurs | `./scripts/utilities/docker-exec.sh service command` |
| `logs.sh` | Gestion centralisée des logs | `./scripts/utilities/logs.sh` |

## 🎯 Utilisation avancée

### Options communes

La plupart des scripts supportent ces options :

- `--help` : Afficher l'aide détaillée
- `--quick` : Mode rapide (moins de vérifications)
- `--detailed` : Mode détaillé (plus d'informations)
- `--fix` : Tenter de corriger automatiquement les problèmes

### Variables d'environnement

Plusieurs scripts supportent des variables d'environnement :

```bash
# Configuration admin par défaut
export SUPER_ADMIN_EMAIL="admin@jobbingtrack.test"
export SUPER_ADMIN_PASSWORD="password123"

# Configuration des timeouts
export DB_CONNECTION_TIMEOUT=30
export HEALTH_CHECK_INTERVAL=60

# Configuration des logs
export LOG_LEVEL=info
export LOG_FILE="/tmp/jobbingtrack.log"
```

## 🏗️ Structure des scripts

Tous les scripts respectent les standards suivants :

- **Shebang**: `#!/usr/bin/env bash`
- **Gestion d'erreurs**: `set -e` activé
- **Messages colorés**: Utilisation cohérente des couleurs
- **Documentation**: Headers avec description, usage et exemples
- **Codes de sortie**: 0 (succès), 1 (erreur), 2 (erreur d'usage)

### Exemple de structure de script

```bash
#!/usr/bin/env bash

# ============================================================================
# Nom du script - JobbingTrack
# ============================================================================
# Description brève du script
#
# Usage: ./scripts/categorie/script.sh [OPTIONS]
#
# Options:
#   --option          Description de l'option
#   --help            Afficher cette aide
#
# Exemples:
#   ./scripts/categorie/script.sh --option valeur
# ============================================================================

set -e

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonction d'aide
show_help() {
    # Implementation de l'aide
}

# Gestion des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --option)
            # Traitement de l'option
            ;;
        --help)
            show_help
            exit 0
            ;;
    esac
done

# Code principal
main() {
    echo "Script en cours d'exécution"
}

main "$@"
```

## 🔄 Migration depuis l'ancienne structure

Les scripts ont été déplacés depuis plusieurs emplacements :

- `tests/` → `scripts/testing/`
- `monitoring/` → `scripts/monitoring/`
- `frontend/scripts/` → `scripts/testing/` (tests frontend)
- Scripts éparpillés → Regroupés par fonctionnalité

## 📊 Métriques et monitoring

Le système inclut un système de métriques complet basé sur Prometheus, Grafana et cAdvisor.

### Démarrer le monitoring
```bash
./scripts/core/start.sh --with-metrics
```

### Interfaces de monitoring
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:4000 (admin/admin)
- **cAdvisor**: http://localhost:8080

## 🔍 Résolution de problèmes

### Problèmes courants

1. **Docker non démarré**
   ```bash
   sudo systemctl start docker
   ```

2. **Services non accessibles**
   ```bash
   ./scripts/core/check.sh --fix
   ```

3. **Base de données non accessible**
   ```bash
   ./scripts/database/wait-for-postgres.sh
   ```

### Logs et debugging

- **Logs des services**: `make logs`
- **Logs de monitoring**: `/tmp/jobbingtrack-health-monitor.log`
- **Rapports de tests**: `test-results/`

## 📚 Ressources supplémentaires

- [README principal](../README.md) - Documentation générale
- [Guide des métriques](../METRICS_SYSTEM_README.md) - Système de métriques
- [Makefile](../Makefile) - Commandes Make disponibles

---

**Dernière mise à jour**: Octobre 2025
**Version**: 3.0 - Restructuration complète avec nouvelle organisation
