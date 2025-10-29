# 📊 JobbingTrack - Système de Monitoring Complet

Stack complète de monitoring pour métriques et logs des conteneurs Docker avec API sécurisée.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Machine Host Docker                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Backend  │  │ Frontend │  │ Postgres │  │ Redis    │   │
│  │ Services │  │ Service  │  │ Service  │  │ Service  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │              │          │
│       └─────────────┴──────────────┴──────────────┘          │
│                       │                                       │
│         ┌─────────────▼──────────────┐                       │
│         │  cAdvisor + Promtail       │ ← Collecte           │
│         └─────────────┬──────────────┘                       │
│                       │                                       │
│         ┌─────────────▼──────────────┐                       │
│         │  Prometheus + Loki         │ ← Stockage           │
│         │  (90j métriques, 30j logs) │                       │
│         └─────────────┬──────────────┘                       │
│                       │                                       │
│         ┌─────────────▼──────────────┐                       │
│         │  Metrics Aggregator API    │ ← API Sécurisée      │
│         │  (JWT + API Key)           │                       │
│         └─────────────┬──────────────┘                       │
│                       │                                       │
│         ┌─────────────▼──────────────┐                       │
│         │  Dashboard Frontend        │ ← Interface          │
│         └────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Services

| Service | Port | Description | Accès |
|---------|------|-------------|-------|
| **cAdvisor** | 8082 | Collecte métriques conteneurs | http://localhost:8082 |
| **Prometheus** | 9090 | Base de données métriques | http://localhost:9090 |
| **Loki** | 3100 | Base de données logs | http://localhost:3100 |
| **Promtail** | 9080 | Collecte logs Docker | - |
| **Grafana** | 3002 | Dashboards visuels | http://localhost:3002 |
| **Metrics API** | 3015 | API sécurisée | http://localhost:3015 |

## 📦 Démarrage

### 1. Configuration

Créer/modifier `.env` à la racine :

```bash
# Monitoring
JWT_SECRET=your-super-secret-jwt-key-change-me
METRICS_API_KEY=jobbingtrack-metrics-secret-key
GRAFANA_PASSWORD=admin
ADMIN_PASSWORD=change-me-in-production

# Rétention
PROMETHEUS_RETENTION_TIME=90d
PROMETHEUS_RETENTION_SIZE=50GB
LOKI_RETENTION_DAYS=30
```

### 2. Démarrer le monitoring

```bash
# Depuis la racine du projet
cd backend
docker-compose -f docker-compose.monitoring.yml up -d

# Ou avec le Makefile
make monitoring-up
```

### 3. Vérifier le démarrage

```bash
# Voir les logs
docker-compose -f docker-compose.monitoring.yml logs -f

# Vérifier la santé
curl http://localhost:3015/health
curl http://localhost:9090/-/healthy
curl http://localhost:3100/ready
```

## 🔐 Authentification API

### Obtenir un token JWT

```bash
curl -X POST http://localhost:3015/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

Réponse :
```json
{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
```

### Utiliser le token

```bash
# Avec JWT
curl http://localhost:3015/api/metrics/system \
  -H "Authorization: Bearer YOUR_TOKEN"

# Avec API Key (rétrocompatibilité)
curl http://localhost:3015/api/metrics/system \
  -H "X-API-Key: jobbingtrack-metrics-secret-key"
```

## 📡 Routes API Disponibles

### Métriques

#### GET /api/metrics/system
Métriques globales de la machine (CPU, RAM, conteneurs actifs).

```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3015/api/metrics/system
```

#### GET /api/metrics/containers
Métriques de tous les conteneurs.

```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3015/api/metrics/containers
```

#### GET /api/metrics/container/:name
Métriques d'un conteneur spécifique.

```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3015/api/metrics/container/jobbingtrack-api-gateway
```

#### GET /api/metrics/history
Historique des métriques (range query).

```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3015/api/metrics/history?query=container_cpu_usage_seconds_total&start=2024-01-01T00:00:00Z&end=2024-01-01T23:59:59Z&step=1m"
```

### Logs

#### GET /api/logs/container/:name
Logs d'un conteneur spécifique.

```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3015/api/logs/container/jobbingtrack-api-gateway?limit=100"
```

#### GET /api/logs/all
Tous les logs de tous les services.

```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3015/api/logs/all?limit=500&service=api-gateway"
```

#### GET /api/logs/stream/:name
Stream logs en temps réel (Server-Sent Events).

```javascript
const eventSource = new EventSource(
  'http://localhost:3015/api/logs/stream/jobbingtrack-api-gateway',
  { headers: { 'Authorization': `Bearer ${token}` }}
);
eventSource.onmessage = (event) => {
  console.log('Log:', event.data);
};
```

## 🔍 Requêtes PromQL Utiles

### CPU

```promql
# CPU par conteneur (%)
sum(rate(container_cpu_usage_seconds_total{name!=""}[5m])) by (name) * 100

# CPU total de tous les conteneurs
sum(rate(container_cpu_usage_seconds_total{name!=""}[5m])) * 100

# Top 5 conteneurs CPU
topk(5, sum(rate(container_cpu_usage_seconds_total{name!=""}[5m])) by (name))
```

### Mémoire

```promql
# Mémoire par conteneur (bytes)
container_memory_usage_bytes{name!=""}

# Mémoire par conteneur (%)
(container_memory_usage_bytes{name!=""} / container_spec_memory_limit_bytes{name!=""}) * 100

# Total mémoire utilisée
sum(container_memory_usage_bytes{name!=""})
```

### Réseau

```promql
# Trafic réseau entrant (bytes/s)
sum(rate(container_network_receive_bytes_total{name!=""}[5m])) by (name)

# Trafic réseau sortant (bytes/s)
sum(rate(container_network_transmit_bytes_total{name!=""}[5m])) by (name)
```

### Disque

```promql
# Utilisation disque par conteneur
container_fs_usage_bytes{name!=""}

# Espace disque disponible
container_fs_limit_bytes{name!=""} - container_fs_usage_bytes{name!=""}
```

## 📊 Requêtes LogQL (Loki)

### Filtrage de base

```logql
# Tous les logs d'un conteneur
{container="jobbingtrack-api-gateway"}

# Logs avec un service spécifique
{service="api-gateway"}

# Logs par stream (stdout/stderr)
{logstream="stderr"}
```

### Recherche de texte

```logql
# Logs contenant "error"
{container="jobbingtrack-api-gateway"} |= "error"

# Logs ne contenant pas "health"
{container="jobbingtrack-api-gateway"} != "health"

# Logs avec regex
{container="jobbingtrack-api-gateway"} |~ "error|ERROR|Error"
```

### Agrégation

```logql
# Nombre d'erreurs par minute
sum(count_over_time({container="jobbingtrack-api-gateway"} |= "error" [1m]))

# Rate d'erreurs par conteneur
sum(rate({job="docker"} |= "error" [5m])) by (container)
```

## 🛠️ Intégration Frontend

### Exemple React/Next.js

```typescript
// services/monitoring.ts
const API_URL = 'http://localhost:3015/api';
const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export async function getSystemMetrics() {
  const res = await fetch(`${API_URL}/metrics/system`, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function getContainerMetrics(containerName: string) {
  const res = await fetch(`${API_URL}/metrics/container/${containerName}`, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function getContainerLogs(containerName: string, limit = 100) {
  const res = await fetch(`${API_URL}/logs/container/${containerName}?limit=${limit}`, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export function streamContainerLogs(containerName: string, onLog: (log: string) => void) {
  const eventSource = new EventSource(
    `${API_URL}/logs/stream/${containerName}`,
    { headers: getAuthHeaders() }
  );
  
  eventSource.onmessage = (event) => onLog(event.data);
  eventSource.onerror = () => eventSource.close();
  
  return () => eventSource.close();
}
```

## 🐳 Compatibilité Docker + Kubernetes

### Docker Compose (Dev/Staging)
Utilisation actuelle - configuration dans `docker-compose.monitoring.yml`.

### Migration Kubernetes

```bash
# Générer les manifests Kubernetes
kompose convert -f docker-compose.monitoring.yml -o k8s/

# Appliquer sur un cluster
kubectl apply -f k8s/
```

Les mêmes images Docker fonctionnent dans les deux environnements.

## 📝 Gestion

### Commandes Make

```bash
# Démarrer
make monitoring-up

# Arrêter
make monitoring-down

# Voir les logs
make monitoring-logs

# Rebuild
make monitoring-rebuild
```

### Commandes Docker Compose

```bash
# Démarrer
docker-compose -f docker-compose.monitoring.yml up -d

# Arrêter
docker-compose -f docker-compose.monitoring.yml down

# Rebuild un service
docker-compose -f docker-compose.monitoring.yml build metrics-aggregator-api

# Voir les logs
docker-compose -f docker-compose.monitoring.yml logs -f cadvisor
docker-compose -f docker-compose.monitoring.yml logs -f promtail

# Redémarrer un service
docker-compose -f docker-compose.monitoring.yml restart prometheus
```

### Nettoyage

```bash
# Arrêter et supprimer volumes (ATTENTION: perte de données)
docker-compose -f docker-compose.monitoring.yml down -v

# Nettoyer les anciennes données Prometheus
docker exec jobbingtrack-prometheus rm -rf /prometheus/*
docker-compose -f docker-compose.monitoring.yml restart prometheus
```

## 🔧 Configuration Avancée

### Modifier la rétention Prometheus

Éditer `docker-compose.monitoring.yml` :
```yaml
prometheus:
  command:
    - '--storage.tsdb.retention.time=180d'  # 180 jours
    - '--storage.tsdb.retention.size=100GB' # 100 GB max
```

### Modifier la rétention Loki

Éditer `monitoring/loki-config.yml` :
```yaml
limits_config:
  retention_period: 60d  # 60 jours au lieu de 30
```

### Ajouter des alertes Prometheus

Créer `monitoring/alerts.yml` :
```yaml
groups:
  - name: containers
    rules:
      - alert: HighCPUUsage
        expr: sum(rate(container_cpu_usage_seconds_total[5m])) by (name) > 0.8
        for: 5m
        annotations:
          summary: "High CPU on {{ $labels.name }}"
```

## 📈 Dashboards Grafana

### Accès
- URL: http://localhost:3002
- User: `admin`
- Pass: Variable `GRAFANA_PASSWORD` du .env

### Dashboards recommandés
1. **Docker Container & Host Metrics** (ID: 179)
2. **cAdvisor exporter** (ID: 14282)
3. **Loki Dashboard** (ID: 13639)

Importer via : Dashboard → Import → Enter ID

## 🐛 Troubleshooting

### Prometheus ne collecte pas les métriques
```bash
# Vérifier la config
docker exec jobbingtrack-prometheus promtool check config /etc/prometheus/prometheus.yml

# Vérifier les targets
curl http://localhost:9090/api/v1/targets
```

### Loki ne reçoit pas les logs
```bash
# Vérifier Promtail
docker logs jobbingtrack-promtail --tail 50

# Tester l'API Loki
curl http://localhost:3100/loki/api/v1/labels
```

### API retourne 401/403
Vérifier le token JWT :
```bash
# Générer un nouveau token
curl -X POST http://localhost:3015/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

## 🔒 Sécurité Production

### Recommandations

1. **Changer les secrets**
   ```bash
   # .env
   JWT_SECRET=$(openssl rand -hex 32)
   ADMIN_PASSWORD=$(openssl rand -base64 16)
   GRAFANA_PASSWORD=$(openssl rand -base64 16)
   ```

2. **Limiter les ports exposés**
   - Exposer uniquement l'API (3015)
   - Bloquer accès direct Prometheus/Loki/Grafana

3. **Activer HTTPS**
   - Utiliser un reverse proxy (Nginx/Traefik)
   - Certificats SSL/TLS

4. **Rate limiting**
   - Implémenter dans l'API

5. **Logs d'audit**
   - Tracer tous les accès API

## 📚 Ressources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [cAdvisor GitHub](https://github.com/google/cadvisor)
- [PromQL Tutorial](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [LogQL Guide](https://grafana.com/docs/loki/latest/logql/)

---

**Version**: 1.0.0  
**Dernière mise à jour**: 2025-10-29
