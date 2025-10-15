# 🚀 Guide de Démarrage Rapide - JobbingTrack

## 📋 Deux Environnements Configurés

JobbingTrack est maintenant configuré pour fonctionner dans **deux environnements** :

### 1️⃣ Développement Local (Votre ordinateur)
- ✅ Communication entre services via `localhost`
- ✅ Démarrage rapide optimisé
- ✅ Hot reload activé
- ✅ Accès direct aux ports

### 2️⃣ Production (Portainer + Nginx Proxy Manager)
- ✅ Communication entre services via noms de conteneurs
- ✅ SSL/TLS avec Let's Encrypt
- ✅ Reverse proxy configuré
- ✅ Haute disponibilité

---

## 🖥️ Développement Local

### Démarrage rapide (⚡ Optimisé)

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack

# ⚡ Démarrage rapide sans reconstruction
make dev

# Ou démarrage complet avec vérifications
make up
```

**Temps de démarrage optimisé :** ~30 secondes (au lieu de 3-5 minutes)

### URLs d'accès en local

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:8080 | Interface principale |
| **Backoffice** | http://localhost:8080/backoffice | Administration |
| **API Gateway** | http://localhost:3000 | API REST |
| **API Docs** | http://localhost:3000/api-docs | Documentation Swagger |

### Identifiants de connexion

```
Email: admin@jobbingtrack.com
Mot de passe: password123
```

### Commandes utiles

```bash
# Voir l'état des services
make status

# Consulter les logs
make logs

# Arrêter proprement
make down

# Redémarrer rapidement
make dev
```

---

## 🌐 Déploiement Production (Portainer)

### Configuration réseau

En production, les services communiquent via le réseau Docker `jobbingtrack-prod-network` :

```
Frontend → API Gateway
  ↓
API Gateway → Services Backend
  ↓
Services → PostgreSQL/Redis
```

**Noms de conteneurs en production :**
- `jobbingtrack-api-gateway-prod`
- `jobbingtrack-auth-service-prod`
- `jobbingtrack-application-service-prod`
- `jobbingtrack-postgres-prod`
- `jobbingtrack-redis-prod`
- etc.

### Étapes de déploiement

#### 1. Préparer les fichiers

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack/production
cp env.production.example .env
nano .env  # Configurez vos variables
```

#### 2. Transférer sur le serveur

```bash
# Via Git (recommandé)
ssh user@votre-serveur.com
cd /opt
git clone https://github.com/VotreUsername/JobbingTrack.git jobbingtrack
cd jobbingtrack/production
cp env.production.example .env
nano .env

# Ou via SCP
scp -r /home/pactivisme/Documents/Dev/Perso/JobbingTrack/* user@serveur:/opt/jobbingtrack/
```

#### 3. Déployer dans Portainer

1. **Ouvrez Portainer** : `https://portainer.votreserveur.com`
2. **Stacks** → **Add stack**
3. **Nom** : `jobbingtrack-production`
4. **Upload** : `production/docker-compose.production.yml`
5. **Variables d'environnement** : Ajoutez vos secrets
6. **Deploy the stack**

#### 4. Configurer Nginx Proxy Manager

**Proxy Host :**
```
Domain: jobbingtrack.votredomaine.com
Forward to: jobbingtrack-frontend-prod:3000
SSL: ✅ Let's Encrypt
Force SSL: ✅
```

**Proxy Host API (optionnel) :**
```
Domain: api.jobbingtrack.votredomaine.com
Forward to: jobbingtrack-api-gateway-prod:3000
SSL: ✅ Let's Encrypt
```

### Variables d'environnement requises

```bash
# Domaine
DOMAIN=jobbingtrack.votredomaine.com
FRONTEND_URL=https://jobbingtrack.votredomaine.com

# Sécurité (générez avec: openssl rand -base64 64)
POSTGRES_PASSWORD=VotreMotDePasseSecurise
JWT_SECRET=VotreSecretJWT...
JWT_REFRESH_SECRET=VotreSecretRefresh...

# Email
SMTP_HOST=smtp.votreserveur.com
SMTP_PORT=587
SMTP_USER=noreply@votredomaine.com
SMTP_PASS=VotreMotDePasseEmail
SMTP_FROM=JobbingTrack <noreply@votredomaine.com>

# CORS
ALLOWED_ORIGINS=https://jobbingtrack.votredomaine.com
```

### Commandes production

```bash
# Déployer
make -f Makefile.production deploy

# Voir l'état
make -f Makefile.production status

# Logs
make -f Makefile.production logs

# Sauvegarder
make -f Makefile.production backup

# Mettre à jour
make -f Makefile.production update
```

---

## 🔧 Différences Clés Dev vs Prod

| Aspect | Développement | Production |
|--------|---------------|------------|
| **Communication** | `localhost:PORT` | `nom-conteneur:PORT` |
| **Réseau** | `backend_jobbingtrack-network` | `jobbingtrack-prod-network` |
| **Noms conteneurs** | `jobbingtrack-*` | `jobbingtrack-*-prod` |
| **Accès externe** | Direct localhost | Via Nginx Proxy Manager |
| **SSL** | Non | Oui (Let's Encrypt) |
| **Variables ENV** | Hardcodées | Depuis fichier .env |
| **Build** | `make dev` (rapide) | `make deploy` (sécurisé) |

---

## ✅ Configuration Actuelle

### Backend (développement local)

**API Gateway** utilise maintenant des **variables d'environnement** avec fallback `localhost` :

```javascript
const services = {
  '/api/v1/applications': process.env.APPLICATION_SERVICE_URL || 'http://localhost:3002',
  '/api/v1/companies': process.env.COMPANY_SERVICE_URL || 'http://localhost:3003',
  // ...
}
```

**En développement :**
- ✅ Utilise `localhost` pour vitesse maximale
- ✅ Pas besoin de reconstruire à chaque démarrage
- ✅ Hot reload activé

**En production :**
- ✅ Utilise les noms de conteneurs (`jobbingtrack-*-prod`)
- ✅ Communication sécurisée via réseau Docker
- ✅ Isolation complète des services

### Frontend

**Développement :**
```
NEXT_PUBLIC_API_URL=http://localhost:3000
Port: 8080
```

**Production :**
```
NEXT_PUBLIC_API_URL=http://jobbingtrack-api-gateway-prod:3000
Port: 3000 (interne) → 443 (via Nginx)
```

---

## 📊 Résumé des Corrections

### Problèmes résolus aujourd'hui

1. ✅ **Route `/api/v1/auth/profile` manquante** → Ajoutée
2. ✅ **Middleware Next.js** → Support tokens mock
3. ✅ **Composant Tooltip manquant** → Créé
4. ✅ **Hook useOfflineSync** → Corrigé pour SSR
5. ✅ **Hook useSearchIndex** → Import `preloadEntity` ajouté
6. ✅ **Page utilisateurs** → URLs API corrigées
7. ✅ **Page services** → URLs health check corrigées
8. ✅ **Middleware authentification** → Support tokens développement
9. ✅ **Configuration production** → Fichiers Portainer créés
10. ✅ **Optimisation `make dev`** → Démarrage rapide sans build

---

## 🎯 Prochaines Étapes

### Pour utiliser en développement

```bash
# 1. Démarrer
make dev

# 2. Accéder
open http://localhost:8080

# 3. Se connecter
# Email: admin@jobbingtrack.com
# Password: password123
```

### Pour déployer en production

```bash
# 1. Configurer
cd production
cp env.production.example .env
nano .env  # Configurez vos secrets

# 2. Transférer sur serveur
scp -r . user@serveur:/opt/jobbingtrack/

# 3. Déployer dans Portainer
# Suivez le guide: docs/deployment/GUIDE-PORTAINER.md

# 4. Configurer Nginx Proxy Manager
# Créer proxy host vers jobbingtrack-frontend-prod:3000
```

---

## 📚 Documentation

- **Guide Production** : `docs/deployment/GUIDE-PORTAINER.md`
- **Guide Développement** : `docs/guides/getting-started.md`
- **Architecture** : `docs/technical/architecture.md`
- **API Documentation** : http://localhost:3000/api-docs

---

## 🆘 Support

- 📧 Email : candidatures@delhomme.ovh
- 📚 Documentation : `/docs/`
- 🐛 Issues : GitHub Issues

---

**🎉 JobbingTrack est prêt pour le développement ET la production !**

