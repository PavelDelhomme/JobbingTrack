# Configuration Centralisée des Ports

## 📋 Vue d'ensemble

Tous les ports des services JobbingTrack sont maintenant centralisés dans des variables d'environnement, permettant une configuration flexible et facile à modifier.

## 🔧 Fichiers de Configuration

### 1. Variables d'environnement (`.env`)

Toutes les variables de ports sont définies dans le fichier `.env` (ou `.env.example` pour référence) :

```bash
# Ports externes (exposés sur l'hôte)
FRONTEND_PORT=8080
API_GATEWAY_PORT=3000
AUTH_SERVICE_PORT=8001
APPLICATION_SERVICE_PORT=8002
COMPANY_SERVICE_PORT=8003
CONTACT_SERVICE_PORT=8004
INTERVIEW_SERVICE_PORT=8005
CALL_SERVICE_PORT=8006
EVENT_SERVICE_PORT=8007
FOLLOWUP_SERVICE_PORT=8008
METRICS_AGGREGATOR_PORT=8014
DASHBOARD_SERVICE_PORT=8012
POSTGRES_PORT=5432
REDIS_PORT=6379

# Ports internes (dans les conteneurs Docker)
FRONTEND_INTERNAL_PORT=3000
API_GATEWAY_INTERNAL_PORT=3000
AUTH_SERVICE_INTERNAL_PORT=3001
APPLICATION_SERVICE_INTERNAL_PORT=3002
# ... etc
```

### 2. Configuration Backend (`config/ports.config.js`)

Fichier JavaScript pour la configuration côté backend :

```javascript
const portsConfig = require('./config/ports.config.js');

// Obtenir les URLs des services
const serviceUrls = portsConfig.getServiceUrls();
// { apiGateway: 'http://api-gateway:3000', auth: 'http://auth-service:3001', ... }

// Obtenir les URLs locales
const localUrls = portsConfig.getLocalUrls();
// { frontend: 'http://localhost:8080', apiGateway: 'http://localhost:3000', ... }
```

### 3. Configuration Frontend (`frontend/src/config/ports.config.ts`)

Fichier TypeScript pour la configuration côté frontend :

```typescript
import { FRONTEND_URLS, SERVICE_URLS, getServiceUrl } from '@/config/ports.config';

// Utiliser les URLs
const apiUrl = FRONTEND_URLS.api; // http://localhost:3000
const metricsUrl = FRONTEND_URLS.metrics; // http://localhost:8014

// Obtenir l'URL d'un service spécifique
const authUrl = getServiceUrl('auth'); // http://localhost:8001
```

## 📦 Services et Ports

| Service | Port Externe | Port Interne | URL Locale |
|---------|--------------|--------------|------------|
| Frontend | 8080 | 3000 | http://localhost:8080 |
| API Gateway | 3000 | 3000 | http://localhost:3000 |
| Auth Service | 8001 | 3001 | http://localhost:8001 |
| Application Service | 8002 | 3002 | http://localhost:8002 |
| Company Service | 8003 | 3003 | http://localhost:8003 |
| Contact Service | 8004 | 3004 | http://localhost:8004 |
| Interview Service | 8005 | 3005 | http://localhost:8005 |
| Call Service | 8006 | 3006 | http://localhost:8006 |
| Event Service | 8007 | 3007 | http://localhost:8007 |
| FollowUp Service | 8008 | 3008 | http://localhost:8008 |
| Metrics Aggregator | 8014 | 3014 | http://localhost:8014 |
| Dashboard Service | 8012 | 3000 | http://localhost:8012 |
| PostgreSQL | 5432 | 5432 | localhost:5432 |
| Redis | 6379 | 6379 | localhost:6379 |

## 🔄 Utilisation dans le Code

### Frontend

```typescript
// ✅ Utiliser la configuration centralisée
import { FRONTEND_URLS } from '@/config/ports.config';

const apiClient = axios.create({
  baseURL: FRONTEND_URLS.api, // http://localhost:3000
});
```

### Backend

```javascript
// ✅ Utiliser les variables d'environnement
const API_GATEWAY_PORT = process.env.API_GATEWAY_PORT || 3000;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
```

### Docker Compose

```yaml
# ✅ Utiliser les variables d'environnement avec valeurs par défaut
ports:
  - "${API_GATEWAY_PORT:-3000}:${API_GATEWAY_INTERNAL_PORT:-3000}"
```

## 🚀 Génération du `.env.example`

Un script est disponible pour générer automatiquement le fichier `.env.example` :

```bash
./scripts/env/generate-env-example.sh
```

## ⚙️ Modification des Ports

Pour modifier un port :

1. **Modifier le fichier `.env`** :
   ```bash
   API_GATEWAY_PORT=3001  # Changer le port externe de l'API Gateway
   ```

2. **Redémarrer les services** :
   ```bash
   make down
   make up-full
   ```

3. **Mettre à jour le frontend** (si nécessaire) :
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

## 🔍 Vérification

Pour vérifier que tous les ports sont correctement configurés :

```bash
# Voir tous les ports exposés
make status-port

# Voir le statut des services
make status

# Voir le statut en temps réel
make status-live
```

## 📝 Notes Importantes

1. **Ports externes** : Ce sont les ports accessibles depuis votre machine locale
2. **Ports internes** : Ce sont les ports utilisés dans le réseau Docker
3. **Variables NEXT_PUBLIC_*** : Ces variables sont accessibles côté client (frontend)
4. **Variables sans NEXT_PUBLIC_*** : Ces variables sont uniquement côté serveur

## 🐛 Dépannage

### Erreur `ERR_CONNECTION_REFUSED`

Si vous obtenez une erreur de connexion :

1. Vérifiez que le service est démarré :
   ```bash
   docker ps | grep api-gateway
   ```

2. Vérifiez que le port est correctement exposé :
   ```bash
   docker port jobbingtrack-api-gateway
   ```

3. Vérifiez les logs du service :
   ```bash
   docker logs jobbingtrack-api-gateway
   ```

4. Vérifiez que les variables d'environnement sont correctes :
   ```bash
   docker exec jobbingtrack-api-gateway env | grep PORT
   ```

### Port déjà utilisé

Si un port est déjà utilisé :

1. Modifiez la variable dans `.env`
2. Redémarrez les services :
   ```bash
   make down
   make up-full
   ```

## 📚 Fichiers Modifiés

- `config/ports.config.js` - Configuration centralisée backend
- `frontend/src/config/ports.config.ts` - Configuration centralisée frontend
- `docker-compose.yml` - Utilisation des variables d'environnement
- `frontend/next.config.js` - Variables d'environnement Next.js
- `frontend/src/lib/api.ts` - Utilisation de la configuration centralisée
- `frontend/src/config/api.config.ts` - Utilisation de la configuration centralisée
- `.env.example` - Exemple de configuration (généré par script)

