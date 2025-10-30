# 📊 Configuration du Système de Monitoring

## 🎯 Objectif

Ce document explique comment fonctionne le système de monitoring de JobbingTrack et comment l'utiliser correctement.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Stack Principale                        │
│  (make up-full)                                          │
│                                                          │
│  - API Gateway (3000)                                    │
│  - Auth Service (8001)                                   │
│  - Frontend (8080)                                       │
│  - PostgreSQL (5432)                                     │
│  - Redis (6379)                                          │
│  - Metrics Aggregator (8014) ✅                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  Stack Monitoring                        │
│  (make monitoring-up)                                    │
│                                                          │
│  - Prometheus (9090)     ← Collecte métriques           │
│  - cAdvisor (8082)       ← Métriques conteneurs         │
│  - Node Exporter (9100)  ← Métriques système hôte       │
│  - Loki (3100)           ← Stockage logs                │
│  - Grafana (3013)        ← Visualisation                │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Commandes Makefile

### `make up-full`
Démarre **uniquement la stack principale** :
- Services essentiels (API Gateway, Auth, Frontend, DB, Redis)
- **Metrics Aggregator** (port 8014)

**N'inclut PAS** : Prometheus, cAdvisor, Node Exporter, Grafana, Loki

### `make monitoring-up`
Démarre **uniquement la stack monitoring** :
- Prometheus (9090)
- cAdvisor (8082)
- Node Exporter (9100)
- Loki (3100)
- Grafana (3013)

**Prérequis** : La stack principale doit déjà tourner

### `make monitoring-full` ✅ RECOMMANDÉ
Démarre **TOUT proprement** :
1. Nettoie les conteneurs conflictuels
2. Arrête le monitoring s'il tourne
3. Démarre la stack principale (`make up-full`)
4. Attend 10 secondes
5. Démarre le monitoring (`make monitoring-up`)
6. Attend 15 secondes
7. Affiche le status

**C'est la commande à utiliser pour démarrer tout le système !**

## 📡 Endpoints API

### Frontend → Metrics Aggregator (Port 8014)

Le **frontend** appelle **uniquement** l'API Metrics Aggregator sur le port **8014**.

**Endpoints utilisés par le frontend :**
```
GET http://localhost:8014/api/v1/metrics     → Métriques système
GET http://localhost:8014/api/v1/services    → Stats conteneurs
GET http://localhost:8014/api/v1/container/:name → Stats conteneur spécifique
GET http://localhost:8014/api/v1/logs/:service  → Logs d'un service
```

### Metrics Aggregator → Services Internes (Réseau Docker)

L'API Metrics Aggregator **à l'intérieur du réseau Docker** communique avec :
```
http://prometheus:9090  → Requêtes PromQL
http://loki:3100        → Requêtes logs
http://cadvisor:8080    → Métriques conteneurs (pas utilisé, Prometheus préféré)
```

**Note :** Le frontend **NE DOIT PAS** appeler directement Prometheus/cAdvisor/Node Exporter.

## 🔧 Résolution des Problèmes

### Problème : `cpu_percent: undefined` et `memory_percent: undefined`

**Cause :** Le monitoring (Prometheus + Node Exporter) n'est pas démarré.

**Solution :**
```bash
make monitoring-full
```

### Problème : Port 9090 déjà utilisé

**Cause :** Deux Prometheus tentent de démarrer.

**Solution :** Déjà corrigée automatiquement par `make monitoring-up` qui nettoie les conteneurs conflictuels.

### Problème : Port 8081 déjà utilisé

**Cause :** Ancien cAdvisor du docker-compose.yml principal.

**Solution :** Déjà désactivé. cAdvisor est maintenant uniquement dans la stack monitoring (port 8082).

## 📊 Flux de Données

### Mode Normal (avec monitoring)

```
Frontend (navigateur)
    ↓
http://localhost:8014/api/v1/metrics
    ↓
Metrics Aggregator (conteneur)
    ↓ (réseau Docker interne)
http://prometheus:9090/api/v1/query
    ↓
Prometheus → Node Exporter (métriques système)
Prometheus → cAdvisor (métriques conteneurs)
```

### Mode Fallback (sans monitoring)

```
Frontend (navigateur)
    ↓
http://localhost:8014/api/v1/metrics
    ↓
Metrics Aggregator (conteneur)
    ↓ (Prometheus non disponible)
Docker CLI (docker stats, docker info)
    ↓
Retourne infos basiques (sans CPU%, RAM%)
```

## 🎓 Bonnes Pratiques

### 1. Démarrage Complet

**Utilisez toujours :**
```bash
make monitoring-full
```

**Au lieu de :**
```bash
make up-full          # ❌ Incomplet, pas de monitoring
make up-full && make monitoring-up  # ❌ Peut avoir des conflits
```

### 2. Vérification

Après le démarrage, vérifiez que tout fonctionne :
```bash
make status

# Devrait afficher tous les services :
# - jobbingtrack-frontend (8080)
# - jobbingtrack-api-gateway (3000)
# - jobbingtrack-auth-service (8001)
# - jobbingtrack-metrics-aggregator (8014)
# - prometheus (9090)
# - cadvisor-monitoring (8082)
# - node-exporter (9100)
# - grafana (3013)
# - loki (3100)
```

### 3. Tests

Testez les endpoints :
```bash
# Métriques système (avec Prometheus)
curl http://localhost:8014/api/v1/metrics | jq '.system.cpu_percent'

# Stats conteneurs
curl http://localhost:8014/api/v1/services | jq

# Prometheus directement (optionnel)
curl http://localhost:9090/api/v1/targets | jq
```

### 4. Arrêt

Pour arrêter proprement :
```bash
make monitoring-down  # Arrête monitoring
make down             # Arrête stack principale
```

Ou tout en une fois :
```bash
make down-all         # Si cette commande existe
```

## 🌐 Accès Web

| Service | URL | Usage |
|---------|-----|-------|
| **Frontend** | http://localhost:8080 | Interface utilisateur |
| **API Gateway** | http://localhost:3000 | API principale |
| **Metrics API** | http://localhost:8014 | API métriques (appelée par frontend) |
| **Prometheus** | http://localhost:9090 | Interface Prometheus (debug) |
| **Grafana** | http://localhost:3013 | Dashboards (admin/admin123) |
| **cAdvisor** | http://localhost:8082 | Interface cAdvisor (debug) |

## 📝 Configuration

### Variables d'Environnement

Le Metrics Aggregator utilise ces variables :

```env
NODE_ENV=development              # Active les endpoints publics /api/v1/*
PORT=3014                         # Port interne du conteneur
PROMETHEUS_URL=http://prometheus:9090  # URL Prometheus (réseau Docker)
LOKI_URL=http://loki:3100         # URL Loki (réseau Docker)
CADVISOR_URL=http://cadvisor:8080 # URL cAdvisor (réseau Docker)
```

### Frontend

Le frontend utilise ces variables (`.env.local`) :

```env
NEXT_PUBLIC_METRICS_URL=http://localhost:8014
NEXT_PUBLIC_METRICS_API_KEY=jobbingtrack-metrics-secret-key
```

## 🚨 Important

### ❌ NE PAS FAIRE

```javascript
// ❌ Dans le frontend, NE PAS appeler directement :
fetch('http://localhost:9090/...') // Prometheus
fetch('http://localhost:8082/...') // cAdvisor
fetch('http://localhost:9100/...') // Node Exporter
```

### ✅ FAIRE

```javascript
// ✅ Dans le frontend, utiliser uniquement :
fetch('http://localhost:8014/api/v1/metrics')     // Via Metrics Aggregator
fetch('http://localhost:8014/api/v1/services')    // Via Metrics Aggregator
```

## 🔐 Sécurité

### Mode Développement (NODE_ENV=development)

- Endpoints `/api/v1/*` accessibles **sans authentification**
- Prometheus/cAdvisor/Grafana accessibles en localhost uniquement
- Idéal pour le développement local

### Mode Production (NODE_ENV=production)

- Endpoints `/api/v1/*` **désactivés**
- Utiliser les endpoints `/api/metrics/*` **avec JWT**
- Prometheus/cAdvisor/Grafana **non exposés publiquement**
- Accès via Nginx Proxy Manager + API Gateway

## 📚 Commandes Utiles

```bash
# Démarrage complet
make monitoring-full

# Status
make status

# Logs monitoring
make monitoring-logs

# Logs d'un service monitoring
make monitoring-logs-service SERVICE=prometheus

# Redémarrer monitoring
make monitoring-restart

# Tests
./backend/metrics-aggregator-service/test-monitoring.sh
```

## 🎯 Résumé

1. **`make monitoring-full`** pour démarrer tout
2. Le **frontend** appelle **uniquement** `http://localhost:8014`
3. Le **Metrics Aggregator** appelle **Prometheus/Loki** en interne
4. **Prometheus** = métriques complètes (CPU%, RAM%, etc.)
5. **Docker CLI** = fallback basique si Prometheus absent

**Tout est automatique, il suffit d'utiliser `make monitoring-full` ! 🚀**
