# Configuration des Ports Externes

## 📋 Vue d'ensemble

Tous les services utilisent des ports externes configurables via des variables d'environnement, commençant à **9390** pour éviter les conflits avec d'autres applications.

## 🔧 Configuration

Les ports sont définis dans le fichier `.env` (créez-le à partir de `.env.example` si disponible).

### Services Essentiels

| Service | Port Externe | Port Interne | Variable d'environnement |
|---------|--------------|--------------|--------------------------|
| PostgreSQL | 9390 | 5432 | `POSTGRES_PORT` |
| Redis | 9391 | 6379 | `REDIS_PORT` |
| API Gateway | 9392 | 3000 | `API_GATEWAY_PORT` |
| Frontend | 9393 | 3000 | `FRONTEND_PORT` |
| Metrics Aggregator | 9394 | 3014 | `METRICS_AGGREGATOR_PORT` |

### Services Métier

| Service | Port Externe | Port Interne | Variable d'environnement |
|---------|--------------|--------------|--------------------------|
| Auth Service | 9395 | 3001 | `AUTH_SERVICE_PORT` |
| Application Service | 9396 | 3002 | `APPLICATION_SERVICE_PORT` |
| Company Service | 9397 | 3003 | `COMPANY_SERVICE_PORT` |
| Contact Service | 9398 | 3004 | `CONTACT_SERVICE_PORT` |
| Interview Service | 9399 | 3005 | `INTERVIEW_SERVICE_PORT` |
| Call Service | 9400 | 3006 | `CALL_SERVICE_PORT` |
| Event Service | 9401 | 3007 | `EVENT_SERVICE_PORT` |
| FollowUp Service | 9402 | 3008 | `FOLLOWUP_SERVICE_PORT` |
| Profile Service | 9403 | 3009 | `PROFILE_SERVICE_PORT` |
| Notification Service | 9404 | 3010 | `NOTIFICATION_SERVICE_PORT` |
| Dashboard Service | 9405 | 3000 | `DASHBOARD_SERVICE_PORT` |
| Workflow Service | 9406 | 3011 | `WORKFLOW_SERVICE_PORT` |
| Security Service | 9407 | 3017 | `SECURITY_SERVICE_PORT` |
| Deployment Service | 9408 | 3016 | `DEPLOYMENT_SERVICE_PORT` |

### Services Optionnels

| Service | Port Externe | Port Interne | Variable d'environnement |
|---------|--------------|--------------|--------------------------|
| Flutter Mobile | 9409 | 8080 | `FLUTTER_MOBILE_PORT` |

## 🚀 Utilisation

### 1. Créer le fichier `.env`

Copiez le fichier `.env.example` (s'il existe) ou créez un fichier `.env` à la racine du projet avec les ports souhaités :

```bash
cp .env.example .env
```

### 2. Personnaliser les ports (optionnel)

Si vous souhaitez utiliser d'autres ports, modifiez les variables dans `.env` :

```env
POSTGRES_PORT=9390
REDIS_PORT=9391
API_GATEWAY_PORT=9392
FRONTEND_PORT=9393
# ... etc
```

### 3. Démarrer les services

Les ports seront automatiquement utilisés par Docker Compose :

```bash
docker-compose up -d
```

## 📝 Notes

- **Ports internes** : Ne doivent pas être modifiés, ils sont utilisés pour la communication entre conteneurs Docker
- **Ports externes** : Peuvent être personnalisés selon vos besoins
- **Fallback** : Si les variables d'environnement ne sont pas définies, les ports par défaut (9390-9409) seront utilisés
- **Conflits** : Assurez-vous que les ports externes ne sont pas déjà utilisés par d'autres applications

## 🔍 Vérification

Pour vérifier quels ports sont utilisés :

```bash
docker-compose ps
```

Ou pour voir les ports mappés :

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

## 🌐 URLs d'accès

Une fois les services démarrés, vous pouvez accéder à :

- **Frontend** : http://localhost:9393
- **API Gateway** : http://localhost:9392
- **Auth Service** : http://localhost:9395
- **Metrics** : http://localhost:9394
- **PostgreSQL** : localhost:9390
- **Redis** : localhost:9391

