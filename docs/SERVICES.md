# 📋 Services - JobbingTrack

Cette documentation détaille tous les services constituant l'architecture microservices de JobbingTrack.

## 🎯 Vue d'ensemble

JobbingTrack utilise une architecture microservices organisée autour de services essentiels et optionnels, gérés via des profils Docker Compose.

## 🔴 Services essentiels (toujours démarrés)

### 🗄️ PostgreSQL
- **Port**: 5432
- **Rôle**: Base de données principale
- **Configuration**: Persistance des données
- **Healthcheck**: Test de connexion automatique

### 💾 Redis
- **Port**: 6379
- **Rôle**: Cache et sessions utilisateur
- **Configuration**: Persistance activée
- **Healthcheck**: Test ping/pong

### 🚪 API Gateway
- **Port**: 3000
- **Rôle**: Point d'entrée unique de l'API
- **Fonctionnalités**: Routage, authentification, rate limiting
- **Healthcheck**: Endpoint `/health`

### 🌐 Frontend
- **Port**: 8080
- **Rôle**: Interface utilisateur (Next.js)
- **Configuration**: Build optimisé pour production
- **Healthcheck**: Test de disponibilité

### 📊 Metrics Aggregator
- **Port**: 3014
- **Rôle**: Collecte et agrégation des métriques système
- **Fonctionnalités**: Centralisation des métriques
- **Profil**: monitoring

### 🖥️ cAdvisor
- **Port**: 8080 (partagé)
- **Rôle**: Monitoring des conteneurs Docker
- **Fonctionnalités**: Métriques CPU, mémoire, disque
- **Profil**: monitoring

## 🟡 Services optionnels (avec profils)

### 🔐 Authentification (`auth`)
- **Service**: auth-service
- **Port**: 3001
- **Rôle**: Gestion de l'authentification et des utilisateurs
- **Fonctionnalités**: JWT, OAuth2, RBAC

### 📋 Candidatures (`applications`)
- **Service**: application-service
- **Port**: 3002
- **Rôle**: Gestion complète des candidatures
- **Fonctionnalités**: CRUD, statuts, filtres

### 🏢 Entreprises (`companies`)
- **Service**: company-service
- **Port**: 3003
- **Rôle**: Gestion des entreprises et contacts
- **Fonctionnalités**: CRUD entreprises, contacts associés

### 👥 Contacts (`contacts`)
- **Service**: contact-service
- **Port**: 3004
- **Rôle**: Gestion des contacts et relations
- **Fonctionnalités**: CRUD contacts, historiques

### 🎤 Entretiens (`interviews`)
- **Service**: interview-service
- **Port**: 3005
- **Rôle**: Gestion des entretiens et rendez-vous
- **Fonctionnalités**: Planification, suivi, notes

### 🔔 Notifications (`notifications`)
- **Service**: notification-service
- **Port**: 3006
- **Rôle**: Système de notifications
- **Fonctionnalités**: Email, push, in-app

### 📊 Dashboard (`dashboard`)
- **Service**: dashboard-service
- **Port**: 3007
- **Rôle**: Analytics et tableaux de bord
- **Fonctionnalités**: Métriques, graphiques, rapports

### 📞 Appels (`calls`)
- **Service**: call-service
- **Port**: 3008
- **Rôle**: Gestion des appels téléphoniques
- **Fonctionnalités**: Historique, notes, rappels

### 👤 Profils (`profiles`)
- **Service**: profile-service
- **Port**: 3009
- **Rôle**: Gestion des profils utilisateurs
- **Fonctionnalités**: Préférences, paramètres

### 📅 Événements (`events`)
- **Service**: event-service
- **Port**: 3011
- **Rôle**: Gestion des événements et calendrier
- **Fonctionnalités**: CRUD événements, rappels

### 🔄 Suivi (`followups`)
- **Service**: followup-service
- **Port**: 3012
- **Rôle**: Suivi et relance des candidatures
- **Fonctionnalités**: Workflows automatisés

### ⚙️ Workflows (`workflows`)
- **Service**: workflow-service
- **Port**: 3013
- **Rôle**: Gestion des workflows et processus
- **Fonctionnalités**: Définition, exécution, suivi

## 📈 Services de monitoring

### 📊 Prometheus (`monitoring`)
- **Port**: 9090
- **Rôle**: Collecte et stockage des métriques
- **Configuration**: Règles d'alerte personnalisées

### 📊 Grafana (`monitoring`)
- **Port**: 4000
- **Rôle**: Visualisation des métriques
- **Configuration**: Dashboards préconfigurés

## 🔧 Gestion des services

### Démarrage par profils

```bash
# Démarrer un profil spécifique
make up-profile PROFILE=auth         # Authentification
make up-profile PROFILE=applications # Candidatures
make up-profile PROFILE=monitoring   # Métriques complètes
make up-profile PROFILE=full         # Tous les services
```

### Gestion individuelle

```bash
# Démarrer un service spécifique
make start-auth
make start-applications

# Arrêter un service
make stop-service SERVICE=api-gateway

# Redémarrer un service
make restart-service SERVICE=frontend

# Voir les logs d'un service
make logs-service SERVICE=postgres
```

### Vérification de santé

```bash
# Vérification complète du système
make health

# Vérification détaillée
./scripts/core/check.sh --detailed

# Rapport HTML
./scripts/health/check-all.sh --report-format html --output report.html
```

## 🔗 Dépendances entre services

```
postgres ← redis ← api-gateway ← frontend
    ↑         ↑         ↑
    └───auth-service    │
         ↑              │
         └───application-service
              ↑
              └───[autres services]
```

**Légende:**
- **Flèche**: dépendance (le service de droite dépend du service de gauche)
- **Services essentiels**: toujours démarrés
- **Services optionnels**: démarrés selon les besoins

## 🔒 Sécurité

Tous les services incluent :
- **Authentification JWT** obligatoire
- **Rate limiting** configuré
- **CORS** sécurisé
- **Logs d'audit** activés
- **Validation des entrées** stricte

## 📊 Métriques et monitoring

Chaque service expose des métriques Prometheus :
- **Latence des requêtes**
- **Nombre d'erreurs**
- **Utilisation des ressources**
- **État de santé**

## 🚀 Évolutivité

L'architecture permet :
- **Ajout facile** de nouveaux services
- **Mise à l'échelle** indépendante
- **Déploiement** par profils
- **Monitoring centralisé**
- **Sécurité unifiée**

---

**Dernière mise à jour**: Octobre 2025
**Version**: 3.0 - Architecture microservices complète
