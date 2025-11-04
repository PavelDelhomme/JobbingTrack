# 🔒 Système de Sécurité - JobbingTrack

## Vue d'ensemble

Le système de sécurité de JobbingTrack enregistre automatiquement tous les événements de sécurité dans une base de données centralisée et permet de les visualiser en temps réel.

## Architecture

```
┌─────────────────┐
│  Frontend       │
│  /backoffice/   │
│  security/logs  │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  API Gateway    │
│  Port: 3000     │
└────────┬────────┘
         │ Proxy
         ▼
┌─────────────────┐      ┌──────────────┐
│ Security Service│◄────►│  PostgreSQL  │
│  Port: 3017     │      │  Database    │
└────────┬────────┘      └──────────────┘
         │
         ▲
         │ Logs envoyés
         │
┌────────┴────────┐
│  Auth Service   │
│  Port: 3001     │
└─────────────────┘
```

## Composants

### 1. Backend - Security Service (`backend/security-service/`)

**Port:** 3017  
**Base de données:** PostgreSQL (`security_logs` table)

#### Fonctionnalités:
- ✅ Enregistrement des logs de sécurité
- ✅ Récupération des logs avec filtres
- ✅ Calcul de métriques de sécurité
- ✅ Détection automatique d'alertes (score de risque > 70%)
- ✅ Analyse de tendances
- ✅ Gestion des vulnérabilités, intrusions, attaques DDoS

#### Routes API:
```
GET  /api/v1/security/logs           - Récupérer les logs
POST /api/v1/security/logs           - Créer un log
GET  /api/v1/security/metrics        - Métriques de sécurité
GET  /api/v1/security/stats          - Statistiques détaillées
GET  /api/v1/security/trends         - Tendances par heure
GET  /api/v1/security/alerts         - Alertes de sécurité
POST /api/v1/security/analyze        - Déclencher analyse manuelle
```

### 2. Backend - Auth Service (`backend/auth-service/`)

**Port:** 3001  
**Rôle:** Enregistre automatiquement les événements d'authentification

#### Événements enregistrés:
- ✅ `registration_success` - Inscription réussie
- ✅ `registration_duplicate_email` - Tentative avec email existant
- ✅ `login_attempt` - Tentative de connexion
- ✅ `login_success` - Connexion réussie
- ✅ `login_failed` - Échec de connexion
- ✅ `logout` - Déconnexion
- ✅ `token_refresh` - Rafraîchissement de token
- ✅ `unauthorized_access` - Accès non autorisé
- ✅ `password_change` - Changement de mot de passe

#### Fonction d'envoi:
```javascript
// backend/auth-service/src/controllers/auth.controller.js
async function sendSecurityLog(level, category, eventType, message, additionalData = {}) {
  // Envoie automatiquement au security-service
  await axios.post(`${SECURITY_SERVICE_URL}/api/v1/security/logs`, {...});
}
```

### 3. Frontend - Page des Logs (`frontend/src/app/(admin)/backoffice/security/logs/`)

**URL:** `/backoffice/security/logs`  
**Service:** `frontend/src/lib/services/securityService.ts`

#### Fonctionnalités:
- ✅ Affichage des logs en temps réel
- ✅ Actualisation automatique toutes les 30 secondes
- ✅ Filtrage par niveau (info, warning, error, critical)
- ✅ Recherche par message, utilisateur, IP, type d'événement
- ✅ Affichage des statistiques (Total, Infos, Alertes, Erreurs)
- ✅ Affichage du score de risque
- ✅ Affichage du pays d'origine (si disponible)

#### Cartes statistiques:
```
┌──────────┬──────────┬──────────┬──────────────┐
│  Total   │  Infos   │ Alertes  │ Erreurs/Crit │
│   150    │   100    │    35    │      15      │
└──────────┴──────────┴──────────┴──────────────┘
```

## Modèle de données

### SecurityLog (Table PostgreSQL)
```typescript
{
  id: string;           // ID unique (cuid)
  timestamp: DateTime;  // Date/heure de l'événement
  level: string;        // info, warning, error, critical
  category: string;     // authentication, intrusion, ddos, vulnerability
  eventType: string;    // login_success, login_failed, etc.
  message: string;      // Description de l'événement
  sourceIP: string?;    // Adresse IP source
  userAgent: string?;   // User-Agent du navigateur
  userId: string?;      // ID de l'utilisateur concerné
  endpoint: string?;    // Endpoint API appelé
  method: string?;      // Méthode HTTP (GET, POST, etc.)
  statusCode: number?;  // Code de statut HTTP
  responseTime: number?;// Temps de réponse en ms
  country: string?;     // Pays d'origine (code ISO)
  city: string?;        // Ville d'origine
  riskScore: number?;   // Score de risque (0-100)
  isBlocked: boolean;   // Si l'action a été bloquée
  metadata: JSON?;      // Données supplémentaires
  createdAt: DateTime;  // Date de création
  updatedAt: DateTime;  // Date de modification
}
```

## Scores de risque

Le système calcule automatiquement un score de risque pour chaque événement :

| Score | Niveau | Description | Action |
|-------|--------|-------------|--------|
| 0-30  | Faible | Activité normale | Aucune |
| 31-50 | Moyen | Activité suspecte | Surveillance |
| 51-70 | Élevé | Tentative d'intrusion | Alerte |
| 71-89 | Très élevé | Attaque potentielle | Alerte High |
| 90-100 | Critique | Attaque confirmée | Alerte Critical |

### Calcul du score:
```javascript
let riskScore = 0;

// Base par niveau
if (level === 'critical') riskScore = 100;
else if (level === 'error') riskScore = 70;
else if (level === 'warning') riskScore = 40;
else riskScore = 10;

// Augmentation pour certains événements
if (eventType === 'login_failed') riskScore += 20;
if (eventType === 'unauthorized_access') riskScore += 20;
if (eventType === 'suspicious_activity') riskScore += 30;

// Score final (max 100)
riskScore = Math.min(riskScore, 100);
```

## Installation et configuration

### 1. Initialiser la base de données

```bash
cd backend/security-service
npm install
npx prisma migrate dev
npx prisma generate
```

### 2. Variables d'environnement

**security-service/.env:**
```env
PORT=3017
DATABASE_URL="postgresql://user:password@localhost:5432/security_db"
NODE_ENV=development
```

**auth-service/.env:**
```env
SECURITY_SERVICE_URL=http://security-service:3017
```

**api-gateway/.env:**
```env
SECURITY_SERVICE_URL=http://security-service:3017
```

### 3. Démarrer les services

```bash
# Backend
cd backend
docker-compose up -d

# Ou individuellement:
cd backend/security-service && npm start
cd backend/auth-service && npm start
cd backend/api-gateway && npm start

# Frontend
cd frontend
npm run dev
```

## Utilisation

### 1. Visualiser les logs

1. Ouvrez le frontend: `http://localhost:8080`
2. Connectez-vous
3. Allez dans **Backoffice** > **Sécurité & Logs** > **Logs de Sécurité**

### 2. Enregistrer un log manuellement (API)

```bash
curl -X POST http://localhost:3000/api/v1/security/logs \
  -H "Content-Type: application/json" \
  -d '{
    "level": "warning",
    "category": "authentication",
    "eventType": "login_failed",
    "message": "Tentative de connexion échouée pour user@example.com",
    "sourceIP": "192.168.1.100",
    "userId": "user-123",
    "riskScore": 45
  }'
```

### 3. Récupérer les logs

```bash
# Tous les logs
curl http://localhost:3000/api/v1/security/logs

# Filtrer par niveau
curl http://localhost:3000/api/v1/security/logs?level=error

# Filtrer par catégorie
curl http://localhost:3000/api/v1/security/logs?category=authentication

# Limiter les résultats
curl http://localhost:3000/api/v1/security/logs?limit=50&offset=0
```

### 4. Récupérer les métriques

```bash
curl http://localhost:3000/api/v1/security/metrics?days=7
```

## Événements automatiques

Le système enregistre automatiquement les événements suivants :

### Authentification
- Inscription (succès/échec)
- Connexion (succès/échec)
- Déconnexion
- Changement de mot de passe
- Rafraîchissement de token
- Accès non autorisé

### Système
- Limites de taux atteintes
- Tentatives d'intrusion
- Activités suspectes
- Attaques DDoS (si détectées)

## Alertes automatiques

Le système crée automatiquement une alerte si :
- Le score de risque est ≥ 70
- Plus de 5 échecs de connexion en 5 minutes
- Détection d'activité suspecte
- Attaque DDoS détectée

## Maintenance

### Nettoyage des anciens logs

```javascript
// Supprimer les logs de plus de 90 jours
await securityService.cleanupOldLogs(90);
```

### Analyse manuelle

```bash
curl -X POST http://localhost:3000/api/v1/security/analyze
```

## Tests

```bash
cd backend/security-service
npm test
```

## Troubleshooting

### Les logs n'apparaissent pas

1. Vérifier que le security-service est démarré:
```bash
curl http://localhost:3017/health
```

2. Vérifier les logs du service:
```bash
docker logs security-service
```

3. Vérifier la base de données:
```bash
psql -U user -d security_db -c "SELECT COUNT(*) FROM security_logs;"
```

### Erreur de connexion frontend

1. Vérifier l'API Gateway:
```bash
curl http://localhost:3000/api/v1/security/logs
```

2. Vérifier la configuration CORS dans `security-service/src/server.js`

## Futures améliorations

- [ ] Géolocalisation automatique des IPs
- [ ] Détection ML des patterns d'attaque
- [ ] Notifications en temps réel (WebSocket)
- [ ] Export des logs (CSV, JSON)
- [ ] Tableau de bord analytique
- [ ] Intégration avec SIEM externe
- [ ] Blocage automatique d'IPs suspectes
- [ ] Authentification à deux facteurs (2FA)

## Support

Pour toute question ou problème, consulter :
- Documentation: `/backend/security-service/README.md`
- Tests: `/backend/security-service/tests/`
- Issues: GitHub Issues

---

**Version:** 1.0.0  
**Dernière mise à jour:** 3 novembre 2025  
**Auteur:** JobbingTrack Team

