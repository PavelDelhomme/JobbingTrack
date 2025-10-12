# 🚀 Guide de Démarrage Rapide - JobbingTrack

## 📋 Prérequis

- Docker & Docker Compose
- Node.js 18+ (pour le développement local)
- PostgreSQL 14+ (ou via Docker)

---

## 🔧 Installation et Lancement

### 1. Migrations de Base de Données

Exécutez les migrations Prisma pour tous les services :

```bash
# Call Service
cd backend/call-service
npx prisma generate
npx prisma migrate dev

# Auth Service
cd ../auth-service
npx prisma generate
npx prisma migrate dev

# Notification Service
cd ../notification-service
npx prisma generate
npx prisma migrate dev

# Follow-up Service
cd ../followup-service
npx prisma generate
npx prisma migrate dev

# Event Service
cd ../event-service
npx prisma generate
npx prisma migrate dev

# Et tous les autres services...
```

### 2. Variables d'Environnement

Créez un fichier `.env` dans chaque service avec :

```env
# Backend services
DATABASE_URL="postgresql://user:password@localhost:5432/jobbingtrack"
JWT_SECRET="votre-secret-jwt-tres-securise-2025"
PORT=3001

# SMTP (pour les emails)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=votre-user
SMTP_PASS=votre-password
SMTP_FROM="JobbingTrack <noreply@jobbingtrack.com>"

# Frontend
FRONTEND_URL=http://localhost:3000
```

### 3. Lancer avec Docker Compose

```bash
# Lancer tous les services
docker-compose up -d

# Vérifier les logs
docker-compose logs -f

# Arrêter
docker-compose down
```

### 4. Lancer en Développement Local

#### Backend (chaque service)
```bash
cd backend/api-gateway
npm install
npm run dev

# Répéter pour chaque service
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🎯 Accès aux Services

### URLs par défaut

- **Frontend** : http://localhost:3000
- **API Gateway** : http://localhost:8080
- **Auth Service** : http://localhost:3001
- **Application Service** : http://localhost:3002
- **Company Service** : http://localhost:3003
- **Contact Service** : http://localhost:3004
- **Notification Service** : http://localhost:3006
- **Call Service** : http://localhost:3008
- **Event Service** : http://localhost:3011
- **Follow-up Service** : http://localhost:3012

### Health Checks

Vérifiez que tous les services fonctionnent :

```bash
# API Gateway
curl http://localhost:8080/health

# Call Service
curl http://localhost:3008/health

# Notification Service
curl http://localhost:3006/health
```

---

## 👤 Création du Premier Utilisateur Admin

### Méthode 1 : Via l'inscription publique

1. Ouvrez http://localhost:3000/register
2. Créez un compte
3. Modifiez le rôle en base de données :

```sql
UPDATE "User" 
SET role = 'SUPER_ADMIN' 
WHERE email = 'votre@email.com';
```

### Méthode 2 : Via Prisma Studio

```bash
cd backend/auth-service
npx prisma studio
# Créez un utilisateur avec role = SUPER_ADMIN
```

---

## 🧪 Test des Fonctionnalités

### 1. Tester l'Authentification

```bash
# Inscription
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'

# Connexion
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "password123"
  }'
```

### 2. Tester les Appels

```bash
# Créer un appel
curl -X POST http://localhost:8080/api/v1/calls \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "ID_CANDIDATURE",
    "type": "OUTGOING",
    "scheduledDate": "2025-10-15T10:00:00Z",
    "notes": "Premier appel de suivi"
  }'

# Lister les appels
curl http://localhost:8080/api/v1/calls \
  -H "Authorization: Bearer VOTRE_TOKEN"

# Statistiques
curl http://localhost:8080/api/v1/calls/stats/overview \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

### 3. Tester les Notifications

```bash
# Créer une notification
curl -X POST http://localhost:8080/api/v1/notifications \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INFO",
    "title": "Test Notification",
    "message": "Ceci est un test"
  }'

# Statistiques
curl http://localhost:8080/api/v1/notifications/stats \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

### 4. Tester les Relances

```bash
# Créer une relance
curl -X POST http://localhost:8080/api/v1/followups \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "ID_CANDIDATURE",
    "type": "EMAIL",
    "scheduledDate": "2025-10-20T14:00:00Z",
    "subject": "Relance candidature",
    "message": "Bonjour..."
  }'

# Suggestions intelligentes
curl http://localhost:8080/api/v1/followups/suggestions \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

### 5. Tester la Timeline

```bash
# Timeline d'une candidature
curl http://localhost:8080/api/v1/events/timeline/application/ID_CANDIDATURE \
  -H "Authorization: Bearer VOTRE_TOKEN"

# Export CSV
curl "http://localhost:8080/api/v1/events/export?entityType=application&entityId=ID_CANDIDATURE&format=csv" \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

### 6. Tester les Fonctions Admin

```bash
# Détecter les doublons
curl http://localhost:8080/api/v1/admin/duplicates/companies \
  -H "Authorization: Bearer VOTRE_TOKEN_ADMIN"

# Statistiques globales
curl http://localhost:8080/api/v1/admin/stats/global \
  -H "Authorization: Bearer VOTRE_TOKEN_ADMIN"

# Performance monitoring
curl http://localhost:8080/api/v1/admin/monitoring/performance \
  -H "Authorization: Bearer VOTRE_TOKEN_ADMIN"
```

---

## 🎨 Interface Backoffice

### Accès

1. Connectez-vous sur http://localhost:3000/login
2. Accédez au backoffice : http://localhost:3000/backoffice

### Pages Disponibles

- **📊 Dashboard** : `/backoffice`
- **📝 Candidatures** : `/backoffice/applications`
- **🏢 Entreprises** : `/backoffice/companies`
- **👤 Contacts** : `/backoffice/contacts`
- **📅 Entretiens** : `/backoffice/interviews`
- **📞 Appels** : `/backoffice/calls` ← NOUVEAU
- **📧 Relances** : `/backoffice/followups`
- **🗓️ Événements** : `/backoffice/events`
- **🔔 Notifications** : `/backoffice/notifications` ← NOUVEAU
- **👥 Utilisateurs** : `/backoffice/users` ← NOUVEAU
- **🛠️ Services** : `/backoffice/services`
- **🧪 Testeur API** : `/backoffice/api-tester`

---

## 🔍 Dépannage

### Problème : Service ne démarre pas

```bash
# Vérifier les logs
docker-compose logs SERVICE_NAME

# Redémarrer un service spécifique
docker-compose restart SERVICE_NAME
```

### Problème : Erreur de connexion à la base de données

```bash
# Vérifier que PostgreSQL fonctionne
docker-compose ps

# Recréer la base de données
docker-compose down -v
docker-compose up -d
```

### Problème : Token JWT invalide

- Vérifiez que `JWT_SECRET` est identique dans tous les services
- Reconnectez-vous pour obtenir un nouveau token

### Problème : CORS errors

- Vérifiez les `ALLOWED_ORIGINS` dans les variables d'environnement
- Assurez-vous que le frontend est sur le bon port

---

## 📚 Ressources

- **Documentation complète** : `FONCTIONNALITES-IMPLEMENTEES.md`
- **Architecture** : `backend/architecture.md`
- **Logs des services** : `docker-compose logs -f`

---

## 🎉 Félicitations !

Votre backoffice JobbingTrack est maintenant opérationnel avec toutes les fonctionnalités :
- ✅ Gestion des appels
- ✅ Réinitialisation de mot de passe
- ✅ Administration des utilisateurs
- ✅ Notifications et emails
- ✅ Relances automatiques
- ✅ Timeline unifiée
- ✅ Outils admin avancés

**Bon développement ! 🚀**

