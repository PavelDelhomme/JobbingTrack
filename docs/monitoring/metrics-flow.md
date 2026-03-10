# Flux des métriques (organisation type ex-systems)

Documentation du **nouveau système de métriques** : qui collecte quoi, qui appelle qui, quels ports.

## Schéma des flux

```
[ Host / conteneurs Docker ]
         │
         ▼
  monitoring-c (ex-systems)     ← Collecte bas niveau (CPU, mémoire, disque, conteneurs)
  Port hôte: 5098  |  Interne: 8015
         │
         │  GET /api/v1/metrics
         ▼
  metrics-aggregator (Node)    ← Agrégation, persistance PostgreSQL, santé des services
  Port hôte: 5004  |  Interne: 3014
         │
         │  GET /api/v1/metrics  (données temps réel)
         │  GET /api/v1/persistence/system/metrics  (historique)
         │  POST /api/v1/persistence/logs  (centralLogger)
         ▼
  Frontend backoffice (5003)   ← Vue d’ensemble, Analytics, Status
```

## Rôles

| Composant | Rôle | Port (hôte) |
|-----------|------|-------------|
| **monitoring-c** | Collecteur C (ex-systems), métriques système + conteneurs, healthchecks | 5098 |
| **metrics-aggregator** | Agrège les données (monitoring-c ou fallback Docker), persiste en PostgreSQL, expose une seule API pour le frontend | 5004 |
| **Frontend** | Appelle **uniquement** le metrics-aggregator (5004) pour métriques et historique (pas 5098 pour l’historique) | 5003 |

## Authentification métriques

- **Endpoint** : `GET /api/v1/metrics` (metrics-aggregator).
- **Comportement** :  
  - Si `ENABLE_METRICS_AUTH=true` ou `NODE_ENV=production` : **authentification requise** (`X-API-Key` ou `Authorization: Bearer <token>`).  
  - Sinon : accès libre, un seul log au démarrage.
- Le backoffice envoie déjà le JWT utilisateur. Pour les appels server-to-server, définir `METRICS_API_KEY` dans le `.env`.

## Parties à compléter (alignement ex-systems)

- Métriques **réseau** (RX/TX) remontées jusqu’au backoffice.
- **Logs centralisés** : centralLogger utilisé dans tous les microservices → `POST /api/v1/persistence/logs`.
- **Santé des services** : déjà agrégée par metrics-aggregator ; s’assurer que l’interface Status affiche tous les champs (CPU/mémoire projet, temps de réponse).
- Documentation des **ports et variables** dans `.env.example` (METRICS_AGGREGATOR_URL, ENABLE_METRICS_AUTH, etc.).

Voir aussi **STATUS.md** (sections « Modifications prévues » et « Interface Status »).
