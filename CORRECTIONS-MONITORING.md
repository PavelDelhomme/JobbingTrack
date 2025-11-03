# 🔧 Corrections du système de monitoring

## Problèmes corrigés ✅

### 1. Erreur DATABASE_URL
**Problème** : Le service `metrics-aggregator-service` ne pouvait pas se connecter à la base de données car `DATABASE_URL` n'était pas définie.

**Solution** :
- Ajout d'une initialisation conditionnelle de Prisma
- La persistance devient optionnelle si `DATABASE_URL` n'est pas disponible
- Toutes les méthodes de persistance vérifient maintenant si la base de données est activée

**Fichier modifié** : `backend/metrics-aggregator-service/src/services/persistence.service.js`

### 2. Erreurs Loki 429 (Too Many Requests)
**Problème** : Trop de requêtes vers Loki causaient des erreurs de rate limiting (429).

**Solution** :
- Ajout d'un système de cache pour les métriques d'erreur Loki
- TTL du cache : 30 secondes
- En cas d'erreur, utilisation des données en cache si disponibles

**Fichier modifié** : `backend/metrics-aggregator-service/src/routes/docker.routes.js`

### 3. Tables de monitoring manquantes
**Problème** : Les tables Prisma n'existaient pas dans la base de données.

**Solution** :
- Exécution de `prisma migrate deploy` pour appliquer les migrations existantes
- Exécution de `prisma db push` pour créer toutes les tables manquantes
- Tables créées :
  - `SystemMetricsSnapshot`
  - `ContainerMetricsSnapshot`
  - `ContainerLog`
  - `AggregatedLog`
  - `ServiceNetworkHistory`
  - `ServiceAvailabilityHistory`
  - `SecurityMetric`
  - `SystemEvent`
  - `DailyStats`
  - `AlertThreshold`

## Vérifications à effectuer 🔍

### 1. Vérifier les logs du service
```bash
docker logs --tail 50 jobbingtrack-metrics-aggregator
```
✅ Plus d'erreurs `DATABASE_URL`
✅ Plus d'erreurs `prisma.systemMetricsSnapshot.create()`
✅ Plus d'erreurs Loki 429

### 2. Vérifier les métriques affichées
- **Vue d'ensemble** (http://localhost:8080/backoffice) :
  - État du système : CPU, Mémoire, Disque, Charge
  - Sessions utilisateurs actives
  
- **Analytics & Monitoring** (http://localhost:8080/backoffice/analytics) :
  - Onglet Synthèse : Charge globale CPU + Mémoire, CPU moyen des services, Mémoire utilisée, Temps de réponse moyen, Trafic réseau agrégé
  - Onglet Performance : Temps de réponse de tous les services (incluant Metrics Aggregator)
  - Onglet Services & Logs : Logs de monitoring sauvegardés

### 3. Vérifier la persistance
```bash
# Vérifier que les snapshots sont bien sauvegardés
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT COUNT(*) FROM \"SystemMetricsSnapshot\";"
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT COUNT(*) FROM \"ContainerLog\";"
```

## Commandes utiles 🛠️

### Redémarrer le service metrics-aggregator
```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack
docker-compose restart jobbingtrack-metrics-aggregator
```

### Voir les logs en temps réel
```bash
docker logs -f jobbingtrack-metrics-aggregator
```

### Vérifier les métriques via l'API
```bash
# Métriques système
curl http://localhost:8014/api/v1/metrics

# Métriques agrégées JobbingTrack
curl http://localhost:8014/api/v1/docker/jobbingtrack/aggregated

# Liste des services
curl http://localhost:8014/api/v1/services
```

## Prochaines étapes 📊

Pour implémenter les graphiques de statistiques historiques :
1. Les données sont maintenant sauvegardées dans la base de données
2. Créer des endpoints API pour récupérer l'historique (par exemple : `/api/v1/history/system?hours=24`)
3. Utiliser une bibliothèque de graphiques (Chart.js, Recharts, etc.) dans le frontend
4. Afficher les tendances de CPU, mémoire, charge, etc. sur 24h, 7j, 30j

## Notes 📝

- La persistance en base de données est maintenant active
- Le cache Loki réduit considérablement le nombre de requêtes
- Les métriques continuent d'être collectées et exportées même si la base de données est indisponible
- Les snapshots sont sauvegardés toutes les 10 secondes dans la base de données

