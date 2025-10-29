# Metrics Aggregator Service

[← Backend](../README.md) | [← README principal](../../README.md) | [📚 Documentation](../../docs/README.md) | [🧭 Navigation](../../docs/navigation.md)

Service d'agrégation de métriques avec auto-discovery pour la plateforme JobbingTrack.

## 📖 Documentation complète

- **[Architecture Métriques](../../docs/architecture/metrics/README.md)** - Documentation technique complète
- **[Dépannage Métriques](../../docs/architecture/metrics/troubleshooting/README.md)** - Résolution des problèmes
- **[Monitoring Global](../../monitoring/README.md)** - Vue d'ensemble du monitoring

## 🚀 Démarrage rapide

```bash
# Depuis la racine du projet
make help-backend      # Voir toutes les commandes disponibles
make up                # Démarrer tous les services
```

Pour plus d'informations, consultez la [documentation complète](../../docs/architecture/metrics/README.md).

## Fonctionnalités

- Auto-discovery : déction automatique des conteneurs docker en cours d'exécution
- Collect de métriques : récupération des métriques système, mémoire, CPU et réseau
- Test de santé : vérification automatique de l'état de chaque service
- WebSocket : diffusion temps réel des métriques vers le frontend
- API REST : Interface pour récupérer les métriques
## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │◄──►│ JobbingTrack     │◄──►│  Docker API     │
│   Dashboard     │    │   Aggregator     │    │  cAdvisor       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Services      │
                       │   Backend       │
                       └─────────────────┘
```

## Installation

1. Construire l'image Docker :
```bash
docker build -t jobbingtrack-metrics-aggregator .
```

2. Démarrer le service :
```bash
docker-compose up jobbingtrack-metrics-aggregator
```

## API Endpoints

- `GET /api/v1/health` - État du service
- `GET /api/v1/metrics` - Toutes les métriques
- `GET /api/v1/services` - Liste des services découverts
- `GET /api/v1/services/:serviceName` - Métriques d'un service spécifique

## WebSocket Events

- `metrics-update` : Diffusion des métriques mises à jour

## Variables d'environnement

- `NODE_ENV` : Environnement (development/production)
- `PORT` : Port du service (3014 par défaut)
- `FRONTEND_URL` : URL du frontend pour CORS
- `COLLECTION_INTERVAL` : Intervalle de collecte en secondes (10 par défaut)

## Services découverts automatiquement

Le service découvre automatiquement tous les conteneurs Docker correspondant aux patterns suivants :

- Services backend (auth-service, application-service, etc.)
- Base de données PostgreSQL
- Cache Redis
- Services personnalisés avec leurs endpoints de santé

## Métriques collectées

### Métriques système
- Utilisation CPU
- Mémoire utilisée/totale
- Charge système
- Espace disque

### Métriques par service
- État de santé (online/offline)
- Temps de réponse
- Version du service
- Ressources utilisées (mémoire, CPU)

### Métriques réseau
- Octets reçus/émis
- Connexions actives
