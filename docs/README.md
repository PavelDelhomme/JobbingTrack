# 📚 Documentation JobbingTrack

[← Retour au README principal](../README.md)

## 🎯 Vue d'ensemble

Documentation complète et organisée du projet **JobbingTrack v4.1** - Système de suivi de candidatures avec architecture microservices, dashboard administrateur et applications mobiles.

### 🧭 [Navigation complète](./navigation.md) - Guide de navigation dans toute la documentation

## 📋 Structure de la documentation

```
docs/
├── 📖 README.md                 # Ce fichier - index principal
├── 🏗️ core/                     # Documentation technique de base
│   ├── architecture.md          # Architecture microservices
│   ├── services.md              # Détail des microservices
│   └── database.md              # Structure base de données
├── 📡 api/                      # Documentation API
│   ├── api-reference.md         # Guide API complet
│   └── endpoints.md             # Liste des endpoints
├── 🚀 deployment/               # Guides de déploiement
│   ├── getting-started.md       # Démarrage rapide
│   ├── production.md            # Déploiement production
│   └── security.md              # Sécurité déploiement
├── 💻 development/              # Guides développement
│   ├── setup.md                 # Configuration environnement
│   ├── workflow.md              # Workflow développement
│   └── testing.md               # Stratégies de tests
├── 🖥️ frontend/                 # Guide frontend
│   └── guide.md                 # Développement frontend
├── 📱 mobile/                   # Guide mobile
│   └── guide.md                 # Développement mobile
├── 🔧 administration/           # Guide administration
│   └── guide.md                 # Dashboard administrateur
├── 🐛 troubleshooting/           # Dépannage
│   └── guide.md                 # Guide de résolution
├── ⚡ performance/              # Optimisation
│   └── guide.md                 # Guide performance
└── 🔒 security/                 # Sécurité
    └── guide.md                 # Guide sécurité
```

## 📚 Documentation principale

### 🏗️ Architecture et Infrastructure
- **[Architecture Microservices](core/architecture/README.md)** - Vue complète de l'architecture
- **[Base de Données](database/README.md)** - Schema PostgreSQL et relations
- **[Analyse BDD](database/analysis/)** - Analyses comparatives et audits

### 📡 API et Intégration
- **[API Reference](api/api-reference/README.md)** - Documentation complète des APIs
- **[Endpoints](api/endpoints/README.md)** - Liste exhaustive des endpoints

### 🚀 Déploiement
- **[Démarrage Rapide](deployment/getting-started/README.md)** - Installation et configuration
- **[Production](deployment/production/README.md)** - Déploiement en production
- **[Sécurité](deployment/security/README.md)** - Configuration sécurité

### 💻 Développement
- **[Configuration](development/setup/README.md)** - Environnement de développement
- **[Workflow](development/workflow/README.md)** - Processus de développement
- **[Makefile](development/makefile/README.md)** - ⭐ Nouveau système avec aide intégrée
- **[Tests](development/testing/README.md)** - Stratégies et outils de test

## 🆕 Nouveautés v4.1

### ⭐ Système Makefile Avancé
**Chaque module dispose maintenant d'une aide contextuelle complète !**

```bash
# Aide par module
make help-services        # Services (up, down, restart)
make help-frontend        # Frontend Next.js
make help-backend         # Backend/monitoring
make help-database        # Base de données
make help-compilation     # Build/rebuild
make help-diagnostic      # Diagnostic et corrections
make help-tests           # Tous les tests
make help-utils           # Utilitaires monitoring

# Aide générale depuis la racine
make help                 # Aide complète
make help-up              # Aide détaillée 'make up'
make help-monitoring-up   # Aide monitoring
```

📖 **[Guide complet Makefile](development/makefile/README.md)**

### ✅ Base de données étendue
- **Historique des statuts** : Suivi complet des changements de statut des candidatures
- **Système de notifications** : Multi-canaux avec métadonnées et liens vers entités
- **Calendrier intégré** : Événements polymorphes liés à tous les modules
- **Synchronisation mobile** : Queue pour la fonctionnalité offline
- **Relations many-to-many** : Contacts multi-entreprises et multi-candidatures

### ✅ Nouveaux modèles
- `ApplicationStatusHistory` - Historique des changements de statut
- `Notification` - Système de notifications
- `Event` - Calendrier avec relations polymorphes
- `SyncQueue` - Synchronisation mobile/offline

### ✅ Nouvelles relations
- Contact ↔ Entreprise (many-to-many)
- Contact ↔ Candidature (many-to-many)
- Contact ↔ Relance (many-to-many)
- Contact ↔ Entretien (many-to-many)
- Contact ↔ Événement (many-to-many)

## 🚀 Démarrage rapide

1. **Consulter l'architecture** : [core/architecture.md](core/architecture.md)
2. **Comprendre la base de données** : [core/database.md](core/database.md)
3. **Explorer les APIs** : [api/api-reference.md](api/api-reference.md)
4. **Configurer le développement** : [development/setup.md](development/setup.md)

## 🔧 Services disponibles

### Services Backend (18+)
- **API Gateway** - Point d'entrée unique (Port: 3000)
- **Auth Service** - Authentification et autorisation (Port: 3001)
- **Application Service** - Gestion des candidatures (Port: 3002)
- **Company Service** - Gestion des entreprises (Port: 3003)
- **Contact Service** - Gestion des contacts (Port: 3004)
- **Interview Service** - Gestion des entretiens (Port: 3005)
- **Call Service** - Gestion des appels (Port: 3006)
- **Event Service** - Gestion des événements (Port: 3007)
- **Followup Service** - Gestion du suivi (Port: 3008)
- **Profile Service** - Gestion des profils (Port: 3009)
- **Notification Service** - Système de notifications (Port: 3010)
- **Workflow Service** - Gestion des workflows (Port: 3011)
- **Dashboard Service** - Dashboard administrateur (Port: 3012)
- **Security Service** - Service de sécurité (Port: 3013)
- **Metrics Service** - Métriques système (Port: 3014)
- **Deployment Service** - Service de déploiement (Port: 3015)
- **Docker Stats Service** - Statistiques Docker (Port: 3016)
- **Scheduler Service** - Planification (Port: 3017)

### Services Infrastructure
- **PostgreSQL** - Base de données principale (Port: 5432)
- **Redis** - Cache et sessions (Port: 6379)
- **Prometheus** - Monitoring et métriques
- **Grafana** - Visualisation des métriques
- **cAdvisor** - Monitoring containers (Port: 8081)

## 📱 Applications

### Frontend
- **Next.js** - Interface web moderne (Port: 8080)
- **Admin Dashboard** - Interface d'administration complète
- **Responsive Design** - Compatible mobile et desktop

### Mobile
- **Flutter** - Application mobile cross-platform
- **Offline Support** - Fonctionnement hors ligne
- **Synchronisation** - Sync bidirectionnelle avec le backend

## 🔄 Migration depuis v4.0

Les utilisateurs de la version 4.0 doivent :

1. **Sauvegarder** leur base de données actuelle
2. **Appliquer la migration** : `cd backend && npx prisma migrate dev`
3. **Mettre à jour** les services backend pour utiliser les nouvelles relations
4. **Tester** les nouvelles fonctionnalités

## 📞 Support

- **Issues** : Créer une issue sur GitHub
- **Documentation** : Toutes les mises à jour sont synchronisées avec les PDFs
- **Migration** : Guide de migration disponible dans chaque document
- **PDF Complet** : [documentation-complete.pdf](pdfs/documentation-complete.pdf)

---

**Version** : 4.1 - Base de données étendue
**Dernière mise à jour** : $(date +%Y-%m-%d)
**Équipe** : JobbingTrack Development Team
