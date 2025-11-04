# 🔍 Guide - Monitoring des Services

## 🎯 Problème résolu

Le système affichait des incohérences entre :
- **Page de liste** (`/backoffice/services`) : indiquait tous les services comme "running"
- **Page de détail** (`/backoffice/services/[serviceName]`) : indiquait certains services comme "non disponible"
- **Docker réel** : certains services étaient "unhealthy" (deployment-service, security-service)

## ✅ Solution mise en place

### 1. Backend - Double vérification de santé

Nous vérifions maintenant **deux types de health status** :

#### a) **Health Status Docker** (`health_status_docker`)
- Basé sur le healthcheck configuré dans le `docker-compose.yml`
- Valeurs possibles : `healthy`, `unhealthy`, `starting`, `none`, `unknown`
- Obtenu via `docker inspect --format='{{json .State}}' <container>`

#### b) **Health Status HTTP** (`health_status_http`)
- Basé sur un probe HTTP vers l'endpoint `/health` du service
- Valeurs possibles : `healthy`, `degraded`, `unhealthy`, `unknown`
- Vérifie que le service répond correctement aux requêtes

#### c) **Health Status Final** (`health`)
- Combinaison intelligente des deux checks
- Priorité au health status Docker
- Si Docker dit "unhealthy" → finale = "unhealthy"
- Si Docker dit "healthy" → finale = résultat du HTTP probe
- Si Docker dit "starting" → finale = "starting"

### 2. API `/api/v1/docker/services/all`

**Modifications** :
```javascript
{
  name: "jobbingtrack-security-service",
  status: "running",                    // État Docker (running/exited)
  health_status: "unhealthy",           // Health status Docker
  is_running: true,                     // Booléen: est en cours d'exécution
  is_healthy: false,                    // Booléen: est sain (healthy ou none)
  created: "2025-01-03 15:30:00",
  ports: "0.0.0.0:8017->3017/tcp",
  image: "jobbingtrack-security-service",
  metrics: { /* ... */ }
}
```

**Logique** :
- `is_healthy = true` si `health_status === 'healthy'` OU `health_status === 'none'`
- `is_healthy = false` si `health_status === 'unhealthy'` OU `health_status === 'starting'`

### 3. API `/api/v1/docker/service/:name`

**Modifications** :
```javascript
{
  service: {
    name: "jobbingtrack-security-service",
    cpu_percent: 2.5,
    memory_percent: 15.3,
    memory_usage_mb: 180.5,
    pids: 42,
    
    // Trois statuts distincts
    health: "unhealthy",                      // Statut final combiné
    health_status_docker: "unhealthy",        // Health check Docker
    health_status_http: "degraded",           // Health check HTTP
    
    response_time_ms: 250,
    health_error: "Service timeout",
    errors: { /* ... */ }
  }
}
```

### 4. Frontend - Page de liste (`/backoffice/services`)

**Modifications** :
- Affichage du `health_status` en plus du `status`
- Ajout d'une carte "Services unhealthy" dans les statistiques
- Badge coloré selon le health status :
  - 🟢 Vert : `is_healthy = true`
  - 🟠 Orange : `is_healthy = false` (avec badge supplémentaire pour le health_status)

**Interface** :
```typescript
interface Service {
  name: string
  status: string              // "running", "exited", etc.
  health_status: string       // "healthy", "unhealthy", "starting", "none"
  is_running: boolean
  is_healthy: boolean
  created: string
  ports: string
  image: string
  metrics: { /* ... */ } | null
}
```

**Statistiques** :
- Total Services : 19
- Services actifs : 19
- **Services unhealthy : 2** ⚠️ (NOUVEAU)
- Services arrêtés : 0

### 5. Frontend - Page de détail (`/backoffice/services/[serviceName]`)

**Modifications** :
- Affichage séparé des deux health status (Docker + HTTP)
- Banner coloré selon le statut final
- Badges distincts pour chaque type de check

**Exemple d'affichage** :
```
❌ Service non disponible
Le service rencontre des problèmes

[Docker: unhealthy] [HTTP: degraded]
```

## 📊 Exemples de scénarios

### Scénario 1 : Service parfaitement sain
```
Docker: healthy
HTTP: healthy
→ Finale: healthy
→ Affichage: ✅ Service opérationnel (vert)
```

### Scénario 2 : Service Docker unhealthy
```
Docker: unhealthy
HTTP: healthy
→ Finale: unhealthy
→ Affichage: ❌ Service non disponible (rouge)
```

### Scénario 3 : Service HTTP dégradé
```
Docker: healthy
HTTP: degraded
→ Finale: degraded
→ Affichage: ⚠️ Service dégradé (orange)
```

### Scénario 4 : Service en démarrage
```
Docker: starting
HTTP: unhealthy
→ Finale: starting
→ Affichage: 🔄 Service en démarrage (jaune)
```

### Scénario 5 : Pas de healthcheck Docker
```
Docker: none
HTTP: healthy
→ Finale: healthy
→ Affichage: ✅ Service opérationnel (vert)
```

## 🔧 Configuration des Healthchecks Docker

### Dans `docker-compose.yml`

Pour qu'un service ait un health status Docker, il doit avoir un healthcheck configuré :

```yaml
services:
  security-service:
    image: jobbingtrack-security-service
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3017/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

**Paramètres** :
- `test` : Commande pour vérifier la santé
- `interval` : Fréquence de vérification
- `timeout` : Temps d'attente max pour la réponse
- `retries` : Nombre d'échecs avant de marquer "unhealthy"
- `start_period` : Temps de grâce au démarrage

### Services sans healthcheck

Si un service n'a pas de healthcheck configuré :
- `health_status_docker = "none"`
- `is_healthy = true` (on considère qu'il est sain si il tourne)
- Seul le HTTP probe est utilisé pour déterminer la santé

## 🐛 Diagnostic des problèmes

### Un service apparaît comme "unhealthy"

1. **Vérifier les logs Docker** :
```bash
docker logs jobbingtrack-security-service
```

2. **Vérifier le health check** :
```bash
docker inspect jobbingtrack-security-service --format='{{json .State.Health}}'
```

3. **Tester manuellement le endpoint** :
```bash
curl http://localhost:8017/health
```

4. **Vérifier les métriques** :
```bash
curl http://localhost:8014/api/v1/docker/service/jobbingtrack-security-service
```

### Le health status ne se met pas à jour

1. **Rafraîchir la page** (F5)
2. **Vérifier les intervalles de refresh** (10 secondes par défaut)
3. **Vérifier les logs du metrics-aggregator-service** :
```bash
docker logs jobbingtrack-metrics-aggregator
```

### Incohérence entre liste et détail

Cela ne devrait plus arriver maintenant que les deux pages utilisent le même système de health checks Docker. Si c'est le cas :
1. Vider le cache du navigateur
2. Redémarrer le metrics-aggregator-service
3. Vérifier que vous utilisez les dernières versions du code

## 📁 Fichiers modifiés

### Backend
- ✏️ `/backend/metrics-aggregator-service/src/routes/docker.routes.js`
  - Ajout du health_status Docker dans `/services/all`
  - Ajout du double health check dans `/service/:name`

### Frontend
- ✏️ `/frontend/src/app/(admin)/backoffice/services/page.tsx`
  - Interface Service mise à jour
  - Affichage du health_status
  - Compteur de services unhealthy
- ✏️ `/frontend/src/app/(admin)/backoffice/services/[serviceName]/page.tsx`
  - Affichage séparé des deux health status
  - Logique de santé mise à jour

## 🎯 Résultat final

### Avant
- ❌ Tous les services affichés comme "running"
- ❌ Incohérence entre liste et détail
- ❌ Impossible de voir les services en problème

### Après
- ✅ Health status Docker affiché correctement
- ✅ Health status HTTP affiché séparément
- ✅ Compteur de services unhealthy
- ✅ Badges colorés selon l'état réel
- ✅ Cohérence parfaite entre toutes les pages

## 🚀 Utilisation

### Page de liste
1. Aller sur `/backoffice/services`
2. Voir les statistiques en haut :
   - **Services unhealthy** en orange si > 0
3. Dans la liste, les services unhealthy ont :
   - Badge "running" en orange
   - Badge supplémentaire avec le health_status

### Page de détail
1. Cliquer sur un service dans la liste
2. Voir le banner de statut :
   - 🟢 Vert si sain
   - 🔴 Rouge si problème
3. Voir les deux badges :
   - `Docker: unhealthy`
   - `HTTP: degraded`

## 💡 Conseils

1. **Configurer des healthchecks** pour tous les services critiques
2. **Surveiller régulièrement** la page des services
3. **Investiguer immédiatement** les services unhealthy
4. **Utiliser les logs** pour comprendre les problèmes
5. **Tester les endpoints** `/health` manuellement en cas de doute

---

**Note** : Le système utilise maintenant une approche à deux niveaux (Docker + HTTP) pour une détection plus fiable des problèmes de service.

