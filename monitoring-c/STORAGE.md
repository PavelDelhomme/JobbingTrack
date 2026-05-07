# Documentation - Persistance PostgreSQL

## Vue d'ensemble

Le système de monitoring en C (`monitoring-c`) persiste maintenant toutes les métriques dans PostgreSQL pour permettre :
- Historique des métriques
- Analyse des tendances
- Alertes basées sur l'historique
- Requêtes SQL personnalisées

## Tables créées

### `system_metrics`

Stocke les métriques système globales collectées à chaque intervalle.

**Colonnes principales :**
- `timestamp` : Timestamp de la collecte
- `cpu_load_1`, `cpu_load_5`, `cpu_load_15` : Load average CPU
- `cpu_cores` : Nombre de cores CPU
- `cpu_usage_percent` : Utilisation CPU (approximatif)
- `memory_total_mb`, `memory_used_mb`, `memory_free_mb` : Mémoire système
- `memory_usage_percent` : Pourcentage mémoire utilisée
- `disk_total_gb`, `disk_used_gb`, `disk_free_gb` : Disque
- `disk_usage_percent` : Pourcentage disque utilisé
- `container_count` : Nombre de conteneurs
- `avg_response_time_ms` : Temps de réponse moyen
- `avg_cpu_percent` : CPU moyen des conteneurs
- `avg_memory_percent` : Mémoire moyenne des conteneurs
- `availability_percent` : Pourcentage de services sains
- `load_score` : Score de charge (0-100)
- `total_network_rx_bytes`, `total_network_tx_bytes` : Réseau total
- `project_cpu_avg` : **CPU moyen des conteneurs JobbingTrack uniquement**
- `project_memory_mb` : **Mémoire totale des conteneurs JobbingTrack**

### `container_metrics`

Stocke les métriques individuelles de chaque conteneur.

**Colonnes principales :**
- `system_metrics_id` : Référence vers `system_metrics.id` (CASCADE DELETE)
- `timestamp` : Timestamp de la collecte
- `container_name` : Nom du conteneur
- `cpu_percent` : CPU du conteneur
- `memory_mb`, `memory_limit_mb`, `memory_percent` : Mémoire
- `network_rx_bytes`, `network_tx_bytes` : Réseau
- `response_time_ms` : Temps de réponse HTTP
- `http_status` : Code HTTP (200, 404, etc.)

## Configuration

### Variables d'environnement

Le conteneur `monitoring-c` utilise ces variables d'environnement :

```bash
POSTGRES_HOST=postgres          # Nom du service Docker
POSTGRES_PORT=5432              # Port PostgreSQL
POSTGRES_DB=jobbingtrack        # Nom de la base
POSTGRES_USER=jobbingtrack      # Utilisateur
POSTGRES_PASSWORD=jobbingtrack123  # Mot de passe
```

Ces variables sont définies dans `docker-compose.monitoring.yml` et utilisent les valeurs par défaut du projet.

### Initialisation automatique

Les tables sont créées automatiquement au premier démarrage si elles n'existent pas. Le code dans `storage.c` vérifie et crée les tables lors de `init_storage()`.

## Utilisation

### Requêtes SQL utiles

#### Dernières métriques système

```sql
SELECT * FROM system_metrics 
ORDER BY timestamp DESC 
LIMIT 10;
```

#### CPU Projet sur les dernières 24h

```sql
SELECT timestamp, project_cpu_avg, project_memory_mb, container_count
FROM system_metrics
WHERE timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

#### Conteneurs les plus gourmands en CPU

```sql
SELECT container_name, AVG(cpu_percent) as avg_cpu, MAX(cpu_percent) as max_cpu
FROM container_metrics
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY container_name
ORDER BY avg_cpu DESC
LIMIT 10;
```

#### Évolution du CPU Projet

```sql
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  AVG(project_cpu_avg) as avg_cpu,
  MAX(project_cpu_avg) as max_cpu,
  MIN(project_cpu_avg) as min_cpu
FROM system_metrics
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour DESC;
```

#### Vue récente (déjà créée)

```sql
SELECT * FROM recent_system_metrics;
SELECT * FROM recent_container_metrics;
```

### Nettoyage des anciennes métriques

Pour garder seulement 30 jours de données :

```sql
SELECT cleanup_old_metrics();
```

Ou manuellement :

```sql
DELETE FROM system_metrics 
WHERE timestamp < NOW() - INTERVAL '30 days';
```

## Gestion des erreurs

Le système est conçu pour être robuste :

1. **Échec de connexion** : Si PostgreSQL n'est pas disponible, les métriques sont toujours accessibles via l'API HTTP (`/api/v1/metrics`)
2. **Reconnexion automatique** : Si la connexion est perdue, le système essaie de se reconnecter à chaque collecte
3. **Erreurs d'insertion** : Les erreurs sont loggées mais n'arrêtent pas la collecte

## Performance

- **Taille par enregistrement** : ~200-500 bytes (selon le nombre de conteneurs)
- **Taux d'insertion** : 1 enregistrement toutes les 15 secondes (par défaut)
- **Croissance** : ~1.7 MB/jour pour 21 conteneurs
- **Index** : Index sur `timestamp` et `container_name` pour requêtes rapides

## Maintenance

### Vérifier l'espace disque

```sql
SELECT 
  pg_size_pretty(pg_total_relation_size('system_metrics')) as system_metrics_size,
  pg_size_pretty(pg_total_relation_size('container_metrics')) as container_metrics_size;
```

### Statistiques des tables

```sql
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_stat_user_tables
WHERE tablename IN ('system_metrics', 'container_metrics');
```

## Scripts SQL

Un script SQL est disponible dans `monitoring-c/sql/init_metrics_tables.sql` pour créer manuellement les tables si nécessaire.

