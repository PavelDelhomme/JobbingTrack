## 🧭 Navigation Centrale

### 📖 **Documentation du Projet**
- **[Accueil](https://github.com/OWNER/JobbingTrack/blob/main/README.md)** | **[Documentation Centralisée](../README.md)**

### 🚀 **Démarrage Rapide**
- **[Guide Installation](https://github.com/OWNER/JobbingTrack/blob/main/GUIDE-DEMARRAGE-RAPIDE.md)** | **[Guide Développement](https://github.com/OWNER/JobbingTrack/blob/main/docs/guides/getting-started.md)**

### 📡 **API & Intégration**
- **[Documentation API](https://github.com/OWNER/JobbingTrack/blob/main/docs/api/v1/endpoints.md)** | **[API Technique](https://github.com/OWNER/JobbingTrack/blob/main/docs/technical/api.md)**

### 🚀 **Déploiement**
- **[Guide Déploiement](https://github.com/OWNER/JobbingTrack/blob/main/docs/deployment/GUIDE-PORTAINER.md)** | **[Déploiement Technique](https://github.com/OWNER/JobbingTrack/blob/main/docs/technical/deployment.md)**

### 🛠️ **Outils Développement**
- **[Scripts et Makefiles](https://github.com/OWNER/JobbingTrack/blob/main/docs/scripts/makefiles.md)** | **[Documentation Technique](../technical/README.md)**

### 🔧 **Documentation Technique**
- **[Architecture](https://github.com/OWNER/JobbingTrack/blob/main/docs/technical/architecture.md)** | **[Base de Données](https://github.com/OWNER/JobbingTrack/blob/main/docs/technical/database.md)** | **[Sécurité](https://github.com/OWNER/JobbingTrack/blob/main/docs/technical/security.md)** | **[Performance](https://github.com/OWNER/JobbingTrack/blob/main/docs/technical/performance.md)**

---

# 🚀 Guide de Déploiement sur Portainer - JobbingTrack

## 📋 Vue d'ensemble

Ce guide vous explique comment déployer JobbingTrack en production sur **Portainer** avec **Nginx Proxy Manager** pour le reverse proxy et SSL.

## 🏗️ Architecture de Déploiement

```
Internet (HTTPS)
    ↓
Nginx Proxy Manager (Let's Encrypt SSL)
    ↓
┌─────────────────────────────────────────────────────┐
│ Réseau Docker: jobbingtrack-prod-network            │
│                                                      │
│  Frontend (jobbingtrack-frontend-prod:3000)         │
│      ↓                                              │
│  API Gateway (jobbingtrack-api-gateway-prod:3000)   │
│      ↓                                              │
│  ┌─────────────────────────────────────────┐       │
│  │ Microservices Backend                    │       │
│  │ - auth-service-prod:3001                 │       │
│  │ - application-service-prod:3002          │       │
│  │ - company-service-prod:3003              │       │
│  │ - contact-service-prod:3004              │       │
│  │ - interview-service-prod:3005            │       │
│  │ - notification-service-prod:3006         │       │
│  │ - dashboard-service-prod:3007            │       │
│  │ - call-service-prod:3008                 │       │
│  │ - profile-service-prod:3009              │       │
│  │ - event-service-prod:3011                │       │
│  │ - followup-service-prod:3012             │       │
│  │ - workflow-service-prod:3013             │       │
│  └─────────────────────────────────────────┘       │
│      ↓                                              │
│  PostgreSQL (jobbingtrack-postgres-prod:5432)       │
│  Redis (jobbingtrack-redis-prod:6379)               │
└─────────────────────────────────────────────────────┘
```

## 🎯 Étape 1 : Préparation

### 1.1 Préparer les fichiers sur votre machine locale

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack

# Créer le fichier .env de production
cd production
cp env.production.example .env
nano .env
```

### 1.2 Configurer les variables d'environnement

```bash
# DOMAINE
DOMAIN=jobbingtrack.votredomaine.com
FRONTEND_URL=https://jobbingtrack.votredomaine.com

# BASE DE DONNÉES
POSTGRES_PASSWORD=$(openssl rand -base64 32)

# JWT SECRETS (générez-les avec openssl)
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)

# EMAIL SMTP
SMTP_HOST=smtp.votreserveur.com
SMTP_PORT=587
SMTP_USER=redacted@example.invalid
SMTP_PASS=VotreMotDePasseEmail
SMTP_FROM=JobbingTrack <redacted@example.invalid>
```

## 📤 Étape 2 : Transférer sur le Serveur

### 2.1 Créer le dossier sur le serveur

```bash
ssh redacted@example.invalid
mkdir -p /opt/jobbingtrack
cd /opt/jobbingtrack
```

### 2.2 Transférer les fichiers

**Option A : Via Git (recommandé)**

```bash
# Sur le serveur
cd /opt/jobbingtrack
git clone https://github.com/VotreUsername/JobbingTrack.git .
cd production
cp env.production.example .env
nano .env  # Configurez vos variables
```

**Option B : Via SCP**

```bash
# Depuis votre machine locale
scp -r /home/pactivisme/Documents/Dev/Perso/JobbingTrack/* redacted@example.invalid:/opt/jobbingtrack/
```

## 🐳 Étape 3 : Déploiement avec Portainer

### 3.1 Accéder à Portainer

Ouvrez votre navigateur : `https://portainer.votreserveur.com`

### 3.2 Créer la Stack

1. **Allez dans "Stacks"**
2. **Cliquez sur "+ Add stack"**
3. **Nom** : `jobbingtrack-production`

### 3.3 Méthode de déploiement

**Méthode 1 : Upload (Recommandé pour Portainer)**

1. **Sélectionnez "Upload"**
2. **Choisissez le fichier** : `production/docker-compose.production.yml`
3. **Passez à l'étape suivante**

**Méthode 2 : Repository**

```
Repository URL: /opt/jobbingtrack
Compose file path: production/docker-compose.production.yml
```

**Méthode 3 : Web editor**

Copiez-collez le contenu de `docker-compose.production.yml`

### 3.4 Ajouter les Variables d'Environnement

Dans Portainer, section **"Environment variables"** :

```env
POSTGRES_PASSWORD=VotreMotDePasseSecurise123!
JWT_SECRET=VotreSecretJWTTresLong...
JWT_REFRESH_SECRET=VotreSecretRefreshDifferent...
DOMAIN=jobbingtrack.votredomaine.com
FRONTEND_URL=https://jobbingtrack.votredomaine.com
SMTP_HOST=smtp.ovh.net
SMTP_PORT=587
SMTP_USER=redacted@example.invalid
SMTP_PASS=VotreMotDePasseEmail
SMTP_FROM=JobbingTrack <redacted@example.invalid>
ALLOWED_ORIGINS=https://jobbingtrack.votredomaine.com
```

### 3.5 Déployer

1. **Cliquez sur "Deploy the stack"**
2. **Attendez la fin du build** (5-10 minutes)
3. **Vérifiez que tous les conteneurs sont "running"**

## 🌐 Étape 4 : Configuration Nginx Proxy Manager

### 4.1 Accéder à Nginx Proxy Manager

Ouvrez : `https://nginx.votreserveur.com` (ou votre URL NPM)

### 4.2 Ajouter le Proxy Host pour le Frontend

1. **Allez dans "Hosts" → "Proxy Hosts"**
2. **Cliquez sur "Add Proxy Host"**

**Details :**
```
Domain Names: jobbingtrack.votredomaine.com
Scheme: http
Forward Hostname / IP: jobbingtrack-frontend-prod
Forward Port: 3000

✅ Cache Assets
✅ Block Common Exploits
✅ Websockets Support
```

**SSL :**
```
SSL Certificate: Request a new SSL Certificate
✅ Force SSL
✅ HTTP/2 Support
✅ HSTS Enabled
Email: redacted@example.invalid
✅ I Agree to the Let's Encrypt Terms of Service
```

**Advanced (optionnel) :**
```nginx
# Rate limiting et sécurité
limit_req_zone $binary_remote_addr zone=frontend_limit:10m rate=30r/s;
limit_req zone=frontend_limit burst=50 nodelay;

# Headers de sécurité
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### 4.3 Ajouter le Proxy Host pour l'API (Optionnel)

Si vous voulez exposer l'API publiquement :

```
Domain Names: api.jobbingtrack.votredomaine.com
Forward Hostname / IP: jobbingtrack-api-gateway-prod
Forward Port: 3000
SSL: ✅ Let's Encrypt
```

**Advanced :**
```nginx
# Rate limiting strict pour l'API
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req zone=api_limit burst=20 nodelay;
```

## ✅ Étape 5 : Vérification

### 5.1 Vérifier les conteneurs dans Portainer

**Allez dans "Containers"** et vérifiez que tous sont **"running"** :

- ✅ jobbingtrack-postgres-prod (healthy)
- ✅ jobbingtrack-redis-prod (healthy)
- ✅ jobbingtrack-api-gateway-prod
- ✅ jobbingtrack-auth-service-prod
- ✅ jobbingtrack-application-service-prod
- ✅ jobbingtrack-company-service-prod
- ✅ jobbingtrack-contact-service-prod
- ✅ jobbingtrack-interview-service-prod
- ✅ jobbingtrack-notification-service-prod
- ✅ jobbingtrack-dashboard-service-prod
- ✅ jobbingtrack-call-service-prod
- ✅ jobbingtrack-profile-service-prod
- ✅ jobbingtrack-event-service-prod
- ✅ jobbingtrack-followup-service-prod
- ✅ jobbingtrack-workflow-service-prod
- ✅ jobbingtrack-frontend-prod

### 5.2 Tester les endpoints

```bash
# Test du frontend
curl https://jobbingtrack.votredomaine.com

# Test de l'API Gateway
curl https://api.jobbingtrack.votredomaine.com/health

# Test de connexion
curl -X POST https://api.jobbingtrack.votredomaine.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@jobbingtrack.test","password":"password123"}'
```

### 5.3 Consulter les logs

Dans Portainer :
1. **Sélectionnez un conteneur**
2. **Cliquez sur "Logs"**
3. **Filtrez par "Errors" pour voir les erreurs**

## 🔧 Étape 6 : Configuration Post-Déploiement

### 6.1 Créer l'utilisateur administrateur

```bash
# Se connecter au conteneur API Gateway
docker exec -it jobbingtrack-api-gateway-prod sh

# Ou exécuter directement
docker exec jobbingtrack-postgres-prod psql -U jobbingtrack -d jobbingtrack -c "
INSERT INTO \"User\" (id, email, password, \"firstName\", \"lastName\", role, \"isActive\", \"createdAt\", \"updatedAt\")
VALUES (
  'admin-1',
  'admin@jobbingtrack.test',
  '\$2b\$10\$XOPbrlUPQdwdJUpSrIF6Xuhxi2fwdY9NMGGm1qF7VTlXVdZvTBQvO',
  'Admin',
  'JobbingTrack',
  'SUPER_ADMIN',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;
"
```

### 6.2 Appliquer les migrations Prisma

```bash
# Se connecter au conteneur auth-service
docker exec -it jobbingtrack-auth-service-prod sh

# Appliquer les migrations
npx prisma migrate deploy
```

### 6.3 Configurer les sauvegardes automatiques

```bash
# Créer un script de sauvegarde
cat > /opt/scripts/backup-jobbingtrack.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/jobbingtrack"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Sauvegarder PostgreSQL
docker exec jobbingtrack-postgres-prod pg_dump -U jobbingtrack jobbingtrack | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Nettoyer les anciennes sauvegardes (garder 30 jours)
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

echo "✅ Sauvegarde terminée: $BACKUP_DIR/db_$DATE.sql.gz"
EOF

chmod +x /opt/scripts/backup-jobbingtrack.sh

# Ajouter au crontab (tous les jours à 2h du matin)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/scripts/backup-jobbingtrack.sh") | crontab -
```

## 📊 Étape 7 : Monitoring

### 7.1 Vérifier la santé des services

Depuis votre navigateur :
```
https://jobbingtrack.votredomaine.com/backoffice/services
```

### 7.2 Consulter les logs en temps réel

Dans Portainer :
1. **Container → Sélectionner un service**
2. **Logs → Activez "Auto-refresh logs"**

### 7.3 Alertes (optionnel)

Configurez des webhooks dans Portainer pour être alerté en cas de problème :
```
Settings → Notifications → Add notification endpoint
Type: Webhook
URL: https://votre-webhook.com/alert
```

## 🔐 Sécurité Production

### Checklist de sécurité

- ✅ **Mots de passe PostgreSQL** : Fort et unique
- ✅ **JWT Secrets** : Générés avec `openssl rand -base64 64`
- ✅ **SSL/TLS** : Certificat Let's Encrypt activé
- ✅ **CORS** : Configuré uniquement pour votre domaine
- ✅ **Firewall** : Ouvrir seulement ports 80, 443, 22
- ✅ **Rate Limiting** : Configuré dans Nginx
- ✅ **Sauvegardes** : Automatiques et testées
- ✅ **Updates régulières** : Images Docker et dépendances
- ✅ **Logs** : Surveillés et analysés

### Ports à fermer dans le firewall

```bash
# Bloquer l'accès direct aux services backend
ufw deny 3001  # Auth Service
ufw deny 3002  # Application Service
ufw deny 3003  # Company Service
ufw deny 3004  # Contact Service
ufw deny 3005  # Interview Service
ufw deny 3006  # Notification Service
ufw deny 3007  # Dashboard Service
ufw deny 5432  # PostgreSQL
ufw deny 6379  # Redis

# Autoriser seulement HTTP/HTTPS et SSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable
```

## 🔄 Mises à jour

### Mise à jour de l'application

```bash
# 1. Sur votre serveur
cd /opt/jobbingtrack
git pull origin main

# 2. Dans Portainer
# - Allez dans la stack "jobbingtrack-production"
# - Cliquez sur "Update the stack"
# - Activez "Re-pull images and redeploy"
# - Cliquez sur "Update"
```

### Mise à jour d'un seul service

```bash
# Reconstruire un service spécifique
docker compose -f production/docker-compose.production.yml build --no-cache auth-service
docker compose -f production/docker-compose.production.yml up -d auth-service
```

## 🆘 Dépannage

### Problème : Les conteneurs ne démarrent pas

```bash
# Vérifier les logs
docker logs jobbingtrack-api-gateway-prod
docker logs jobbingtrack-postgres-prod

# Vérifier les ressources
docker stats

# Vérifier le réseau
docker network inspect jobbingtrack-prod-network
```

### Problème : Erreur 502 Bad Gateway

**Causes possibles :**
1. Le frontend n'est pas démarré
2. Le nom du conteneur est incorrect dans Nginx Proxy Manager
3. Le réseau Docker n'est pas partagé

**Solutions :**
```bash
# Vérifier que le frontend est up
docker ps | grep frontend-prod

# Redémarrer le frontend
docker restart jobbingtrack-frontend-prod

# Vérifier les logs Nginx
docker logs nginx-proxy-manager
```

### Problème : Base de données non accessible

```bash
# Se connecter à PostgreSQL
docker exec -it jobbingtrack-postgres-prod psql -U jobbingtrack -d jobbingtrack

# Vérifier les connexions
SELECT * FROM pg_stat_activity;

# Vérifier l'espace disque
df -h
```

### Problème : Services ne peuvent pas communiquer entre eux

**Vérifier que tous les services sont sur le même réseau :**

```bash
docker network inspect jobbingtrack-prod-network
```

**Tester la communication entre conteneurs :**

```bash
# Depuis l'API Gateway, tester l'accès au service auth
docker exec jobbingtrack-api-gateway-prod curl http://jobbingtrack-auth-service-prod:3001/health
```

## 📈 Performance et Optimisation

### Augmenter les ressources

Dans `docker-compose.production.yml` :

```yaml
deploy:
  resources:
    limits:
      memory: 2G
      cpus: '2.0'
    reservations:
      memory: 1G
      cpus: '1.0'
```

### Activer le cache Redis

Vérifiez que Redis est bien utilisé pour les sessions :

```bash
docker exec jobbingtrack-redis-prod redis-cli MONITOR
```

## 🔄 Rollback en cas de problème

```bash
# 1. Dans Portainer, allez dans la stack
# 2. Cliquez sur "Editor"
# 3. Revenez à la version précédente du docker-compose
# 4. Cliquez sur "Update the stack"
```

Ou en ligne de commande :

```bash
cd /opt/jobbingtrack
git checkout HEAD~1  # Revenir au commit précédent
docker compose -f production/docker-compose.production.yml up -d --force-recreate
```

## 📊 URLs de Production

| Service | URL | Accès |
|---------|-----|-------|
| **Frontend** | https://jobbingtrack.votredomaine.com | Public |
| **Backoffice** | https://jobbingtrack.votredomaine.com/backoffice | Admin uniquement |
| **API Gateway** | https://api.jobbingtrack.votredomaine.com | Public (avec rate limiting) |
| **Portainer** | https://portainer.votreserveur.com | Admin uniquement |
| **Nginx Proxy Manager** | https://nginx.votreserveur.com | Admin uniquement |

## 🔑 Première Connexion

1. **Allez sur** : https://jobbingtrack.votredomaine.com
2. **Email** : `admin@jobbingtrack.test`
3. **Mot de passe** : `password123` (⚠️ À changer immédiatement!)

**⚠️ IMPORTANT :** Changez le mot de passe admin dès la première connexion !

## 📞 Support

- 📚 Documentation complète : `/docs/`
- 🐛 Rapporter un bug : GitHub Issues
- 💬 Questions : Discussions GitHub

---

**🎉 Votre JobbingTrack est maintenant déployé en production avec Portainer et Nginx Proxy Manager !**

