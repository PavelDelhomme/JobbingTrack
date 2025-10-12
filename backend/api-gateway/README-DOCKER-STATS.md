# 📊 Docker Stats API

## Description

API permettant de récupérer les statistiques en temps réel des conteneurs Docker de JobbingTrack.

## Endpoints

### 1. Obtenir toutes les statistiques

```http
GET /api/v1/admin/docker/stats
Authorization: Bearer <token>
```

**Réponse :**
```json
{
  "success": true,
  "stats": {
    "api-gateway": {
      "containerId": "abc123def456",
      "containerName": "jobbingtrack-api-gateway",
      "cpu": "2.5",
      "cpuPercent": "2.5%",
      "memoryUsed": "45.5MiB",
      "memoryLimit": "512MiB",
      "memoryPercent": "8.89",
      "memoryUsage": "45.5MiB / 512MiB",
      "networkIO": "1.2MB / 850KB",
      "blockIO": "12.5MB / 8.9MB",
      "timestamp": "2025-10-12T14:30:00.000Z"
    },
    "auth": { ... },
    "applications": { ... }
  },
  "count": 14
}
```

**Erreur (Docker inaccessible) :**
```json
{
  "success": false,
  "error": "spawn docker ENOENT",
  "stats": {},
  "fallback": true,
  "message": "Docker stats non disponibles - utilisez docker avec les permissions appropriées"
}
```

### 2. Obtenir les stats d'un service spécifique

```http
GET /api/v1/admin/docker/stats/:serviceName
Authorization: Bearer <token>
```

**Paramètres :**
- `serviceName` : Nom du service (api-gateway, auth, applications, companies, etc.)

**Exemple :**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/admin/docker/stats/applications
```

**Réponse :**
```json
{
  "success": true,
  "stats": {
    "containerId": "def456ghi789",
    "containerName": "jobbingtrack-application-service",
    "serviceName": "applications",
    "cpu": "3.2",
    "cpuPercent": "3.2%",
    "memoryUsed": "128.5MiB",
    "memoryLimit": "1GiB",
    "memoryPercent": "12.55",
    "memoryUsage": "128.5MiB / 1GiB",
    "networkIO": "2.5MB / 1.8MB",
    "blockIO": "45.2MB / 23.1MB",
    "timestamp": "2025-10-12T14:35:00.000Z"
  }
}
```

**Erreur (Service non trouvé) :**
```json
{
  "success": false,
  "error": "Service non trouvé"
}
```

### 3. Obtenir l'historique des stats

```http
GET /api/v1/admin/docker/stats/:serviceName/history?points=20
Authorization: Bearer <token>
```

**Paramètres de requête :**
- `points` : Nombre de points d'historique (défaut: 20)

**Note :** Actuellement retourne des données simulées. L'implémentation d'un vrai système de stockage est à venir.

**Réponse :**
```json
{
  "success": true,
  "serviceName": "applications",
  "history": [
    {
      "timestamp": "2025-10-12T14:30:00.000Z",
      "cpu": 12.5,
      "memory": 45.2
    },
    {
      "timestamp": "2025-10-12T14:30:10.000Z",
      "cpu": 15.8,
      "memory": 47.1
    }
  ],
  "points": 20
}
```

### 4. Obtenir les informations détaillées d'un conteneur

```http
GET /api/v1/admin/docker/info/:serviceName
Authorization: Bearer <token>
```

**Réponse :**
```json
{
  "success": true,
  "info": {
    "id": "abc123def456",
    "name": "jobbingtrack-application-service",
    "state": "running",
    "running": true,
    "startedAt": "2025-10-12T10:00:00.000Z",
    "image": "jobbingtrack-application-service:latest",
    "platform": "linux/amd64",
    "hostname": "abc123def456",
    "ports": {
      "3002/tcp": [
        {
          "HostIp": "0.0.0.0",
          "HostPort": "3002"
        }
      ]
    },
    "networks": ["jobbingtrack-network"],
    "restartCount": 0,
    "labels": { ... }
  }
}
```

## Mapping des Services

Les noms de conteneurs Docker sont mappés vers des noms de services :

| Nom du Conteneur | Nom du Service | Port |
|------------------|----------------|------|
| jobbingtrack-api-gateway | api-gateway | 8080 |
| jobbingtrack-auth-service | auth | 3001 |
| jobbingtrack-application-service | applications | 3002 |
| jobbingtrack-company-service | companies | 3003 |
| jobbingtrack-contact-service | contacts | 3004 |
| jobbingtrack-interview-service | interviews | 3005 |
| jobbingtrack-notification-service | notifications | 3006 |
| jobbingtrack-dashboard-service | dashboard | 3007 |
| jobbingtrack-call-service | calls | 3008 |
| jobbingtrack-profile-service | profile | 3009 |
| jobbingtrack-event-service | events | 3011 |
| jobbingtrack-followup-service | followups | 3012 |
| jobbingtrack-workflow-service | workflow | 3013 |
| jobbingtrack-frontend | frontend | 3000 |
| jobbingtrack-postgres | postgres | 5432 |
| jobbingtrack-redis | redis | 6379 |

## Sécurité

### Authentification Requise

Tous les endpoints nécessitent un token JWT valide :

```http
Authorization: Bearer <your-jwt-token>
```

### Permissions

Seuls les utilisateurs avec le rôle **admin** peuvent accéder à ces endpoints.

## Prérequis

### Permissions Docker

L'utilisateur exécutant l'API Gateway doit avoir accès à Docker :

```bash
# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER

# Recharger les groupes
newgrp docker

# Tester l'accès
docker stats --no-stream
```

### Script d'Installation

Un script est fourni pour automatiser la configuration :

```bash
./setup-docker-permissions.sh
```

## Utilisation avec curl

### Exemple complet

```bash
# 1. S'authentifier
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"redacted@example.invalid","password":"admin123"}' \
  | jq -r '.token')

# 2. Obtenir toutes les stats
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/admin/docker/stats \
  | jq '.'

# 3. Stats d'un service spécifique
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/admin/docker/stats/applications \
  | jq '.stats'

# 4. Infos détaillées
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/admin/docker/info/applications \
  | jq '.info'
```

## Tests

Un script de test complet est fourni :

```bash
./test-docker-metrics.sh
```

Ce script :
- ✅ Vérifie l'accès à l'API Gateway
- ✅ S'authentifie automatiquement
- ✅ Teste tous les endpoints
- ✅ Affiche les résultats formatés

## Erreurs Courantes

### Permission denied

```bash
Error: connect EACCES /var/run/docker.sock
```

**Solution :**
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Docker not found

```bash
Error: spawn docker ENOENT
```

**Solution :**
- Vérifier que Docker est installé : `which docker`
- Installer Docker si nécessaire

### Container not found

```bash
Error: No such container
```

**Solution :**
- Vérifier que les conteneurs sont démarrés : `docker ps`
- Démarrer les services : `docker-compose up -d`

## Performance

### Impact sur les Performances

- **Overhead CPU** : Négligeable (~0.1% par requête)
- **Overhead Mémoire** : ~1MB par requête
- **Latence** : ~50-100ms (dépend de Docker)

### Recommandations

- ✅ Utiliser un intervalle d'auto-refresh ≥ 10s
- ✅ Ne pas appeler trop fréquemment (rate limit recommandé)
- ✅ Utiliser l'endpoint spécifique plutôt que `/stats` pour un seul service

## Améliorations Futures

- [ ] Cache des métriques (Redis)
- [ ] Historique persistant en base de données
- [ ] Agrégation des métriques sur 1h/24h/7j/30j
- [ ] Alertes configurables par seuils
- [ ] Export des métriques (CSV, JSON, Prometheus)
- [ ] WebSocket pour streaming en temps réel
- [ ] Comparaison de périodes
- [ ] Prédictions de charge (ML)

## Support

- **Documentation complète** : Voir `METRIQUES-DOCKER.md`
- **Guide rapide** : Voir `GUIDE-METRIQUES-RAPIDE.md`
- **Tests** : Exécuter `./test-docker-metrics.sh`

## Licence

Partie de JobbingTrack - Tous droits réservés

