# 🚀 Guide d'Optimisation Performance - Metrics-Aggregator

## 📊 État Actuel

- **Mémoire**: ~89MB (11.42% CPU)
- **Bottlenecks identifiés**:
  - Nombreux appels Docker (`dockerode`, `exec`)
  - Lectures fréquentes de `/proc` et `/sys`
  - Requêtes Prisma pour la persistance
  - Collecte synchrone de tous les conteneurs

## 🎯 Objectifs d'Optimisation

- **Réduire la CPU**: 11.42% → ~5-7% (gain de 40-50%)
- **Réduire la mémoire**: 89MB → ~50-60MB (gain de 30-40%)
- **Améliorer la latence**: Réduire le temps de collecte de 50%

## ✅ Optimisations à Court Terme (Node.js)

### 1. Cache des Métriques Système

**Problème**: Collecte répétée des mêmes métriques système
**Solution**: Implémenter un cache avec TTL

```javascript
const systemMetricsCache = {
  data: null,
  timestamp: 0,
  ttl: 5000 // 5 secondes
}

async function getCachedSystemMetrics() {
  const now = Date.now()
  if (systemMetricsCache.data && (now - systemMetricsCache.timestamp) < systemMetricsCache.ttl) {
    return systemMetricsCache.data
  }
  
  systemMetricsCache.data = await collectSystemMetrics()
  systemMetricsCache.timestamp = now
  return systemMetricsCache.data
}
```

**Gain estimé**: 20-30% CPU

### 2. Pool de Connexions Docker

**Problème**: Création d'une nouvelle connexion Docker à chaque collecte
**Solution**: Réutiliser une instance Docker unique

```javascript
// server.js - Au niveau global
const docker = new Docker({ socketPath: '/var/run/docker.sock' })

// Réutiliser partout au lieu de créer de nouvelles instances
```

**Gain estimé**: 10-15% CPU, 10-20MB mémoire

### 3. Collecte Asynchrone et Parallèle

**Problème**: Collecte séquentielle de tous les conteneurs
**Solution**: Utiliser `Promise.all()` avec limite de concurrence

```javascript
const pLimit = require('p-limit')
const limit = pLimit(5) // Maximum 5 conteneurs en parallèle

const metricsPromises = containers.map(container => 
  limit(() => collectContainerMetrics(container))
)

const results = await Promise.all(metricsPromises)
```

**Gain estimé**: 30-40% temps de collecte

### 4. Streaming des Fichiers Système

**Problème**: Lecture complète de fichiers `/proc` à chaque fois
**Solution**: Lire uniquement les lignes nécessaires

```javascript
const readline = require('readline')
const fs = require('fs')

async function readProcFileLine(pid, filename, searchPattern) {
  const filePath = `/host/proc/${pid}/${filename}`
  const fileStream = fs.createReadStream(filePath)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  })
  
  for await (const line of rl) {
    if (line.match(searchPattern)) {
      rl.close()
      return line
    }
  }
}
```

**Gain estimé**: 15-20% CPU

### 5. Batch Prisma Inserts

**Problème**: Inserts Prisma individuels pour chaque conteneur
**Solution**: Utiliser `createMany` ou transactions

```javascript
// Au lieu de:
for (const container of containers) {
  await prisma.containerMetricsSnapshot.create({ data: ... })
}

// Utiliser:
await prisma.containerMetricsSnapshot.createMany({
  data: containers.map(container => ({ ... }))
})
```

**Gain estimé**: 20-30% temps de persistance

### 6. Réduire la Fréquence de Collecte

**Problème**: Collecte trop fréquente pour les métriques non critiques
**Solution**: Collecte différentielle selon le type de métrique

```javascript
const COLLECTION_INTERVALS = {
  critical: 5000,    // CPU, Memory: toutes les 5s
  normal: 15000,     // Network: toutes les 15s
  low: 60000         // Disk: toutes les 60s
}
```

**Gain estimé**: 30-40% CPU global

## 🔄 Optimisations à Moyen Terme (Architecture)

### 1. Worker Threads pour la Collecte

**Problème**: Collecte bloque le thread principal
**Solution**: Utiliser Worker Threads pour isoler la collecte

```javascript
const { Worker } = require('worker_threads')

function collectMetricsInWorker() {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./workers/metrics-collector.js')
    worker.on('message', resolve)
    worker.on('error', reject)
  })
}
```

**Gain estimé**: 20-30% latence API

### 2. Cache Redis pour les Métriques

**Problème**: Requêtes Prisma à chaque collecte
**Solution**: Stocker temporairement dans Redis, persister en batch

```javascript
// Collecte → Redis (immédiat)
await redis.setex(`metrics:${containerName}`, 60, JSON.stringify(metrics))

// Persistance → Prisma (batch toutes les 30s)
setInterval(async () => {
  const allMetrics = await redis.mget(keys)
  await prisma.containerMetricsSnapshot.createMany({ data: allMetrics })
}, 30000)
```

**Gain estimé**: 40-50% temps de persistance

### 3. WebSocket pour les Métriques en Temps Réel

**Problème**: Polling HTTP pour les métriques
**Solution**: Push via WebSocket

```javascript
io.on('connection', (socket) => {
  const metricsStream = setInterval(() => {
    socket.emit('metrics', getCachedMetrics())
  }, 1000)
  
  socket.on('disconnect', () => clearInterval(metricsStream))
})
```

**Gain estimé**: 50-70% réduction requêtes HTTP

## 🚀 Optimisations à Long Terme (Migration)

### Option 1: Migration Partielle vers Rust

**Avantages**:
- Performance maximale (10-100x plus rapide)
- Mémoire très faible (~10-20MB)
- Pas de garbage collector
- Excellent pour I/O système

**Inconvénients**:
- Courbe d'apprentissage
- Temps de développement plus long
- Maintenance de deux codebases

**Architecture proposée**:
```
Node.js (API, WebSocket)
  ↓
Rust Service (Collecte Docker, /proc)
  ↓
Redis (Cache)
  ↓
Prisma/PostgreSQL (Persistance)
```

**Gain estimé**: 60-80% CPU, 70-80% mémoire

### Option 2: Migration vers Go

**Avantages**:
- Bon compromis performance/développement
- Garbage collector efficace
- Excellente gestion de la concurrence
- Plus simple que Rust

**Inconvénients**:
- Moins performant que Rust
- Encore un nouveau langage à maintenir

**Gain estimé**: 40-60% CPU, 50-60% mémoire

### Option 3: Utiliser cAdvisor + Prometheus

**Avantages**:
- Déjà optimisé et testé
- Pas de développement nécessaire
- Intégration native avec Prometheus

**Inconvénients**:
- Moins de contrôle
- Métriques standardisées uniquement

**Gain estimé**: 80-90% CPU (délégation complète)

## 📋 Plan d'Action Recommandé

### Phase 1 (1-2 semaines) - Optimisations Node.js
1. ✅ Implémenter le cache des métriques système
2. ✅ Pool de connexions Docker
3. ✅ Collecte parallèle avec limite
4. ✅ Batch Prisma inserts

**Gain attendu**: 30-40% CPU, 20-30% mémoire

### Phase 2 (2-3 semaines) - Architecture
1. ✅ Worker Threads pour collecte
2. ✅ Cache Redis
3. ✅ WebSocket pour temps réel

**Gain attendu**: 50-60% CPU total, 40-50% mémoire

### Phase 3 (Optionnel) - Migration
1. Évaluer les besoins réels après Phase 1-2
2. Si nécessaire, migrer vers Rust/Go ou utiliser cAdvisor

## 🔍 Monitoring des Optimisations

Utiliser les commandes suivantes pour suivre les améliorations:

```bash
# Test de performance complet
make test-performance-backend

# Vérification mémoire
make check-memory-backend

# Analyse spécifique metrics-aggregator
make analyze-metrics-aggregator
```

## 📊 Métriques de Succès

- **CPU**: < 7% (actuellement 11.42%)
- **Mémoire**: < 60MB (actuellement 89MB)
- **Latence collecte**: < 2s (actuellement ~3-5s)
- **Requêtes/s**: > 100 (actuellement ~50-70)

