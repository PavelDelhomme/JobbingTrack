# Scripts Utils - JobbingTrack

[← Retour à la documentation des scripts](../README.md)

## 🎯 Vue d'ensemble

Les scripts utilitaires fournissent des outils et fonctions communes utilisés par les autres scripts du projet JobbingTrack.

## 📁 Scripts disponibles

| Script | Description | Usage |
|--------|-------------|-------|
| `wait-for-service.sh` | Attend qu'un service soit disponible | `./scripts/utils/wait-for-service.sh service port` |

## 🛠️ Utilitaires disponibles

### wait-for-service.sh

Attend qu'un service soit disponible avant de continuer l'exécution.

```bash
# Attendre PostgreSQL
./scripts/utils/wait-for-service.sh postgres 5432

# Attendre API Gateway
./scripts/utils/wait-for-service.sh api-gateway 3000

# Attendre avec timeout personnalisé
./scripts/utils/wait-for-service.sh redis 6379 --timeout=60

# Attendre avec intervalle personnalisé
./scripts/utils/wait-for-service.sh frontend 8080 --interval=5
```

#### Options disponibles

- `--timeout=<seconds>` : Timeout en secondes (défaut: 30)
- `--interval=<seconds>` : Intervalle entre les tentatives (défaut: 2)
- `--quiet` : Mode silencieux (pas de messages)
- `--verbose` : Mode verbeux (plus de détails)

## 🔧 Fonctions communes

### Vérification des prérequis

```bash
# Vérifier que Docker est installé et démarré
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker n'est pas installé"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo "❌ Docker n'est pas démarré"
        exit 1
    fi
}
```

### Gestion des couleurs

```bash
# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher des messages colorés
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}
```

### Gestion des erreurs

```bash
# Configuration pour arrêter sur erreur
set -e

# Fonction de nettoyage
cleanup() {
    log_info "Nettoyage en cours..."
    # Code de nettoyage
}

# Traitement des signaux
trap cleanup EXIT INT TERM
```

## 📊 Utilitaires de monitoring

### Vérification de santé

```bash
# Vérifier la santé d'un service
check_service_health() {
    local service=$1
    local port=$2
    
    if curl -f http://localhost:$port/health &> /dev/null; then
        log_success "$service est en bonne santé"
        return 0
    else
        log_error "$service n'est pas accessible"
        return 1
    fi
}
```

### Collecte de métriques

```bash
# Collecter des métriques système
collect_system_metrics() {
    local output_file=$1
    
    {
        echo "=== Métriques système $(date) ==="
        echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)"
        echo "Mémoire: $(free | grep Mem | awk '{printf "%.2f%%", $3/$2 * 100.0}')"
        echo "Disque: $(df -h / | awk 'NR==2{printf "%s", $5}')"
        echo "Docker: $(docker system df --format 'table {{.Type}}\t{{.TotalCount}}\t{{.Size}}')"
    } > "$output_file"
}
```

## 🔄 Intégration avec autres scripts

### Utilisation dans les scripts core

```bash
#!/usr/bin/env bash

# Inclure les utilitaires
source "$(dirname "$0")/../utils/wait-for-service.sh"

# Utiliser les fonctions
check_docker
wait_for_service postgres 5432
log_success "Services démarrés avec succès"
```

### Utilisation dans les scripts de test

```bash
#!/usr/bin/env bash

# Inclure les utilitaires
source "$(dirname "$0")/../utils/wait-for-service.sh"

# Attendre que les services soient prêts avant les tests
wait_for_service api-gateway 3000
wait_for_service frontend 8080
```

## 📁 Structure des utilitaires

```
scripts/utils/
├── README.md                    # Cette documentation
├── wait-for-service.sh         # Attente de services
├── colors.sh                   # Gestion des couleurs
├── logging.sh                  # Fonctions de logging
├── validation.sh               # Validation des entrées
└── metrics.sh                  # Collecte de métriques
```

## 🔧 Configuration

### Variables d'environnement

```bash
# Configuration des timeouts
export DEFAULT_TIMEOUT=30
export DEFAULT_INTERVAL=2

# Configuration des logs
export LOG_LEVEL=info
export LOG_FILE="/tmp/jobbingtrack-utils.log"

# Configuration des couleurs
export USE_COLORS=true
```

### Fichiers de configuration

- `config/utils.json` : Configuration des utilitaires
- `.env` : Variables d'environnement locales

## 🐛 Résolution de problèmes

### Problèmes courants

1. **Scripts qui ne trouvent pas les utilitaires**
   ```bash
   # Vérifier les chemins relatifs
   source "$(dirname "$0")/../utils/wait-for-service.sh"
   ```

2. **Timeouts trop courts**
   ```bash
   # Augmenter les timeouts
   export DEFAULT_TIMEOUT=60
   ```

3. **Problèmes de permissions**
   ```bash
   # Rendre les scripts exécutables
   chmod +x scripts/utils/*.sh
   ```

### Debugging

```bash
# Mode debug pour les utilitaires
export DEBUG_UTILS=true

# Logs détaillés
export LOG_LEVEL=debug
```

## 🔄 Intégration avec Makefile

Les utilitaires sont utilisés par le Makefile principal :

```bash
# Le Makefile utilise les utilitaires pour :
# - Vérifier les prérequis
# - Attendre que les services soient prêts
# - Afficher des messages colorés
# - Gérer les erreurs
```

## 📚 Ressources supplémentaires

- [Documentation des scripts](../README.md) - Vue d'ensemble
- [Scripts Core](../core/README.md) - Scripts principaux
- [Scripts de test](../testing/README.md) - Tests automatisés
- [Guide de développement](../../docs/DEVELOPMENT.md) - Développement

---

[← Retour à la documentation des scripts](../README.md) | [Scripts Core →](../core/README.md)
