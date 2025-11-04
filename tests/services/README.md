# Tests de la Page de Détail des Services

Ce dossier contient les tests pour vérifier que la page de détail des services (`/backoffice/services/[serviceName]`) fonctionne correctement et affiche toutes les informations nécessaires.

## 📋 Vue d'Ensemble

Les tests sont divisés en deux parties :

1. **Tests Frontend** (`page.test.tsx`) - Tests unitaires et d'intégration React
2. **Tests Backend** (`test-service-detail-endpoints.js`) - Tests des endpoints API

## 🎯 Tests Frontend

### Installation des dépendances

```bash
cd frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

### Exécution des tests

```bash
# Tous les tests
npm test

# Tests spécifiques à la page de détail
npm test services/[serviceName]/page.test

# Mode watch
npm test -- --watch

# Avec couverture
npm test -- --coverage
```

### Ce qui est testé

#### ✅ **Chargement de la page**
- Affichage du loader pendant le chargement
- Chargement des données du service

#### ✅ **En-tête et navigation**
- Affichage du nom du service
- Bouton retour fonctionnel
- Bouton actualiser présent

#### ✅ **Bannière de statut**
- Statut du service (opérationnel/non disponible)
- Statut Docker (healthy/unhealthy)
- Statut HTTP (healthy/degraded)
- Temps de réponse en ms

#### ✅ **Cartes de métriques**
- **CPU** : Pourcentage d'utilisation
- **Mémoire** : Usage en MB et pourcentage
- **Processus** : Nombre de processus actifs (PIDs)
- **Réseau** : Traffic total, RX et TX séparés

#### ✅ **Historique des performances**
- Section toujours visible
- Nombre de points de données
- Graphiques de CPU, Mémoire et Réseau
- Message de fallback quand pas de données

#### ✅ **Logs en temps réel**
- Section toujours visible
- Nombre total de lignes
- Compteur d'erreurs et warnings
- Bouton auto-scroll
- Affichage des lignes avec coloration syntaxique
- Résumé des erreurs récentes
- Message de fallback quand pas de logs

#### ✅ **Rafraîchissement automatique**
- Indication du rafraîchissement automatique
- Données actualisées toutes les 5 secondes

#### ✅ **Gestion des erreurs**
- Erreurs de chargement des métriques
- Timeout réseau
- Services unhealthy
- Services sans endpoint HTTP (bases de données)

### Structure des tests

```typescript
describe('ServiceDetailPage', () => {
  describe('Chargement de la page', () => {
    it('devrait afficher un loader pendant le chargement initial')
    it('devrait charger et afficher les données du service')
  })

  describe('En-tête et navigation', () => {
    it('devrait afficher le nom du service dans le titre')
    it('devrait avoir un bouton retour fonctionnel')
  })

  // ... autres groupes de tests
})
```

## 🔧 Tests Backend

### Installation

```bash
cd tests/services
npm install axios
```

### Exécution des tests

```bash
# Test d'un service spécifique
node test-service-detail-endpoints.js auth-service

# Test de PostgreSQL
node test-service-detail-endpoints.js postgres

# Test de Redis
node test-service-detail-endpoints.js redis

# Avec une URL personnalisée
METRICS_URL=http://localhost:8014 node test-service-detail-endpoints.js auth-service
```

### Ce qui est testé

#### ✅ **Test 1: Métriques du Service**
- Vérification de la structure de la réponse
- Présence de tous les champs obligatoires
- Validité des valeurs (CPU, Mémoire dans les limites)
- Affichage des métriques actuelles

#### ✅ **Test 2: Historique de Performance**
- Récupération de l'historique avec limite
- Structure correcte des points de données
- Présence des champs timestamp, CPU, Mémoire, Réseau
- Affichage du dernier point

#### ✅ **Test 3: Logs du Service**
- Récupération des logs avec nombre de lignes
- Structure correcte avec compteurs
- Affichage des derniers logs
- Détection des erreurs

#### ✅ **Test 4: Cohérence des Données**
- Cohérence entre métriques actuelles et historique
- Vérification du nom du service
- Détection des écarts importants

#### ✅ **Test 5: Liste de Tous les Services**
- Endpoint `/services/all` fonctionne
- Service demandé présent dans la liste
- Affichage des statuts de tous les services

### Sortie du script

```bash
════════════════════════════════════════════════════════════
Tests des Endpoints de Détail des Services
Service: jobbingtrack-auth-service
URL: http://localhost:8014
════════════════════════════════════════════════════════════

═══ Test 1: Métriques du Service ═══

✅ Métriques: Tous les champs obligatoires présents
ℹ️  CPU: 42.3%
ℹ️  Mémoire: 180.5 MB (68.5%)
ℹ️  Processus: 15
ℹ️  Statut Docker: healthy
ℹ️  Statut HTTP: healthy
ℹ️  Temps de réponse: 9 ms

═══ Test 2: Historique de Performance ═══

✅ Historique: 10 points de données récupérés
✅ Structure Historique: Structure correcte
ℹ️  Dernier point: 04/11/2025 01:00:00
ℹ️    CPU: 42.3%
ℹ️    Mémoire: 180.5 MB
...

═══ Résumé des Tests ═══

Total: 10 tests
Réussis: 10
Échoués: 0
Avertissements: 0
Taux de réussite: 100.0%
```

## 📊 Endpoints Testés

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/v1/docker/service/:name` | GET | Métriques actuelles du service |
| `/api/v1/docker/service/:name/logs` | GET | Logs du service (paramètre: `lines`) |
| `/api/v1/docker/service/:name/history` | GET | Historique de performance (paramètre: `limit`) |
| `/api/v1/docker/services/all` | GET | Liste de tous les services |

## 🎨 Codes de Couleur

Les tests backend utilisent des codes de couleur pour faciliter la lecture :

- 🟢 **Vert** : Test réussi
- 🔴 **Rouge** : Test échoué
- 🟡 **Jaune** : Avertissement
- 🔵 **Bleu** : Information

## 📝 Champs Obligatoires

### Métriques du Service

```json
{
  "service": {
    "name": "jobbingtrack-xxx-service",
    "cpu_percent": 42.3,
    "memory_percent": 68.5,
    "memory_usage_mb": 180.5,
    "pids": 15,
    "health_status_docker": "healthy",
    "health_status_http": "healthy",
    "response_time_ms": 9
  }
}
```

### Point d'Historique

```json
{
  "timestamp": "2025-11-04T00:00:00.000Z",
  "cpu_percent": 42.3,
  "memory_usage_mb": 180.5,
  "network_rx_mb": 12.3,
  "network_tx_mb": 13.1
}
```

### Logs

```json
{
  "success": true,
  "service": "jobbingtrack-xxx-service",
  "total": 50,
  "errors": 3,
  "warnings": 5,
  "lines": ["log line 1", "log line 2"],
  "errorLines": ["error line 1"]
}
```

## 🔍 Cas de Test Spéciaux

### Services sans Endpoint HTTP

PostgreSQL, Redis et autres bases de données n'ont pas d'endpoint HTTP `/health`. Les tests vérifient que :

- `health_status_docker` est présent
- `response_time_ms` est `null`
- Le service est quand même considéré comme healthy si Docker le dit

### Services Unhealthy

Les tests vérifient que la page affiche correctement :

- Le message "Service non disponible"
- Les statuts Docker et HTTP séparément
- Les métriques même si le service est unhealthy

### Services sans Historique

Pour les services récemment démarrés, les tests vérifient :

- Le message de fallback est affiché
- La page ne crashe pas
- La section reste visible

## 🚀 Exécution en CI/CD

### GitHub Actions

```yaml
- name: Tests Frontend
  run: |
    cd frontend
    npm test -- --coverage --ci

- name: Tests Backend
  run: |
    cd tests/services
    node test-service-detail-endpoints.js auth-service
    node test-service-detail-endpoints.js postgres
```

### Docker

```bash
# Lancer les tests dans un conteneur
docker run --rm \
  --network jobbingtrack-network \
  -v $(pwd):/app \
  -w /app/tests/services \
  node:20 \
  node test-service-detail-endpoints.js auth-service
```

## 📚 Documentation Complémentaire

- [Guide de la Page de Détail](../../GUIDE_PAGE_DETAIL_SERVICE.md)
- [Tests Généraux](../README.md)
- [Architecture des Services](../../docs/architecture/README.md)

## 🤝 Contribution

Pour ajouter de nouveaux tests :

1. Ajouter les tests dans `page.test.tsx` pour le frontend
2. Ajouter les vérifications dans `test-service-detail-endpoints.js` pour le backend
3. Mettre à jour ce README avec les nouvelles informations
4. S'assurer que tous les tests passent avant de commit

## ❓ Troubleshooting

### "Cannot find module '@testing-library/react'"

```bash
cd frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

### "ECONNREFUSED localhost:8014"

Vérifier que le `metrics-aggregator-service` est démarré :

```bash
docker ps | grep metrics-aggregator
docker compose up -d jobbingtrack-metrics-aggregator
```

### "Service not found in list"

Le service demandé n'existe pas ou n'est pas démarré :

```bash
docker ps
docker compose up -d [service-name]
```

### Tests frontend qui échouent

Vérifier la configuration Jest dans `frontend/jest.config.js` et s'assurer que tous les mocks sont correctement configurés.

