# Guide Complet du Système de Monitoring JobbingTrack

## 🎯 Objectif

Ce système permet de récupérer en temps réel :
- **Métriques système** : CPU total, nombre de cœurs, mémoire totale/disponible, disque
- **Métriques JobbingTrack** : CPU/mémoire/réseau de tous les conteneurs du projet
- **Statistiques agrégées** : Total, moyenne, min, max pour CPU et mémoire
- **Métriques individuelles** : Détails par conteneur spécifique

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│           Machine Hôte Docker                    │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ Node Exporter│  │   cAdvisor   │            │
│  │ (Métriques   │  │  (Métriques  │            │
│  │  système)    │  │  conteneurs) │            │
│  └──────┬───────┘  └──────┬───────┘            │
│         │                  │                     │
│         └────────┬─────────┘                     │
│                  │                               │
│         ┌────────▼────────┐                      │
│         │   Prometheus    │                      │
│         │  (Filtres sur   │                      │
│         │   labels JT)    │                      │
│         └────────┬────────┘                      │
│                  │                               │
│         ┌────────▼────────┐                      │
│         │ Metrics         │                      │
│         │ Aggregator API  │                      │
│         │ (Routes custom) │                      │
│         └─────────────────┘                      │
└─────────────────────────────────────────────────┘
```

## 📊 Services de Monitoring

### 1. **Node Exporter** (Port 9100)
Collecte les métriques système de la machine hôte :
- CPU : nombre de cœurs, utilisation
- Mémoire : totale, disponible, utilisée
- Disque : espace total, utilisé
- Load average : 1min, 5min, 15min

### 2. **cAdvisor** (Port 8081)
Surveille tous les conteneurs Docker :
- CPU par conteneur
- Mémoire par conteneur
- Réseau RX/TX
- I/O disque

### 3. **Prometheus** (Port 9090)
Scrape et stocke les métriques avec 3 jobs :
- `node-exporter` : métriques système
- `cadvisor-all` : tous les conteneurs
- `cadvisor-jobbingtrack` : filtrage conteneurs JobbingTrack uniquement

### 4. **Metrics Aggregator API** (Port 3008)
API Express qui expose les données via routes REST

## 🚀 Démarrage

### 1. Démarrer le monitoring

```bash
# Depuis la racine du projet
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack

# Démarrer les services de monitoring
docker-compose -f monitoring/docker-compose.monitoring.yml up -d

# Vérifier que tous les services sont démarrés
docker ps | grep -E 'node-exporter|cadvisor|prometheus|loki|grafana'
```

### 2. Attendre l'initialisation

```bash
# Attendre 30 secondes que Prometheus scrape les premières métriques
sleep 30
```

### 3. Vérifier Prometheus

Ouvrir dans le navigateur : http://localhost:9090

**Tests dans Prometheus UI :**

```promql
# Test 1 : Vérifier Node Exporter
node_memory_MemTotal_bytes

# Test 2 : Vérifier cAdvisor
container_last_seen

# Test 3 : Vérifier filtrage JobbingTrack
container_memory_usage_bytes{container_label_com_docker_compose_project=~"jobbingtrack.*"}
```

## 🔑 Endpoints de l'API

### Endpoints Publics (Développement)

Ces endpoints fonctionnent **SANS authentification** si `NODE_ENV=development` :

#### 1. `/api/v1/metrics` - Infos système globales
```bash
curl http://localhost:3008/api/v1/metrics | jq
```

Retourne : CPU système, mémoire totale, nombre de conteneurs

#### 2. `/api/v1/services` - Stats conteneurs en temps réel
```bash
curl http://localhost:3008/api/v1/services | jq
```

Retourne : CPU, mémoire, réseau pour tous les conteneurs actifs

#### 3. `/api/v1/container/:name` - Stats d'un conteneur
```bash
curl http://localhost:3008/api/v1/container/api-gateway | jq
```

#### 4. `/api/v1/logs/:serviceName` - Logs d'un service
```bash
curl http://localhost:3008/api/v1/logs/api-gateway?limit=100 | jq
```

### Endpoints Protégés (Authentification JWT)

Ces endpoints nécessitent un token JWT dans le header `Authorization: Bearer <token>` :

#### 1. `/api/metrics/system` - Métriques système (Node Exporter)
```bash
TOKEN="<votre-jwt-token>"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3008/api/metrics/system | jq
```

**Données retournées :**
- `cpu_cores` : nombre de cœurs CPU
- `cpu_usage_percent` : % CPU utilisé
- `memory_total` : mémoire totale (bytes)
- `memory_available` : mémoire disponible (bytes)
- `memory_used` : mémoire utilisée (bytes)
- `memory_used_percent` : % mémoire utilisée
- `disk_total` : espace disque total (bytes)
- `disk_used` : espace disque utilisé (bytes)
- `disk_used_percent` : % disque utilisé
- `load_1min`, `load_5min`, `load_15min` : charge système
- `containers_jobbingtrack` : nombre de conteneurs JobbingTrack actifs
- `containers_total` : nombre total de conteneurs

#### 2. `/api/metrics/jobbingtrack/containers` - Tous les conteneurs JobbingTrack
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3008/api/metrics/jobbingtrack/containers | jq
```

**Données retournées (par conteneur) :**
- `cpu_usage` : utilisation CPU (cores)
- `memory_usage` : mémoire utilisée (bytes)
- `memory_limit` : limite mémoire (bytes)
- `memory_percent` : % mémoire utilisée
- `network_rx` : réseau reçu (bytes/sec)
- `network_tx` : réseau transmis (bytes/sec)
- `fs_usage` : filesystem utilisé (bytes)
- `fs_limit` : filesystem limite (bytes)
- `containers_count` : nombre de conteneurs

#### 3. `/api/metrics/jobbingtrack/stats` - Statistiques agrégées JobbingTrack
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3008/api/metrics/jobbingtrack/stats | jq
```

**Données retournées :**
- `total_cpu_usage` : CPU total utilisé par JobbingTrack (cores)
- `avg_cpu_usage` : CPU moyen par conteneur
- `max_cpu_usage` : CPU max parmi les conteneurs
- `min_cpu_usage` : CPU min parmi les conteneurs
- `total_memory_usage` : mémoire totale JobbingTrack (bytes)
- `avg_memory_usage` : mémoire moyenne par conteneur
- `max_memory_usage` : mémoire max parmi les conteneurs
- `min_memory_usage` : mémoire min parmi les conteneurs
- `memory_percent_of_system` : % mémoire JobbingTrack / système
- `total_network_rx` : réseau RX total (bytes/sec)
- `total_network_tx` : réseau TX total (bytes/sec)
- `active_containers` : nombre de conteneurs actifs

#### 4. `/api/metrics/container/:name` - Métriques d'un conteneur spécifique
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3008/api/metrics/container/api-gateway | jq
```

**Données retournées :**
- `cpu_usage` : CPU (rate)
- `cpu_usage_percent` : CPU (%)
- `memory_usage` : mémoire utilisée (bytes)
- `memory_limit` : limite mémoire (bytes)
- `memory_usage_percent` : % mémoire
- `network_rx` : réseau RX (bytes/sec)
- `network_tx` : réseau TX (bytes/sec)
- `fs_usage` : filesystem utilisé (bytes)
- `fs_limit` : filesystem limite (bytes)
- `fs_usage_percent` : % filesystem
- `uptime` : temps de fonctionnement (seconds)

#### 5. `/api/metrics/history` - Historique (range query)
```bash
# Historique CPU JobbingTrack sur les 5 dernières minutes
NOW=$(date +%s)
START=$((NOW - 300))

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3008/api/metrics/history?query=sum(rate(container_cpu_usage_seconds_total{container_label_com_docker_compose_project=~\"jobbingtrack.*\"}[1m]))&start=${START}&end=${NOW}&step=1m" | jq
```

## 🧪 Tests Complets

### Test 1 : Vérifier Node Exporter fonctionne
```bash
# Doit retourner des métriques node_*
curl http://localhost:9100/metrics | grep "node_memory_MemTotal_bytes"
```

### Test 2 : Vérifier cAdvisor fonctionne
```bash
# Doit retourner des métriques container_*
curl http://localhost:8081/metrics | grep "container_memory_usage_bytes"
```

### Test 3 : Vérifier Prometheus scrape correctement
```bash
# Doit retourner des targets actifs
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'
```

### Test 4 : Tester l'API (mode développement)
```bash
# Test métriques système
curl http://localhost:3008/api/v1/metrics | jq

# Test tous les services
curl http://localhost:3008/api/v1/services | jq

# Test un conteneur spécifique
curl http://localhost:3008/api/v1/container/api-gateway | jq
```

### Test 5 : Tester avec authentification
```bash
# 1. Générer un token JWT depuis auth-service
# (À adapter selon votre méthode d'authentification)

# 2. Utiliser le token
TOKEN="eyJhbGc..."

# Test métriques système
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3008/api/metrics/system | jq '.data.cpu_cores'

# Test stats JobbingTrack
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3008/api/metrics/jobbingtrack/stats | jq '.data.total_cpu_usage'
```

## 🔍 Filtrage JobbingTrack

Le système utilise les **labels Docker Compose automatiques** pour filtrer :

```promql
# Label utilisé pour identifier les conteneurs JobbingTrack
container_label_com_docker_compose_project=~"jobbingtrack.*"
```

Docker Compose ajoute automatiquement ce label à tous les conteneurs du projet.

## 📈 Exemple de Réponse

### `/api/metrics/system`
```json
{
  "success": true,
  "timestamp": "2025-10-30T14:30:00.000Z",
  "data": {
    "cpu_cores": 8,
    "cpu_usage_percent": 23.45,
    "memory_total": 16842752000,
    "memory_available": 8421376000,
    "memory_used": 8421376000,
    "memory_used_percent": 50.0,
    "disk_total": 500107862016,
    "disk_used": 250053931008,
    "disk_used_percent": 50.0,
    "load_1min": 2.5,
    "load_5min": 2.3,
    "load_15min": 2.1,
    "containers_jobbingtrack": 8,
    "containers_total": 15
  }
}
```

### `/api/metrics/jobbingtrack/stats`
```json
{
  "success": true,
  "project": "jobbingtrack",
  "timestamp": "2025-10-30T14:30:00.000Z",
  "data": {
    "total_cpu_usage": 0.85,
    "avg_cpu_usage": 0.106,
    "max_cpu_usage": 0.25,
    "min_cpu_usage": 0.05,
    "total_memory_usage": 2147483648,
    "avg_memory_usage": 268435456,
    "max_memory_usage": 536870912,
    "min_memory_usage": 134217728,
    "memory_percent_of_system": 12.75,
    "total_network_rx": 1048576,
    "total_network_tx": 2097152,
    "active_containers": 8
  }
}
```

## 🛠️ Dépannage

### Problème : Node Exporter ne retourne pas de métriques
**Solution :** Vérifier que les volumes sont bien montés
```bash
docker exec node-exporter ls -la /host/proc
```

### Problème : Prometheus ne scrape pas les targets
**Solution :** Vérifier la configuration et recharger
```bash
# Vérifier la config
docker exec prometheus promtool check config /etc/prometheus/prometheus.yml

# Recharger la config
curl -X POST http://localhost:9090/-/reload
```

### Problème : Aucun conteneur JobbingTrack trouvé
**Solution :** Vérifier les labels Docker Compose
```bash
docker inspect jobbingtrack-api-gateway | jq '.[0].Config.Labels'
```

### Problème : API retourne des erreurs d'authentification
**Solution :** Vérifier le mode (développement ou production)
```bash
docker exec metrics-aggregator-api printenv NODE_ENV
```

## 📝 Notes Importantes

1. **Mode Développement** : Les endpoints `/api/v1/*` sont accessibles SANS token
2. **Mode Production** : Tous les endpoints `/api/*` nécessitent un JWT
3. **Rétention** : Prometheus conserve 90 jours de données (50GB max)
4. **Scrape Interval** : Métriques collectées toutes les 15 secondes
5. **Rate Window** : Calculs de rate sur 1 minute pour plus de réactivité

## 🎓 Queries PromQL Utiles

```promql
# CPU total système
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)

# Mémoire JobbingTrack
sum(container_memory_usage_bytes{container_label_com_docker_compose_project=~"jobbingtrack.*"})

# Top 5 conteneurs par CPU
topk(5, rate(container_cpu_usage_seconds_total{name!=""}[1m]))

# Réseau total JobbingTrack
sum(rate(container_network_receive_bytes_total{container_label_com_docker_compose_project=~"jobbingtrack.*"}[1m]))
```

## 🔗 Accès Web

- **Prometheus UI** : http://localhost:9090
- **Grafana** : http://localhost:3013 (admin/admin123)
- **Metrics API** : http://localhost:3008
- **cAdvisor** : http://localhost:8081
- **Node Exporter** : http://localhost:9100/metrics
