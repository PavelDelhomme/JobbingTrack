# Guide de Test - Système de Monitoring en C

## Vue d'ensemble

Le système de monitoring en C (`monitoring-c`) collecte des métriques système et des conteneurs Docker, les expose via une API HTTP, et les persiste en base de données.

## Pourquoi le CPU Projet peut être à 0% ou très faible ?

### Causes normales

1. **Système peu chargé** : En développement, les conteneurs peuvent être très peu utilisés (0-1% CPU)
2. **Conteneurs inactifs** : Certains services (comme `log-collector-c`) peuvent être inactifs et avoir 0% CPU
3. **Démarrage récent** : Après un `docker-compose up`, les conteneurs peuvent avoir un CPU très faible au début
4. **Services de type "worker"** : Certains services ne traitent des requêtes qu'occasionnellement

### Causes problématiques

1. **Compteurs cgroups indisponibles** : Si `/host/sys/fs/cgroup` ou `/host/proc` n'est pas monté, CPU/mémoire/réseau conteneur peuvent rester à 0
2. **Conteneurs non démarrés** : Si les conteneurs ne sont pas actifs, ils ne seront pas dans les métriques
3. **Problème de filtre** : Si le filtre `jobbingtrack-` ne fonctionne pas, les conteneurs ne seront pas comptés

### Health checks

Depuis le correctif perf du 07/05, `monitoring-c` ne lance plus `docker stats`, `docker inspect`, `docker port` ni `curl` via `popen`. Le collecteur liste les conteneurs avec le Docker socket Unix, lit CPU/mémoire/réseau via cgroups/proc, et mesure les réponses HTTP en parallèle avec libcurl multi.

### Diagnostic

Pour diagnostiquer pourquoi le CPU projet est à 0% :

```bash
# 1. Vérifier que les conteneurs sont actifs
docker ps --filter 'name=jobbingtrack-'

# 2. Vérifier la réponse native de monitoring-c
curl http://localhost:5098/api/v1/metrics | jq '.container_count, .project_cpu_avg, .project_memory_mb'

# 3. Inspecter les détails par conteneur
curl http://localhost:5098/api/v1/metrics | jq '.project_cpu_avg, .containers[] | {name, cpu_percent}'

# 4. Vérifier les logs de monitoring-c
docker logs jobbingtrack-monitoring-c | grep -i "cpu\|container"
```

## Tests Automatisés

### Test complet du système

```bash
./scripts/test-monitoring-system.sh
```

Ce script teste :
- ✅ Accessibilité de l'endpoint `/api/v1/metrics`
- ✅ Présence de tous les champs requis
- ✅ Cohérence des données (CPU projet vs CPU conteneurs)
- ✅ Système de logs (`log-collector-c`)
- ✅ Persistance des métriques (actuellement non implémentée)

### Test backoffice

```bash
./scripts/test-backoffice-metrics.sh
```

Ce script teste :
- ✅ Accessibilité de l'endpoint
- ✅ Cohérence des données
- ✅ Calcul du CPU système
- ✅ Calcul du CPU projet
- ✅ Calcul de la mémoire projet

## Persistance des Métriques

### État actuel

La fonction `save_metrics_to_db()` dans `storage.c` est **non implémentée**. Elle affiche juste les métriques dans les logs :

```c
int save_metrics_to_db(const MetricsData *metrics) {
    // Pour l'instant, juste afficher
    // TODO: Insérer dans PostgreSQL
    printf("[METRICS] CPU: %.2f%%, Memory: %.2f%% ...\n", ...);
    return 0;
}
```

### Implémentation future

Pour implémenter la persistance, il faudra :
1. Se connecter à PostgreSQL (libpq)
2. Créer les tables nécessaires (si elles n'existent pas)
3. Insérer les métriques avec un timestamp
4. Gérer les erreurs de connexion

## Système de Logs (log-collector-c)

- Depuis avril 2026 : le binaire écoute en **3019** **dans** le conteneur ; sur l’hôte le mapping typique pour l’image C legacy est **5109→3019** (`LOG_COLLECTOR_C_PORT` / `LOG_COLLECTOR_C_INTERNAL_PORT`). Le collecteur **Rust** utilise en parallèle **`LOG_COLLECTOR_RS_PORT`** (défaut **5099**). Santé HTTP : **`http://log-collector-c:3019/health`** sur le réseau Compose (si le service C est démarré).

### Fonctionnement

Le `log-collector-c` utilise `inotify` non bloquant pour surveiller les fichiers de logs Docker (`/var/lib/docker/containers/*/*-json.log`) et les collecte en temps réel. Il rescane les conteneurs périodiquement (nouveaux fichiers), gère les suppressions/rotations de fichiers et repart au début si un log est tronqué. Par défaut, `LOG_COLLECTOR_READ_EXISTING=0` évite d’ingérer tout l’historique au démarrage ; mettre `1` seulement pour une reprise volontaire.

### Tests

```bash
# Vérifier que le conteneur est actif
docker ps | grep log-collector-c

# Vérifier les logs
docker logs jobbingtrack-log-collector-c

# Vérifier qu'il surveille les conteneurs
docker logs jobbingtrack-log-collector-c | grep -i "watch\|container"
```

## Structure des Données

### Format JSON de l'endpoint `/api/v1/metrics`

```json
{
  "timestamp": 1766436088,
  "cpu": {
    "load_1": 4.71,
    "load_5": 3.2,
    "load_15": 2.8,
    "cores": 16,
    "usage_percent": 4.71
  },
  "memory": {
    "total_mb": 48000,
    "used_mb": 12000,
    "free_mb": 36000,
    "usage_percent": 25.0
  },
  "disk": {
    "total_gb": 500.0,
    "used_gb": 200.0,
    "free_gb": 300.0,
    "usage_percent": 40.0
  },
  "container_count": 21,
  "project_cpu_avg": 0.24,
  "project_memory_mb": 1638,
  "containers": [
    {
      "name": "jobbingtrack-monitoring-c",
      "cpu_percent": 0.14,
      "memory_mb": 24,
      "memory_limit_mb": 48000,
      "memory_percent": 0.05,
      "response_time_ms": 0.09,
      "http_status": 200
    }
  ]
}
```

### Calculs

- **CPU Projet** : Moyenne des `cpu_percent` de tous les conteneurs avec `name` contenant `jobbingtrack-`
- **Mémoire Projet** : Somme des `memory_mb` de tous les conteneurs projet
- **CPU Système** : `load_1` / `cores` (approximatif) ou calcul depuis `/proc/stat`
- **Mémoire Système** : Depuis `sysinfo()`

## Dépannage

### Le CPU projet est toujours à 0%

1. Vérifier que les conteneurs sont actifs : `docker ps`
2. Vérifier que `/host/sys/fs/cgroup` et `/host/proc` sont montés dans `jobbingtrack-monitoring-c`
3. Vérifier les logs de monitoring-c : `docker logs jobbingtrack-monitoring-c | grep DEBUG`
4. Vérifier que l'inventaire Docker socket fonctionne (voir logs avec `[DEBUG]`)

### Les métriques ne sont pas persistées

Vérifier la connexion PostgreSQL dans les logs `jobbingtrack-monitoring-c`. Les métriques restent exposées via l'API HTTP même si la persistance échoue temporairement.

### Le serveur HTTP ne répond pas

1. Vérifier que le conteneur est démarré : `docker ps | grep monitoring-c`
2. Vérifier les logs : `docker logs jobbingtrack-monitoring-c`
3. Vérifier le port : `netstat -tuln | grep 5098` (host) ou `8015` (container)
4. Vérifier les erreurs de bind : chercher "bind failed" dans les logs

## Performance

- **Consommation mémoire** : ~5-10 MB (vs ~150-200 MB pour Node.js)
- **Consommation CPU** : ~0.5-1% (vs ~5-10% pour Node.js)
- **Latence collecte** : 10-50ms (vs 200-500ms pour Node.js)
- **Taille réponse JSON** : ~10-50 KB (selon le nombre de conteneurs)

## Références

- Scripts de test : `scripts/test-monitoring-system.sh`, `scripts/test-backoffice-metrics.sh`
- Code source : `monitoring/monitoring-c/src/`
- Documentation performance : `monitoring/monitoring-c/PERFORMANCE_GAINS.md`

