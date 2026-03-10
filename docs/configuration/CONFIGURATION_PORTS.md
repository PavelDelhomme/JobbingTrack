# Configuration des Ports Externes

## 📋 Vue d'ensemble

Tous les services utilisent des ports externes configurables via des variables d'environnement, commençant à **5000** pour éviter les conflits avec d'autres applications. Les ports se suivent logiquement de 5000 à 5019.

## 🔧 Configuration

Les ports sont définis dans le fichier `.env` (créez-le à partir de `.env.example` si disponible).

### Services Essentiels

| Service | Port Externe | Port Interne | Variable d'environnement |
|---------|--------------|--------------|--------------------------|
| PostgreSQL | 5000 | 5432 | `POSTGRES_PORT` |
| Redis | 5001 | 6379 | `REDIS_PORT` |
| API Gateway | 5002 | 3000 | `API_GATEWAY_PORT` |
| Frontend | 5003 | 3000 | `FRONTEND_PORT` |
| Metrics Aggregator | 5004 | 3014 | `METRICS_AGGREGATOR_PORT` |

### Services Métier

| Service | Port Externe | Port Interne | Variable d'environnement |
|---------|--------------|--------------|--------------------------|
| Auth Service | 5005 | 3001 | `AUTH_SERVICE_PORT` |
| Application Service | 5006 | 3002 | `APPLICATION_SERVICE_PORT` |
| Company Service | 5007 | 3003 | `COMPANY_SERVICE_PORT` |
| Contact Service | 5008 | 3004 | `CONTACT_SERVICE_PORT` |
| Interview Service | 5009 | 3005 | `INTERVIEW_SERVICE_PORT` |
| Call Service | 5010 | 3006 | `CALL_SERVICE_PORT` |
| Event Service | 5011 | 3007 | `EVENT_SERVICE_PORT` |
| FollowUp Service | 5012 | 3008 | `FOLLOWUP_SERVICE_PORT` |
| Profile Service | 5013 | 3009 | `PROFILE_SERVICE_PORT` |
| Notification Service | 5014 | 3010 | `NOTIFICATION_SERVICE_PORT` |
| Dashboard Service | 5015 | 3000 | `DASHBOARD_SERVICE_PORT` |
| Workflow Service | 5016 | 3011 | `WORKFLOW_SERVICE_PORT` |
| Security Service | 5017 | 3017 | `SECURITY_SERVICE_PORT` |
| Deployment Service | 5018 | 3016 | `DEPLOYMENT_SERVICE_PORT` |

### Services Optionnels

| Service | Port Externe | Port Interne | Variable d'environnement |
|---------|--------------|--------------|--------------------------|
| Flutter Mobile | 5019 | 8080 | `FLUTTER_MOBILE_PORT` |

## 🚀 Utilisation

### 1. Créer le fichier `.env`

Copiez le fichier `.env.example` (s'il existe) ou créez un fichier `.env` à la racine du projet avec les ports souhaités :

```bash
cp .env.example .env
```

### 2. Personnaliser les ports (optionnel)

Si vous souhaitez utiliser d'autres ports, modifiez les variables dans `.env` :

```env
POSTGRES_PORT=5000
REDIS_PORT=5001
API_GATEWAY_PORT=5002
FRONTEND_PORT=5003
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
- **Fallback** : Si les variables d'environnement ne sont pas définies, les ports par défaut (5000-5019) seront utilisés
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

- **Frontend** : http://localhost:5003
- **API Gateway** : http://localhost:5002
- **Auth Service** : http://localhost:5005
- **Metrics** : http://localhost:5004
- **PostgreSQL** : localhost:5000
- **Redis** : localhost:5001

