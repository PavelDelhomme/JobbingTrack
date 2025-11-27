# 📚 Documentation JobbingTrack

[← Retour au README principal](../README.md) | [🧭 Navigation](navigation.md) | [📑 Index](INDEX.md)

##  **[⚡ Guide de Démarrage Rapide](getting-started/README.md)** - Commencez ici !

## 🎯 Vue d'ensemble

Documentation complète et organisée du projet **JobbingTrack v4.1** - Système de suivi de candidatures avec architecture microservices, dashboard administrateur et applications mobiles.

### 🧭 Navigation
- **[Navigation complète](./navigation.md)** - Guide de navigation dans toute la documentation
- **[Index Documentation](./INDEX.md)** - Index complet de la documentation

## 📋 Structure de la documentation

```
docs/
├── 📖 README.md                        # Ce fichier - index principal
├── 🧭 navigation.md                    # Navigation complète
├── 🏗️ core/                            # Documentation technique de base
│   ├── architecture/README.md          # Architecture microservices
│   └── services/README.md              # Détail des microservices
├── 🏗️ architecture/                    # Architecture détaillée
│   └── metrics/                        # Système de métriques
│       ├── README.md                   # Architecture métriques
│       └── troubleshooting/README.md   # Dépannage métriques
├── 💾 database/                        # Base de données
│   ├── README.md                       # Documentation BDD
│   ├── analysis/                       # Analyses et audits
│   │   ├── README.md                   # Index analyses
│   │   ├── comprehensive-project-audit/
│   │   ├── data-structure-analysis/
│   │   └── data-structure-comparison/
│   └── architecture/database/README.md # Architecture PostgreSQL
├── 📡 api/                             # Documentation API
│   ├── api-reference/README.md         # Guide API complet
│   └── endpoints/README.md             # Liste des endpoints
├── 🚀 deployment/                      # Guides de déploiement
│   ├── getting-started/README.md       # Démarrage rapide
│   ├── production/README.md            # Déploiement production
│   ├── security/README.md              # Sécurité déploiement
│   └── configuration/                  # Configuration
│       └── CONFIGURATION_PORTS.md     # Configuration des ports
├── 💻 development/                     # Guides développement
│   ├── setup/README.md                 # Configuration environnement
│   ├── workflow/README.md              # Workflow développement
│   ├── makefile/README.md              # Guide Makefile complet
│   ├── testing/README.md               # Stratégies de tests
│   └── recap/                          # Récapitulatifs
│       ├── RECAP_FINAL_SESSION.md      # Récapitulatif session
│       └── RECAPITULATIF_FINAL.md      # Récapitulatif final
├── 📊 monitoring/                      # Monitoring système
│   └── README.md                       # Stack monitoring complète
├── 📧 emails/                          # Documentation emails
│   └── README.md                       # Configuration et dépannage emails
├── 🖥️ frontend/                        # Guide frontend
│   ├── README.md                        # Index frontend
│   ├── GUIDE_ENREGISTREMENT_AUTOMATIQUE.md     # Enregistrement auto
│   ├── GUIDE_PREFERENCES_UTILISATEUR.md        # Préférences utilisateur
│   └── GUIDE_PAGE_DETAIL_SERVICE.md            # Page détail service
├── 📱 mobile/guide/README.md           # Guide mobile
├── 🔧 administration/                  # Guide administration
│   ├── README.md                        # Index administration
│   └── GUIDE_GESTION_UTILISATEURS.md   # Gestion utilisateurs
├── 🐛 troubleshooting/                 # Dépannage
│   ├── README.md                        # Index dépannage
│   ├── CORRECTIONS_ANALYTICS_DASHBOARD.md      # Corrections analytics
│   ├── CORRECTIONS_ERREURS_404_TIMEOUTS.md     # Corrections 404/timeouts
│   ├── CORRECTIONS_FINALES_SESSION.md          # Corrections session
│   ├── CORRECTIONS_GRAPHIQUES_ANALYTICS.md     # Corrections graphiques
│   └── TROUBLESHOOTING_LOGIN.md                # Dépannage login
├── ⚡ performance/guide/README.md      # Optimisation
├── 🔒 security/                        # Sécurité
│   ├── README.md                        # Index sécurité
│   ├── SYSTEME_SECURITE_README.md      # Système sécurité
│   └── DEMARRAGE_SERVICES_SECURITE.md  # Démarrage services
├── 🧪 tests/                           # Tests
│   ├── README.md                        # Stratégie tests
│   └── TESTS_PAGE_DETAIL_SERVICES.md   # Tests page services
└── 📄 pdfs/                            # PDFs générés
    └── documentation-complete.pdf      # PDF global
```

## 📚 Documentation principale

### 🏗️ Architecture et Infrastructure
- **[Architecture Microservices](core/architecture/README.md)** - Vue complète de l'architecture
- **[Architecture Métriques](architecture/metrics/README.md)** - Système de collecte de métriques
- **[Base de Données](database/README.md)** - Schema PostgreSQL et relations
- **[Analyses BDD](database/analysis/README.md)** - Analyses comparatives et audits
- **[Monitoring](monitoring/README.md)** - Système de monitoring complet

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

### 🖥️ Frontend
- **[Guide Frontend](frontend/README.md)** - Guide complet développement frontend Next.js
- **[Enregistrement Automatique](frontend/GUIDE_ENREGISTREMENT_AUTOMATIQUE.md)** - Système d'enregistrement automatique
- **[Préférences Utilisateur](frontend/GUIDE_PREFERENCES_UTILISATEUR.md)** - Gestion des préférences
- **[Page Détail Service](frontend/GUIDE_PAGE_DETAIL_SERVICE.md)** - Page de détail des services

### 🔧 Administration
- **[Guide Administration](administration/README.md)** - Dashboard administrateur complet
- **[Gestion Utilisateurs](administration/GUIDE_GESTION_UTILISATEURS.md)** - Gestion complète des utilisateurs

### 📊 Monitoring
- **[Système Monitoring](monitoring/README.md)** - Stack monitoring complète
- **[Quick Start](monitoring/QUICK_START_MONITORING.md)** - 🚀 Démarrage rapide
- **[Guide Services](monitoring/GUIDE_MONITORING_SERVICES.md)** - Monitoring des services
- **[Tendances Métriques](monitoring/GUIDE_TENDANCES_METRIQUES.md)** - Analyse des tendances
- **[Commandes](monitoring/MONITORING_COMMANDS.md)** - Commandes monitoring
- **[Statistiques](monitoring/SYSTEME_STATISTIQUES_APPLICATIVES.md)** - Statistiques applicatives

### 🐛 Dépannage
- **[Guide Dépannage](troubleshooting/README.md)** - Solutions aux problèmes courants
- **[Corrections Analytics](troubleshooting/CORRECTIONS_ANALYTICS_DASHBOARD.md)** - Dashboard analytics
- **[Corrections 404/Timeouts](troubleshooting/CORRECTIONS_ERREURS_404_TIMEOUTS.md)** - Erreurs HTTP
- **[Corrections Session](troubleshooting/CORRECTIONS_FINALES_SESSION.md)** - Gestion des sessions
- **[Corrections Graphiques](troubleshooting/CORRECTIONS_GRAPHIQUES_ANALYTICS.md)** - Graphiques analytics
- **[Dépannage Login](troubleshooting/TROUBLESHOOTING_LOGIN.md)** - Dépannage problèmes de connexion

### 🔒 Sécurité
- **[Guide Sécurité](security/README.md)** - Bonnes pratiques de sécurité
- **[Système Sécurité](security/SYSTEME_SECURITE_README.md)** - Architecture sécurité complète
- **[Services Sécurité](security/DEMARRAGE_SERVICES_SECURITE.md)** - Démarrage et configuration

### 📧 Emails
- **[Guide Emails](emails/README.md)** - Configuration envoi d'emails (vérification, reset password)
- **[État du Système](emails/EMAIL_STATUS.md)** - État complet du système email
- **[Configuration OVH](emails/OVH_EMAIL_SETUP.md)** - Configuration complète OVH
- **[Configuration Production](emails/CONFIGURATION_PRODUCTION_EMAIL.md)** - Configuration pour la production
- **[Tests](emails/TEST_EMAIL_DEVELOPPEMENT.md)** - Guide de test en développement
- **[Prochaines Étapes](emails/PROCHAINES_ETAPES_EMAIL.md)** - Prochaines étapes après configuration

### 🧪 Tests
- **[Stratégie Tests](tests/README.md)** - Tests unitaires, intégration, E2E
- **[Tests Page Services](tests/TESTS_PAGE_DETAIL_SERVICES.md)** - Tests page détail services

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

1. **Consulter l'architecture** : [core/architecture/README.md](core/architecture/README.md)
2. **Comprendre la base de données** : [database/README.md](database/README.md)
3. **Explorer les APIs** : [api/api-reference/README.md](api/api-reference/README.md)
4. **Configurer le développement** : [development/setup/README.md](development/setup/README.md)

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
