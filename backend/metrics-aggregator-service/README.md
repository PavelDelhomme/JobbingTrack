# JobbingTrack Metrics Aggregator Service

[← Backend](../README.md) | [← README principal](../../README.md) | [📚 Documentation](../../docs/README.md) | [🧭 Navigation](../../docs/navigation.md)

📖 **[Architecture Métriques](../../docs/ARCHITECTURE_METRICS_FINAL.md)** | **[Dépannage](../../docs/METRICS_TROUBLESHOOTING.md)**

Service d'agrégation de métriques avec auto-discovery pour la plateforme JobbingTrack.

## Fonctionnalités

- **Auto-discovery** : Détection automatique des conteneurs Docker en cours d'exécution
- **Collecte de métriques** : Récupération des métriques système, mémoire, CPU et réseau
- **Test de santé** : Vérification automatique de l'état de chaque service
- **WebSocket** : Diffusion temps réel des métriques vers le frontend
- **API REST** : Interface pour récupérer les métriques

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
