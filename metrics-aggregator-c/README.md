# Metrics Aggregator Service (C)

Service d'agrégation de métriques en C pour la plateforme JobbingTrack.

## 🎯 Version Simplifiée

Cette version simplifiée permet de tester rapidement les fonctionnalités essentielles :
- ✅ Persistance PostgreSQL (libpq)
- ✅ Cache en mémoire (30s TTL)
- ✅ Serveur HTTP avec routes principales
- ✅ Requêtes SQL optimisées
- ✅ Support CORS

## 🚀 Compilation

```bash
cd metrics-aggregator-c
make
```

## 📦 Exécution

```bash
./bin/metrics-aggregator-c [port]
```

Par défaut, le port est `8014`.

## 🔌 API Endpoints

### Health Check
```bash
curl http://localhost:8014/api/v1/health
```

### Récupérer les métriques système
```bash
curl "http://localhost:8014/api/v1/persistence/system/metrics?limit=100&offset=0"
```

### Statistiques
```bash
curl http://localhost:8014/api/v1/persistence/stats
```

## ⚙️ Variables d'environnement

- `POSTGRES_HOST` - Hôte PostgreSQL (défaut: `postgres`)
- `POSTGRES_PORT` - Port PostgreSQL (défaut: `5432`)
- `POSTGRES_DB` - Nom de la base (défaut: `jobbingtrack`)
- `POSTGRES_USER` - Utilisateur (défaut: `jobbingtrack`)
- `POSTGRES_PASSWORD` - Mot de passe (défaut: `jobbingtrack123`)

## 📊 Fonctionnalités

### Cache
- Cache en mémoire avec TTL configurable (30s par défaut)
- Nettoyage automatique des entrées expirées
- Hash table pour accès rapide

### Persistance
- Connexion PostgreSQL avec libpq
- Requêtes SQL optimisées avec index
- Gestion des erreurs de connexion

### Serveur HTTP
- Serveur HTTP simple et léger
- Support CORS pour le frontend
- Routes API RESTful

## 🔄 Améliorations futures

- [ ] Collecte de métriques Docker
- [ ] WebSocket pour temps réel
- [ ] Préparation des requêtes SQL (prepared statements)
- [ ] Compression des réponses
- [ ] Authentification API
- [ ] Logs structurés
- [ ] Métriques de performance

## 📝 Notes

Cette version utilise les tables créées par `monitoring-c` (`system_metrics` et `container_metrics`).
Le service `monitoring-c` s'occupe de la collecte et de la sauvegarde, ce service s'occupe de l'agrégation et de l'exposition via API.

