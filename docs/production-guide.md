# 🚀 Guide de Déploiement Production - JobbingTrack

Ce guide vous explique comment déployer JobbingTrack en production sur Portainer avec Nginx Proxy Manager.

## 📋 Prérequis

- ✅ Serveur Linux avec Docker et Docker Compose
- ✅ Portainer installé et accessible
- ✅ Nginx Proxy Manager installé et configuré
- ✅ Nom de domaine configuré (ex: `jobbingtrack.votredomaine.com`)
- ✅ Accès SSH au serveur

## 🏗️ Architecture Production

### Communication entre services

En production, les services communiquent via **les noms de conteneurs** dans le réseau Docker `jobbingtrack-prod-network` :

```
Frontend (port 3000)
   ↓
API Gateway (jobbingtrack-api-gateway-prod:3000)
   ↓
Auth Service (jobbingtrack-auth-service-prod:3001)
Application Service (jobbingtrack-application-service-prod:3002)
Company Service (jobbingtrack-company-service-prod:3003)
... etc
   ↓
PostgreSQL (jobbingtrack-postgres-prod:5432)
Redis (jobbingtrack-redis-prod:6379)
```

### Différences Dev vs Production

| Aspect | Développement (Local) | Production (Portainer) |
|--------|----------------------|------------------------|
| **Noms conteneurs** | `jobbingtrack-*` | `jobbingtrack-*-prod` |
| **Communication services** | `localhost:PORT` | `nom-conteneur:PORT` |
| **Réseau** | `backend_jobbingtrack-network` | `jobbingtrack-prod-network` |
| **Frontend port** | 8080 → 3000 | 3000 (interne) |
| **API Gateway port** | 3000 → 3000 | 3000 (interne) |
| **Accès externe** | Direct (localhost) | Via Nginx Proxy Manager |
| **SSL/TLS** | Non | Oui (Let's Encrypt) |

## 📦 Étape 1 : Préparer les fichiers

### 1.1 Créer le fichier .env de production

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack/production
cp env.production.example .env
nano .env
```

Configurez les variables suivantes :

```bash
# Domaine
DOMAIN=jobbingtrack.votredomaine.com
FRONTEND_URL=https://jobbingtrack.votredomaine.com
API_URL=https://api.jobbingtrack.votredomaine.com

# Base de données
POSTGRES_PASSWORD=VotreMotDePasseSuperSecurise123!

# JWT Secrets (générez avec: openssl rand -base64 64)
JWT_SECRET=VotreSecretJWTTresLongEtSecurise...
JWT_REFRESH_SECRET=VotreSecretRefreshDifferentEtSecurise...

# Email SMTP
SMTP_HOST=smtp.ovh.net
SMTP_PORT=587
SMTP_USER=redacted@example.invalid
SMTP_PASS=VotreMotDePasseEmail
SMTP_FROM=JobbingTrack <redacted@example.invalid>

# CORS
ALLOWED_ORIGINS=https://jobbingtrack.votredomaine.com
```

### 1.2 Transférer les fichiers sur le serveur

```bash
# Créer le dossier sur le serveur
ssh redacted@example.invalid "mkdir -p /opt/jobbingtrack"

# Transférer les fichiers
scp -r /home/pactivisme/Documents/Dev/Perso/JobbingTrack/* redacted@example.invalid:/opt/jobbingtrack/
```

## 🔧 Étape 2 : Configuration Portainer

### 2.1 Créer une nouvelle Stack dans Portainer

1. **Connectez-vous à Portainer** : `https://portainer.votreserveur.com`
2. **Allez dans "Stacks"**
3. **Cliquez sur "Add stack"**
4. **Nom de la stack** : `jobbingtrack-production`

### 2.2 Configurer la Stack

**Méthode 1 : Upload depuis le serveur**

```bash
# Dans Portainer, sélectionnez "Repository"
Repository URL: /opt/jobbingtrack
Compose path: production/docker-compose.production.yml
```

**Méthode 2 : Web editor**

Copiez le contenu de `production/docker-compose.production.yml` dans l'éditeur web de Portainer.

### 2.3 Ajouter les variables d'environnement

Dans Portainer, section "Environment variables", ajoutez :

```
POSTGRES_PASSWORD=VotreMotDePasseSuperSecurise123!
JWT_SECRET=VotreSecretJWT...
JWT_REFRESH_SECRET=VotreSecretRefresh...
DOMAIN=jobbingtrack.votredomaine.com
FRONTEND_URL=https://jobbingtrack.votredomaine.com
SMTP_HOST=smtp.votreserveur.com
SMTP_PORT=587
SMTP_USER=redacted@example.invalid
SMTP_PASS=VotreMotDePasseEmail
SMTP_FROM=JobbingTrack <redacted@example.invalid>
```

### 2.4 Déployer la Stack

Cliquez sur **"Deploy the stack"**

Portainer va :
- ✅ Créer le réseau `jobbingtrack-prod-network`
- ✅ Construire toutes les images Docker
- ✅ Démarrer PostgreSQL et Redis en premier
- ✅ Démarrer les microservices backend
- ✅ Démarrer le frontend

## 🌐 Étape 3 : Configuration Nginx Proxy Manager

### 3.1 Configurer le domaine principal (Frontend)

1. **Allez dans "Proxy Hosts"**
2. **Cliquez sur "Add Proxy Host"**
3. **Configurez** :

```
Domain Names: jobbingtrack.votredomaine.com
Scheme: http
Forward Hostname / IP: jobbingtrack-frontend-prod
Forward Port: 3000
Cache Assets: ✅
Block Common Exploits: ✅
Websockets Support: ✅
```

4. **Onglet SSL** :
```
SSL Certificate: Request a new SSL Certificate (Let's Encrypt)
Force SSL: ✅
HTTP/2 Support: ✅
HSTS Enabled: ✅
Email: redacted@example.invalid
```

### 3.2 Configurer l'API Gateway (optionnel)

Si vous voulez exposer l'API publiquement :

```
Domain Names: api.jobbingtrack.votredomaine.com
Forward Hostname / IP: jobbingtrack-api-gateway-prod
Forward Port: 3000
SSL: ✅ Let's Encrypt
```

### 3.3 Configuration avancée (optionnel)

Dans "Custom Locations", ajoutez :

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req zone=api_limit burst=20 nodelay;

# Headers de sécurité
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

## 🔍 Étape 4 : Vérification et Tests

### 4.1 Vérifier que les conteneurs sont démarrés

Dans Portainer :
1. **Allez dans "Containers"**
2. **Vérifiez que tous les conteneurs sont "running"** :
   - ✅ jobbingtrack-postgres-prod
   - ✅ jobbingtrack-redis-prod
   - ✅ jobbingtrack-api-gateway-prod
   - ✅ jobbingtrack-auth-service-prod
   - ✅ jobbingtrack-application-service-prod
   - ✅ jobbingtrack-company-service-prod
   - ✅ jobbingtrack-contact-service-prod
   - ✅ jobbingtrack-interview-service-prod
   - ✅ jobbingtrack-notification-service-prod
   - ✅ jobbingtrack-dashboard-service-prod
   - ✅ jobbingtrack-frontend-prod

### 4.2 Tester les endpoints

```bash
# Test frontend
curl https://jobbingtrack.votredomaine.com

# Test API Gateway
curl https://api.jobbingtrack.votredomaine.com/health

# Test connexion
curl -X POST https://api.jobbingtrack.votredomaine.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@jobbingtrack.test","password":"password123"}'
```

### 4.3 Consulter les logs

Dans Portainer :
1. **Sélectionnez un conteneur**
2. **Cliquez sur "Logs"**
3. **Vérifiez qu'il n'y a pas d'erreurs**

## 📊 Étape 5 : Monitoring et Maintenance

### 5.1 Vérifier les services régulièrement

```bash
# Dans Portainer, créez un webhook pour surveiller les services
# Ou utilisez la page de monitoring : https://jobbingtrack.votredomaine.com/backoffice/services
```

### 5.2 Sauvegardes automatiques

```bash
# Créer un cron job pour sauvegarder PostgreSQL
0 2 * * * docker exec jobbingtrack-postgres-prod pg_dump -U jobbingtrack jobbingtrack > /opt/backups/jobbingtrack-$(date +\%Y\%m\%d).sql
```

### 5.3 Mises à jour

```bash
# Pour mettre à jour l'application :
cd /opt/jobbingtrack
git pull origin main

# Puis dans Portainer :
# 1. Allez dans la stack "jobbingtrack-production"
# 2. Cliquez sur "Update the stack"
# 3. Activez "Re-pull images and redeploy"
# 4. Cliquez sur "Update"
```

## 🔒 Sécurité Production

### Checklist de sécurité

- ✅ **Mots de passe forts** pour PostgreSQL
- ✅ **Secrets JWT uniques** et complexes
- ✅ **SSL/TLS activé** via Let's Encrypt
- ✅ **CORS configuré** avec domaines spécifiques
- ✅ **Rate limiting** activé dans Nginx
- ✅ **Firewall** configuré (seulement ports 80, 443, 22)
- ✅ **Sauvegardes régulières** de la base de données
- ✅ **Logs centralisés** et surveillés

## 📝 Résumé des URLs

| Service | URL Locale (Dev) | URL Production |
|---------|------------------|----------------|
| **Frontend** | http://localhost:8080 | https://jobbingtrack.votredomaine.com |
| **API Gateway** | http://localhost:3000 | https://api.jobbingtrack.votredomaine.com |
| **Backoffice** | http://localhost:8080/backoffice | https://jobbingtrack.votredomaine.com/backoffice |

## 🆘 Dépannage

### Les conteneurs ne démarrent pas

```bash
# Vérifier les logs dans Portainer
# Ou en SSH :
docker logs jobbingtrack-api-gateway-prod
docker logs jobbingtrack-postgres-prod
```

### Problèmes de réseau entre conteneurs

```bash
# Vérifier que tous les conteneurs sont sur le même réseau
docker network inspect jobbingtrack-prod-network
```

### Erreur 502 Bad Gateway

- Vérifiez que le conteneur frontend est bien démarré
- Vérifiez les logs du frontend
- Vérifiez la configuration Nginx Proxy Manager

### Base de données non accessible

```bash
# Vérifier que PostgreSQL est healthy
docker ps | grep postgres

# Se connecter à PostgreSQL
docker exec -it jobbingtrack-postgres-prod psql -U jobbingtrack -d jobbingtrack
```

## 📞 Support

Pour toute question ou problème :
- 📧 Email : candidatures@example.invalid
- 📚 Documentation : `/docs/`
- 🐛 Issues : GitHub Issues

---

**🎯 Votre JobbingTrack est maintenant prêt pour la production !**

