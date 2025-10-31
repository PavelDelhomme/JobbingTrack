# 📊 Améliorations Métriques & Reset de Mot de Passe

## ✅ Modifications Effectuées

### 1. Système de Persistance des Métriques (Backend)

#### 📁 Nouveaux Fichiers Créés

- `backend/metrics-aggregator-service/src/services/persistence.service.js`
  - Service complet de persistance des métriques
  - Enregistrement système, conteneurs, logs, réseau, sécurité
  - Historique avec nettoyage automatique (30 jours)

- `backend/metrics-aggregator-service/src/services/docker-logs.service.js`
  - Service de collecte des logs Docker
  - Récupération des logs en temps réel
  - Parsing et analyse des logs conteneurs

- `backend/metrics-aggregator-service/src/routes/persistence.routes.js`
  - Routes API pour accéder à l'historique des métriques
  - Endpoints pour logs, disponibilité, sécurité
  - Filtrage et pagination

#### 📝 Schéma Prisma Enrichi

Nouvelles tables ajoutées :
- `ContainerLog` - Logs des conteneurs Docker
- `ServiceNetworkHistory` - Historique réseau par service
- `ServiceAvailabilityHistory` - Disponibilité des services
- `SecurityMetric` - Métriques de sécurité

#### 🔄 Collecte Automatique

Le serveur metrics-aggregator collecte maintenant :
- Métriques système : toutes les 10 secondes
- Logs Docker : toutes les 2 minutes
- Nettoyage automatique : tous les jours à 3h

### 2. Améliorations Frontend

#### 🎯 Popup Services Disponibles

**Fichier modifié** : `frontend/src/app/(admin)/backoffice/page.tsx`

Améliorations :
- ✅ Actualisation automatique toutes les 5 secondes
- ✅ Affichage en temps réel des métriques CPU/Mémoire
- ✅ État de santé cohérent (Disponible/Indisponible/Test)
- ✅ Temps de réponse affiché
- ✅ Nombre de processus actifs
- ✅ Trafic réseau
- ✅ Design amélioré avec indicateurs visuels

#### 📈 Page Analytics & Performance

**Fichier créé** : `frontend/src/lib/api/analytics.service.ts`

Nouveau service d'analytics :
- Historique des métriques système
- Métriques par conteneur
- Logs avec filtrage et recherche
- Statistiques de disponibilité
- Métriques de sécurité détaillées
- Calculs de temps de réponse moyen
- Taux d'erreurs réseau

### 3. Reset de Mot de Passe par Email

#### 🔐 Backend (Déjà fonctionnel)

Le service auth-service dispose déjà de :
- ✅ Route `/api/v1/auth/forgot-password`
- ✅ Route `/api/v1/auth/reset-password/:token`
- ✅ Génération de tokens sécurisés
- ✅ Expiration des tokens (1 heure)
- ✅ Envoi d'emails HTML via nodemailer

#### 📧 Configuration SMTP

**Fichier créé** : `backend/auth-service/SMTP_CONFIGURATION.md`

Documentation complète pour configurer :
- Gmail (avec App Password)
- MailHog (tests locaux)
- Sendinblue/Brevo (production)
- SendGrid
- Mailgun

#### 🎨 Page Frontend

**Fichier créé** : `frontend/src/app/(public)/reset-password/[token]/page.tsx`

Fonctionnalités :
- ✅ Vérification automatique du token
- ✅ Validation en temps réel du mot de passe
- ✅ Exigences de sécurité affichées
- ✅ Affichage/masquage du mot de passe
- ✅ Confirmation du mot de passe
- ✅ Gestion des erreurs complète
- ✅ Design moderne et responsive

### 4. Migrations Base de Données

**Fichier créé** : `backend/metrics-aggregator-service/prisma/migrations/add_logs_and_security_metrics/migration.sql`

Crée les nouvelles tables avec index optimisés.

---

## 🚀 Instructions de Déploiement

### 1. Migrations Prisma

```bash
cd backend/metrics-aggregator-service
npx prisma migrate deploy
# ou
npx prisma db push
npx prisma generate
```

### 2. Configuration SMTP

1. Choisir un fournisseur SMTP (voir `SMTP_CONFIGURATION.md`)
2. Configurer les variables d'environnement dans `backend/auth-service/.env` :

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="votre-email@gmail.com"
SMTP_PASS="votre-app-password"
SMTP_FROM="JobbingTrack <noreply@jobbingtrack.com>"
FRONTEND_URL="http://localhost:8080"
```

### 3. Redémarrer les Services

```bash
# Redémarrer le service metrics-aggregator
docker-compose restart metrics-aggregator-service

# Redémarrer le service auth
docker-compose restart auth-service

# Redémarrer le frontend
docker-compose restart frontend
```

---

## 🧪 Tests à Effectuer

### Test 1 : Persistance des Métriques

```bash
# Vérifier que les métriques sont collectées
curl http://localhost:3014/api/v1/persistence/stats

# Vérifier l'historique système
curl http://localhost:3014/api/v1/persistence/system/metrics?limit=10

# Vérifier les logs d'un conteneur
curl "http://localhost:3014/api/v1/persistence/containers/jobbingtrack-auth-service/logs?limit=20"
```

### Test 2 : Popup Services Disponibles

1. Aller sur `/backoffice`
2. Cliquer sur le nombre de "Services actifs"
3. Vérifier que :
   - Les métriques CPU/Mémoire s'affichent
   - L'état est cohérent (vert = disponible)
   - Le temps de réponse s'affiche
   - Les données se rafraîchissent toutes les 5 secondes

### Test 3 : Reset de Mot de Passe

#### A. Demander un reset

```bash
curl -X POST http://localhost:3001/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"votre-email@test.com"}'
```

#### B. Vérifier l'email

- **Avec MailHog** : http://localhost:8025
- **Avec Gmail** : Vérifier votre boîte mail

#### C. Tester la page de reset

1. Copier le lien du mail
2. Coller dans le navigateur
3. Saisir un nouveau mot de passe
4. Vérifier la validation en temps réel
5. Confirmer et vérifier la redirection vers `/login`

#### D. Se connecter

1. Utiliser le nouveau mot de passe
2. Vérifier que la connexion fonctionne

### Test 4 : Analytics & Performance

1. Aller sur `/backoffice/analytics` ou `/analytics`
2. Vérifier les onglets disponibles
3. Vérifier que les métriques s'actualisent
4. (À implémenter) Tester l'onglet "Logs & Conteneurs"

---

## 📊 Nouvelles Routes API

### Métriques Persistées

```
GET  /api/v1/persistence/system/metrics
GET  /api/v1/persistence/containers/:name/metrics
GET  /api/v1/persistence/containers/:name/logs
GET  /api/v1/persistence/containers/:name/logs/live
GET  /api/v1/persistence/containers/:name/inspect
GET  /api/v1/persistence/containers/:name/stats
GET  /api/v1/persistence/services/:name/availability
GET  /api/v1/persistence/security/metrics
GET  /api/v1/persistence/security/summary
GET  /api/v1/persistence/stats
POST /api/v1/persistence/cleanup
```

### Authentification

```
POST /api/v1/auth/forgot-password
GET  /api/v1/auth/reset-password/:token
POST /api/v1/auth/reset-password/:token
```

---

## 🔧 Configuration MailHog (Recommandé pour tests)

Ajouter dans `docker-compose.yml` :

```yaml
services:
  mailhog:
    image: mailhog/mailhog
    container_name: jobbingtrack-mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
    networks:
      - jobbingtrack-network
```

Puis dans `backend/auth-service/.env` :

```env
SMTP_HOST="mailhog"
SMTP_PORT="1025"
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="JobbingTrack <noreply@jobbingtrack.local>"
```

---

## 📋 TODO Restants

### 5. Onglet Logs & Conteneurs dans Analytics

**À implémenter** :
- Créer un nouvel onglet dans la page Analytics
- Afficher les logs de tous les conteneurs
- Filtres : niveau, date, recherche
- Graphiques d'historique des métriques
- Export des logs

**Fichiers à modifier** :
- `frontend/src/app/(admin)/backoffice/analytics/page.tsx`
- Utiliser `analyticsService.getContainerLogs()`

### 6. Enrichir l'onglet Sécurité

**À implémenter** :
- Afficher les métriques de sécurité depuis la persistance
- Tentatives de connexion échouées
- IPs bloquées
- Activités suspectes
- Score de sécurité en temps réel
- Graphiques d'évolution

**Fichiers à modifier** :
- `frontend/src/app/(admin)/analytics/page.tsx` (onglet Sécurité)
- Utiliser `analyticsService.getSecuritySummary()`
- Créer des composants de visualisation

### 9. Tests Complets

**À effectuer** :
- [ ] Test end-to-end du reset de mot de passe
- [ ] Test de collecte des métriques sur 24h
- [ ] Test de performance de la persistance
- [ ] Test de nettoyage automatique
- [ ] Test des filtres de logs
- [ ] Test des graphiques Analytics

---

## 🎯 Résumé des Améliorations

| Fonctionnalité | État | Description |
|----------------|------|-------------|
| ✅ Persistance métriques | **Terminé** | Historique complet en base de données |
| ✅ Logs Docker | **Terminé** | Collecte et stockage des logs conteneurs |
| ✅ API Persistance | **Terminé** | Routes complètes avec filtrage |
| ✅ Popup Services | **Terminé** | Actualisation auto, métriques détaillées |
| ✅ Reset Mot de Passe | **Terminé** | Email + page frontend complète |
| ✅ Config SMTP | **Terminé** | Documentation complète |
| ⏳ Onglet Logs | **En attente** | Interface de visualisation |
| ⏳ Métriques Sécurité | **En attente** | Dashboard sécurité enrichi |
| ⏳ Tests E2E | **En attente** | Tests complets |

---

## 📞 Support

Pour toute question ou problème :
1. Vérifier les logs : `docker logs jobbingtrack-metrics-aggregator-service`
2. Vérifier les logs auth : `docker logs jobbingtrack-auth-service`
3. Vérifier la connectivité réseau entre conteneurs
4. Consulter la documentation SMTP : `backend/auth-service/SMTP_CONFIGURATION.md`

---

**Dernière mise à jour** : $(date)

