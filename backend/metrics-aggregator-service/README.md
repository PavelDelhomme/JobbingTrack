# Metrics Aggregator Service

[← Backend](../README.md) | [← README principal](../../README.md) | [📚 Documentation](../../docs/README.md) | [🧭 Navigation](../../docs/navigation.md)

Service d'agrégation de métriques avec auto-discovery pour la plateforme JobbingTrack.

## 📖 Documentation

- **[Monitoring](../../docs/monitoring/README.md)** – Vue d’ensemble, [METRICS_DB_README](../../docs/monitoring/METRICS_DB_README.md), [MONITORING_GUIDE](../../docs/monitoring/MONITORING_GUIDE.md), [PERFORMANCE_OPTIMIZATION](../../docs/monitoring/PERFORMANCE_OPTIMIZATION.md).
- **[Architecture Métriques](../../docs/architecture/metrics/README.md)** – Documentation technique.
- **[Dépannage Métriques](../../docs/architecture/metrics/troubleshooting/README.md)** – Résolution des problèmes.

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

## Tests et dossier `coverage/` (rapport Jest HTML)

Le répertoire **`coverage/`** à la racine de ce service **n’est pas du code métier** : c’est un **artefact généré localement** par Jest quand les tests tournent avec couverture de code.

| Élément | Détail |
|---------|--------|
| **Origine** | `npm test` exécute `jest --coverage` (`package.json`) |
| **Config** | `jest.config.js` → `coverageDirectory: 'coverage'`, reporters `text`, `lcov`, **`html`** |
| **Contenu** | `index.html` (vue globale), `lcov.info`, sous-dossier `lcov-report/` et miroir `src/**/*.html` (une page par fichier source, lignes vert/rouge) |
| **Git** | Ignoré par `.gitignore` (`coverage/`) — **ne pas committer** |
| **Taille typique** | ~3–4 Mo, des dizaines de fichiers `.html` |
| **Suppression** | Sans risque : `rm -rf coverage` ; régénéré au prochain `npm test` |

Pour consulter le rapport après un run de tests :

```bash
cd backend/metrics-aggregator-service
npm test
# puis ouvrir coverage/index.html dans le navigateur
```

Documentation transverse : **[../../docs/tests/README.md](../../docs/tests/README.md)** (section « Coverage par service backend »).
