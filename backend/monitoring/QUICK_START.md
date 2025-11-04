# 🚀 Quick Start - Monitoring Stack

## 📦 Ce qui a été créé

```
backend/
├── docker-compose.monitoring.yml          # Stack complète monitoring
├── Makefile.monitoring                    # Commandes de gestion
└── monitoring/
    ├── README.md                          # Documentation complète
    ├── QUICK_START.md                     # Ce fichier
    ├── prometheus.yml                     # Config Prometheus
    ├── loki-config.yml                    # Config Loki (30j rétention)
    ├── promtail-config.yml                # Collecte logs Docker
    ├── grafana-datasources.yml            # Datasources auto Grafana
    └── metrics-aggregator/
        ├── index.js                       # API Node.js sécurisée
        ├── package.json                   # Dépendances
        └── Dockerfile                     # Image Docker
```

## ⚡ Démarrage Rapide (3 étapes)

### 1. Copier les variables d'environnement

```bash
# Si .env n'existe pas encore
cp .env.example .env

# Ou ajouter manuellement dans .env
cat >> .env << 'EOF'

# Monitoring
JWT_SECRET=your-super-secret-jwt-key-change-me
METRICS_API_KEY=jobbingtrack-metrics-secret-key
GRAFANA_PASSWORD=admin
ADMIN_PASSWORD=change-me-in-production
EOF
```

### 2. Démarrer la stack

```bash
cd backend

# Avec Docker Compose
docker-compose -f docker-compose.monitoring.yml up -d

# OU avec le Makefile
make -f Makefile.monitoring monitoring-up
```

### 3. Vérifier que tout fonctionne

```bash
# Voir le statut
make -f Makefile.monitoring monitoring-status

# Tester l'API
curl http://localhost:3015/health
```

## 🌐 Accès aux Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **Metrics API** | http://localhost:3015 | JWT token requis |
| **Prometheus** | http://localhost:9090 | Aucun |
| **Grafana** | http://localhost:3002 | admin / admin |
| **cAdvisor** | http://localhost:8082 | Aucun |
| **Loki** | http://localhost:3100 | API uniquement |

## 🔐 Obtenir un Token JWT

```bash
# Générer un token
curl -X POST http://localhost:3015/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"change-me-in-production"}'

# Résultat
{"token":"eyJhbGc..."}
```

## 📊 Tester l'API

```bash
# Avec le token
TOKEN="votre-token-ici"

# Métriques système
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3015/api/metrics/system

# Métriques conteneurs
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3015/api/metrics/containers

# Métriques d'un conteneur spécifique
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3015/api/metrics/container/jobbingtrack-api-gateway

# Logs d'un conteneur
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3015/api/logs/container/jobbingtrack-api-gateway?limit=50"
```

## 📈 Exemple Frontend

```typescript
// services/metrics.ts
const API = 'http://localhost:3015/api';
const token = localStorage.getItem('monitoring_token');

export async function getSystemMetrics() {
  const res = await fetch(`${API}/metrics/system`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

export async function getContainerLogs(name: string) {
  const res = await fetch(`${API}/logs/container/${name}?limit=100`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

// Logs temps réel (Server-Sent Events)
export function streamLogs(containerName: string, onLog: (log: any) => void) {
  const eventSource = new EventSource(
    `${API}/logs/stream/${containerName}`,
    { headers: { 'Authorization': `Bearer ${token}` }}
  );
  
  eventSource.onmessage = (event) => onLog(JSON.parse(event.data));
  return () => eventSource.close();
}
```

## 🛠️ Commandes Utiles

```bash
# Voir les logs
make -f Makefile.monitoring monitoring-logs

# Logs d'un service spécifique
docker logs jobbingtrack-prometheus -f
docker logs jobbingtrack-loki -f
docker logs jobbingtrack-metrics-api -f

# Redémarrer
make -f Makefile.monitoring monitoring-restart

# Rebuild l'API après modification
make -f Makefile.monitoring monitoring-rebuild-api

# Arrêter tout
make -f Makefile.monitoring monitoring-down
```

## 🎯 Requêtes PromQL Utiles

```promql
# CPU par conteneur (%)
sum(rate(container_cpu_usage_seconds_total{name!=""}[5m])) by (name) * 100

# Mémoire par conteneur (MB)
container_memory_usage_bytes{name!=""} / 1024 / 1024

# Top 5 conteneurs CPU
topk(5, sum(rate(container_cpu_usage_seconds_total{name!=""}[5m])) by (name))

# Réseau entrant (MB/s)
sum(rate(container_network_receive_bytes_total{name!=""}[5m])) by (name) / 1024 / 1024
```

## 🔍 Requêtes LogQL (Loki)

```logql
# Tous les logs d'un conteneur
{container="jobbingtrack-api-gateway"}

# Logs contenant "error"
{container="jobbingtrack-api-gateway"} |= "error"

# Logs avec regex
{container="jobbingtrack-api-gateway"} |~ "error|ERROR|Error"

# Compter les erreurs par minute
sum(count_over_time({container="jobbingtrack-api-gateway"} |= "error" [1m]))
```

## 🐛 Troubleshooting

### Prometheus ne collecte pas les métriques

```bash
# Vérifier les targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'

# Vérifier la config
docker exec jobbingtrack-prometheus promtool check config /etc/prometheus/prometheus.yml
```

### Loki ne reçoit pas les logs

```bash
# Vérifier Promtail
docker logs jobbingtrack-promtail --tail 50

# Tester l'API Loki
curl http://localhost:3100/loki/api/v1/labels
```

### API retourne 401

```bash
# Régénérer un token
curl -X POST http://localhost:3015/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"change-me-in-production"}'
```

## 📚 Prochaines Étapes

1. **Configurer Grafana**
   - Ouvrir http://localhost:3002
   - Importer dashboards recommandés (voir README.md)

2. **Intégrer au Frontend**
   - Utiliser l'API pour afficher métriques temps réel
   - Implémenter streaming logs

3. **Ajouter des Alertes**
   - Configurer alertes Prometheus
   - Notifier via webhook/email

4. **Production**
   - Changer tous les secrets
   - Activer HTTPS
   - Limiter accès aux services internes

---

**Documentation complète**: `backend/monitoring/README.md`
