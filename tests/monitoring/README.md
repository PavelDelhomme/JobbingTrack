# Tests de Monitoring - JobbingTrack

> **⚠️ Obsolète pour la stack active** : ces tests ciblent Prometheus / Loki / cAdvisor.  
> Le monitoring courant utilise **monitoring-agent-rs + metrics-aggregator + backoffice Performances**.  
> Archive configs : `docs/archive/monitoring-old/`. Tests utiles seulement si vous relancez l'ancienne stack.

Tests d'intégration pour l'ancienne stack de monitoring (Prometheus, Loki, cAdvisor, Metrics API).

## 📁 Structure

```
tests/monitoring/
├── test-metrics-api.js                # Tests API Metrics Aggregator
├── test-prometheus-integration.js     # Tests Prometheus
├── test-loki-integration.js           # Tests Loki
├── test-cadvisor-integration.js       # Tests cAdvisor
├── test-monitoring-workflow.js        # Test workflow complet
├── package.json                       # Dépendances npm
├── jest.config.js                     # Configuration Jest
└── README.md                          # Ce fichier
```

## 🚀 Installation

```bash
cd tests/monitoring
npm install
```

## 🧪 Exécution des Tests

### Tous les tests
```bash
npm test
```

### Tests individuels
```bash
# API Metrics Aggregator
npm run test:api

# Prometheus
npm run test:prometheus

# Loki
npm run test:loki

# cAdvisor
npm run test:cadvisor

# Workflow complet (démarrage, tests, arrêt)
npm run test:workflow
```

### Mode watch
```bash
npm run test:watch
```

### CI/CD
```bash
npm run test:ci
```

## ⚙️ Prérequis

### Pour les tests individuels
La stack de monitoring doit être démarrée :

```bash
# Depuis la racine du projet
cd makefiles/backend
make monitoring-up

# Ou directement
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

### Pour le test workflow
Le test workflow démarre/arrête automatiquement la stack.

## 📊 Tests Inclus

### 1. test-metrics-api.js
- ✅ Health check sans authentification
- ✅ Métriques système avec JWT
- ✅ Métriques conteneurs avec JWT
- ✅ Métriques conteneur spécifique
- ✅ Historique métriques
- ✅ Logs conteneur
- ✅ Logs globaux
- ✅ Gestion erreurs 401/403/404

### 2. test-prometheus-integration.js
- ✅ Accessibilité Prometheus (127.0.0.1:9090)
- ✅ API /api/v1/query (instant query)
- ✅ API /api/v1/query_range (range query)
- ✅ Targets cAdvisor et Prometheus UP
- ✅ Métriques conteneurs disponibles
- ✅ Configuration et rétention
- ✅ TSDB stats

### 3. test-loki-integration.js
- ✅ Accessibilité Loki (127.0.0.1:3100)
- ✅ Endpoint /ready
- ✅ Query API /loki/api/v1/query_range
- ✅ LogQL queries {job="docker"}
- ✅ Labels API
- ✅ Series API
- ✅ Promtail ingestion
- ✅ Gestion erreurs

### 4. test-cadvisor-integration.js
- ✅ Accessibilité cAdvisor (127.0.0.1:8081)
- ✅ Métriques CPU
- ✅ Métriques mémoire
- ✅ Métriques réseau
- ✅ Métriques filesystem
- ✅ Métriques machine/host
- ✅ Format Prometheus
- ✅ Détection conteneurs Docker
- ✅ Performance

### 5. test-monitoring-workflow.js
- ✅ Démarrage stack (make monitoring-up)
- ✅ Attente services prêts
- ✅ Vérification collecte Prometheus
- ✅ Vérification ingestion Loki
- ✅ Vérification cAdvisor
- ✅ Récupération métriques via API
- ✅ Récupération logs via API
- ✅ Tests de charge
- ✅ Arrêt stack (make monitoring-down)

## 🔧 Configuration

### Variables d'environnement

```bash
# API Metrics Aggregator
export METRICS_API_URL=http://localhost:3008
export JWT_SECRET=your-secret-key

# Prometheus
export PROMETHEUS_URL=http://127.0.0.1:9090

# Loki
export LOKI_URL=http://127.0.0.1:3100

# cAdvisor
export CADVISOR_URL=http://127.0.0.1:8081
```

### JWT Token

Les tests utilisent un token JWT généré automatiquement. Pour utiliser votre propre token :

```javascript
const token = jwt.sign(
  { id: 1, email: 'redacted@example.invalid', role: 'admin' },
  process.env.JWT_SECRET || 'your-secret-key',
  { expiresIn: '1h' }
);
```

## 📝 Résultats des Tests

### Sortie standard
```bash
PASS tests/monitoring/test-metrics-api.js
  Metrics Aggregator API Tests
    Health Check
      ✓ should return 200 on /health without authentication (52ms)
    System Metrics
      ✓ should return 200 on /api/metrics/system with valid JWT (145ms)
      ✓ should return 401 without JWT (23ms)
    ...

Test Suites: 5 passed, 5 total
Tests:       87 passed, 87 total
Time:        45.234s
```

### Coverage (si activé)
```bash
npm test -- --coverage
```

## 🐛 Debugging

### Logs détaillés
```bash
npm test -- --verbose --detectOpenHandles
```

### Test unique
```bash
npm test -- -t "should return 200 on /health"
```

### Logs services
```bash
# Prometheus
docker logs prometheus

# Loki
docker logs loki

# cAdvisor
docker logs cadvisor

# Metrics API
cd ../../backend/metrics-aggregator-service
npm run dev
```

## 🔍 Troubleshooting

### Services non accessibles
```bash
# Vérifier que les services sont démarrés
docker ps | grep -E "prometheus|loki|cadvisor"

# Redémarrer la stack
cd makefiles/backend
make monitoring-down
make monitoring-up
```

### Tests timeout
Augmenter le timeout dans `jest.config.js` :
```javascript
testTimeout: 60000 // 60 secondes
```

### Port conflicts
Vérifier que les ports ne sont pas utilisés :
```bash
netstat -tuln | grep -E "3008|9090|3100|8081"
```

## 📚 Documentation

- [Prometheus Query API](https://prometheus.io/docs/prometheus/latest/querying/api/)
- [Loki Query API](https://grafana.com/docs/loki/latest/api/)
- [cAdvisor Metrics](https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md)
- [Jest Documentation](https://jestjs.io/docs/getting-started)

## ✅ CI/CD

Intégration dans le pipeline CI/CD :

```yaml
# .github/workflows/ci-cd.yml
- name: Run monitoring tests
  run: |
    cd tests/monitoring
    npm install
    npm run test:ci
```

## 🎯 Checklist avant Production

- [ ] Tous les tests passent
- [ ] Prometheus collecte les métriques
- [ ] Loki reçoit les logs
- [ ] cAdvisor détecte les conteneurs
- [ ] API Metrics répond en < 5s
- [ ] Authentification JWT fonctionne
- [ ] Rétention configurée (90j Prometheus, 30j Loki)
- [ ] Ports localhost only (127.0.0.1)

---

**JobbingTrack Monitoring Tests v1.0.0**
