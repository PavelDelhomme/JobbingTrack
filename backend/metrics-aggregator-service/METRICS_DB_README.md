# 📊 Metrics Aggregator - Base de Données

## 🎯 Objectif

Stocker l'historique des métriques système et des événements pour permettre à l'administrateur de :
- Visualiser l'historique des performances
- Analyser les tendances à long terme
- Créer des alertes personnalisées
- Générer des rapports de disponibilité

## 📦 Modèles de Données

### 1. **SystemMetricsSnapshot** (Snapshots Système)

Captures périodiques des métriques système globales.

**Fréquence recommandée** : 1 snapshot toutes les 5 minutes

```typescript
{
  timestamp: DateTime,
  cpuUsagePercent: 45.2,
  cpuCores: 8,
  memoryUsagePercent: 68.5,
  memoryUsedBytes: 8589934592, // 8 GB
  memoryTotalBytes: 12589934592, // 12 GB
  diskUsagePercent: 72.3
}
```

**Rétention** : 90 jours par défaut

### 2. **ContainerMetricsSnapshot** (Snapshots par Conteneur)

Métriques détaillées par conteneur Docker.

**Fréquence recommandée** : 1 snapshot toutes les 5 minutes

```typescript
{
  timestamp: DateTime,
  containerName: "jobbingtrack-api-gateway",
  status: "running",
  cpuUsagePercent: 12.5,
  memoryUsagePercent: 34.2,
  networkRxBytes: 1048576, // 1 MB
  networkTxBytes: 2097152  // 2 MB
}
```

**Rétention** : 30 jours par défaut

### 3. **SystemEvent** (Événements Système)

Événements importants (démarrages, arrêts, alertes, erreurs).

```typescript
{
  timestamp: DateTime,
  type: "HIGH_CPU_USAGE",
  severity: "WARNING",
  source: "system",
  title: "Usage CPU élevé",
  description: "CPU usage: 95%",
  isAlert: true,
  isResolved: false
}
```

**Types d'événements** :
- `CONTAINER_START`, `CONTAINER_STOP`, `CONTAINER_ERROR`
- `HIGH_CPU_USAGE`, `HIGH_MEMORY_USAGE`, `HIGH_DISK_USAGE`
- `DEPLOYMENT_START`, `DEPLOYMENT_SUCCESS`, `DEPLOYMENT_FAILED`
- `ALERT_TRIGGERED`, `ALERT_RESOLVED`

**Rétention** : Illimitée (archivage manuel si nécessaire)

### 4. **AggregatedLog** (Logs Agrégés)

Logs importants centralisés pour analyse.

```typescript
{
  timestamp: DateTime,
  serviceName: "auth-service",
  level: "ERROR",
  message: "Database connection failed",
  metadata: { error: "...", stack: "..." },
  userId: "user_123",
  requestId: "req_456"
}
```

**Rétention** : 30 jours (ERROR/FATAL), 7 jours (WARN), 1 jour (INFO)

### 5. **DailyStats** (Statistiques Quotidiennes)

Statistiques pré-calculées pour le dashboard admin.

```typescript
{
  date: "2025-10-30",
  avgCpuUsagePercent: 45.2,
  maxCpuUsagePercent: 92.1,
  totalContainers: 15,
  runningContainers: 14,
  totalAlerts: 3,
  unresolvedAlerts: 1
}
```

**Calcul** : Agrégation automatique chaque nuit à 00:00

**Rétention** : Illimitée (compact)

### 6. **AlertThreshold** (Seuils d'Alerte)

Configuration des alertes personnalisées par l'admin.

```typescript
{
  name: "High CPU Warning",
  metricType: "cpu_usage",
  warningThreshold: 80.0,   // %
  criticalThreshold: 95.0,  // %
  targetType: "system",
  isEnabled: true,
  notifyEmail: true
}
```

## 🔄 Workflow de Collecte

### Mode Temps Réel (actuel)
```
Prometheus → metrics-aggregator → Frontend
              (API temps réel)
```

### Mode Historique (nouveau)
```
Prometheus → metrics-aggregator → PostgreSQL → Backoffice Admin
              (collecteur)         (stockage)   (visualisation)
```

## 📈 Endpoints API (à créer)

### Admin Dashboard
```javascript
// Métriques système historiques
GET /api/admin/metrics/system?from=2025-10-01&to=2025-10-30
// → Liste de SystemMetricsSnapshot

// Métriques par conteneur
GET /api/admin/metrics/container/:name?from=2025-10-01&to=2025-10-30
// → Liste de ContainerMetricsSnapshot

// Événements système
GET /api/admin/events?severity=WARNING&type=HIGH_CPU_USAGE
// → Liste de SystemEvent

// Statistiques quotidiennes
GET /api/admin/stats/daily?from=2025-10-01&to=2025-10-30
// → Liste de DailyStats

// Configuration des alertes
GET /api/admin/alerts/thresholds
POST /api/admin/alerts/thresholds
PUT /api/admin/alerts/thresholds/:id
DELETE /api/admin/alerts/thresholds/:id
```

## 🛠️ Implémentation

### 1. Collecteur de Métriques (Cron Job)

Créer un service qui collecte les métriques toutes les 5 minutes :

```javascript
// src/collectors/metricsCollector.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function collectSystemMetrics() {
  // Récupérer métriques de Prometheus
  const metrics = await prometheusService.getSystemMetrics();
  
  // Sauvegarder dans DB
  await prisma.systemMetricsSnapshot.create({
    data: {
      cpuUsagePercent: metrics.cpu,
      memoryUsagePercent: metrics.memory,
      // ...
    }
  });
}

// Lancer toutes les 5 minutes
setInterval(collectSystemMetrics, 5 * 60 * 1000);
```

### 2. Détection d'Alertes

```javascript
async function checkAlerts() {
  const thresholds = await prisma.alertThreshold.findMany({
    where: { isEnabled: true }
  });
  
  for (const threshold of thresholds) {
    const latestMetric = await getLatestMetric(threshold.metricType);
    
    if (latestMetric > threshold.criticalThreshold) {
      await createAlert('CRITICAL', threshold, latestMetric);
    } else if (latestMetric > threshold.warningThreshold) {
      await createAlert('WARNING', threshold, latestMetric);
    }
  }
}
```

### 3. Agrégation Quotidienne

```javascript
// Lancer tous les jours à 00:00
async function aggregateDailyStats() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const metrics = await prisma.systemMetricsSnapshot.findMany({
    where: {
      timestamp: {
        gte: startOfDay(yesterday),
        lt: endOfDay(yesterday)
      }
    }
  });
  
  await prisma.dailyStats.create({
    data: {
      date: yesterday,
      avgCpuUsagePercent: avg(metrics.map(m => m.cpuUsagePercent)),
      maxCpuUsagePercent: max(metrics.map(m => m.cpuUsagePercent)),
      // ...
    }
  });
}
```

## 🎨 Interface Backoffice Admin

### Dashboard Principal
- Graphiques CPU/RAM/Disk (7 derniers jours)
- Liste des alertes actives
- État des conteneurs en temps réel
- Statistiques globales

### Onglet Historique
- Sélection de plage de dates
- Graphiques interactifs (Chart.js / Recharts)
- Export CSV/JSON

### Onglet Alertes
- Configuration des seuils
- Historique des alertes
- Résolution manuelle

### Onglet Logs
- Recherche avancée
- Filtres par service/niveau/date
- Export

## 🔐 Sécurité

- Tous les endpoints sous `/api/admin/*` nécessitent `role: ADMIN`
- Validation JWT stricte
- Rate limiting (100 req/min)
- Audit log des modifications

## 📊 Performance

### Indexation
- Index sur `timestamp` pour toutes les tables temporelles
- Index sur `containerName`, `serviceName`, `type`, `severity`
- Partitionnement possible si volume élevé

### Optimisation
- Agrégation pré-calculée (DailyStats)
- Pagination systématique (100 items max)
- Cache Redis pour les requêtes fréquentes

### Nettoyage Automatique
```javascript
// Lancer tous les jours
async function cleanupOldData() {
  const retentionDays = {
    systemMetrics: 90,
    containerMetrics: 30,
    logs: 30
  };
  
  await prisma.systemMetricsSnapshot.deleteMany({
    where: {
      timestamp: { lt: daysAgo(retentionDays.systemMetrics) }
    }
  });
}
```

## 🚀 Déploiement

1. **Création du schéma**
   ```bash
   cd backend/metrics-aggregator-service
   npx prisma migrate dev --name init
   ```

2. **Build Docker**
   ```bash
   make rebuild
   ```

3. **Démarrage**
   ```bash
   make up-full
   make db-migrate
   ```

4. **Vérification**
   ```bash
   curl http://localhost:8014/api/admin/metrics/system
   ```

## 📚 Ressources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Prometheus Query API](https://prometheus.io/docs/prometheus/latest/querying/api/)
- [PostgreSQL Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
