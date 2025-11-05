# 🧭 Navigation Documentation - JobbingTrack

## 🎯 Navigation principale

### 📖 **Documentation du Projet**
- **[🏠 README Principal](../README.md)** | **[📚 Documentation Centralisée](README.md)**
- **[📁 Organisation Documentation](ORGANISATION_DOCUMENTATION.md)** - Guide de la nouvelle structure organisée

### 🚀 **Démarrage Rapide**
- **[⚡ Guide de Démarrage](getting-started/README.md)** - ⭐ Commencez ici !
- **[🔄 Guide de Redémarrage](getting-started/REDEMARRAGE.md)** - Comment redémarrer le projet
- **[🛠️ Commandes Makefile](development/makefile-commands/README.md)** - Guide complet des commandes
- **[🔧 Scripts](scripts/README.md)** - Tous les scripts disponibles
- **[💻 Configuration Développement](development/setup/README.md)** - Configuration complète du développement
- **[🎯 Configuration Déploiement](deployment/getting-started/README.md)** | **[🏭 Production](deployment/production/README.md)** - Configuration complète du déploiement

### 🏗️ **Architecture et Infrastructure**
- **[🏛️ Architecture Microservices](core/architecture/README.md)** | **[💾 Base de Données](database/README.md)** | **[📊 Analyses BDD](database/analysis/README.md)**
- **[⚡ Architecture Métriques](architecture/metrics/README.md)** | **[🔧 Dépannage Métriques](architecture/metrics/troubleshooting/README.md)**

### 📡 **API et Intégration**
- **[📖 API Reference](api/api-reference/README.md)** | **[🔗 Endpoints](api/endpoints/README.md)**

### 🚀 **Déploiement**
- **[🎯 Démarrage](deployment/getting-started/README.md)** | **[🏭 Production](deployment/production/README.md)** | **[🔐 Sécurité](deployment/security/README.md)**

### 💻 **Développement**
- **[⚙️ Configuration](development/setup/README.md)** | **[🔄 Workflow](development/workflow/README.md)** | **[🧪 Tests](development/testing/README.md)**
- **[🛠️ Guide Makefile](development/makefile/README.md)** - Système complet avec aide intégrée

### 📱 **Applications**
- **[🖥️ Frontend Next.js](development/setup/README.md#frontend)** | **[📱 Mobile Flutter](../mobile/README.md)**
- **[🎨 Guide Frontend](frontend/README.md)** - Next.js, composants, services

### 📧 **Configuration Emails**
- **[📧 Guide Emails](emails/README.md)** - Configuration envoi d'emails (vérification, reset password)
- **[📖 Vue d'Ensemble](emails/MAIL.md)** - MailHog (tests) + OVH maily.ovh (production)
- **[🏢 Configuration OVH](emails/GUIDE_COMPLET_OVH_MAILY.md)** - Guide complet OVH maily.ovh (20 min)
- **[⚠️ Important](emails/IMPORTANT_LIRE_AVANT_CONFIG_OVH.md)** - Ne pas suivre solution Perplexity

### 🔧 **Administration**
- **[⚙️ Guide Administration](administration/README.md)** | **[🐛 Dépannage](troubleshooting/README.md)**
- **[👥 Gestion Utilisateurs](administration/GUIDE_GESTION_UTILISATEURS.md)** - Création, rôles, permissions

### 📊 **Performance et Sécurité**
- **[⚡ Performance](./performance/README.md)** | **[🔒 Sécurité](./security/README.md)**
- **[🛡️ Système Sécurité](security/SYSTEME_SECURITE_README.md)** - Architecture sécurité complète
- **[🔐 Services Sécurité](security/DEMARRAGE_SERVICES_SECURITE.md)** - Démarrage et configuration

### 🧪 **Tests**
- **[🧪 Stratégie Tests](tests/README.md)** - Tests unitaires, intégration, E2E
- **[📊 Tests Services](tests/TESTS_PAGE_DETAIL_SERVICES.md)** - Tests page détail services

---

## 📋 Structure des dossiers

```
docs/
├── 📖 README.md                 # Index principal
├── 🧭 navigation.md             # Ce fichier de navigation
├── 🏗️ core/                     # Documentation technique de base
│   ├── architecture/README.md   # Architecture microservices
│   └── services/README.md       # Détail des microservices
├── 📡 api/                      # Documentation API
│   ├── api-reference/README.md  # Guide API complet
│   └── endpoints/README.md      # Liste des endpoints
├── 🚀 deployment/               # Guides de déploiement
│   ├── getting-started/README.md # Démarrage rapide
│   ├── production/README.md      # Déploiement production
│   └── security/README.md        # Sécurité déploiement
├── 💻 development/              # Guides développement
│   ├── setup/README.md           # Configuration environnement
│   ├── workflow/README.md        # Workflow développement
│   └── testing/README.md         # Stratégies de tests
├── 🖥️ frontend/                 # Guide frontend
│   ├── README.md                 # Développement frontend
│   ├── GUIDE_ENREGISTREMENT_AUTOMATIQUE.md  # Enregistrement auto paramètres
│   ├── GUIDE_PREFERENCES_UTILISATEUR.md     # Préférences utilisateur
│   └── GUIDE_PAGE_DETAIL_SERVICE.md         # Page détail service
├── 📱 mobile/                   # Guide mobile
│   └── README.md                 # Développement mobile
├── 📧 emails/                   # Configuration emails
│   ├── README.md                 # Index emails
│   ├── MAIL.md                   # Vue d'ensemble (MailHog + OVH)
│   ├── GUIDE_COMPLET_OVH_MAILY.md        # Configuration OVH détaillée
│   └── IMPORTANT_LIRE_AVANT_CONFIG_OVH.md # Avertissement Perplexity
├── 🔧 administration/           # Guide administration
│   ├── README.md                 # Dashboard administrateur
│   └── GUIDE_GESTION_UTILISATEURS.md        # Gestion utilisateurs
├── 🐛 troubleshooting/          # Dépannage
│   ├── README.md                 # Guide de résolution
│   ├── CORRECTIONS_ANALYTICS_DASHBOARD.md   # Corrections analytics
│   ├── CORRECTIONS_ERREURS_404_TIMEOUTS.md  # Corrections 404/timeouts
│   ├── CORRECTIONS_FINALES_SESSION.md       # Corrections finales
│   └── CORRECTIONS_GRAPHIQUES_ANALYTICS.md  # Corrections graphiques
├── ⚡ performance/              # Optimisation
│   └── README.md                 # Guide performance
├── 🔒 security/                 # Sécurité
│   ├── README.md                 # Guide sécurité
│   ├── SYSTEME_SECURITE_README.md           # Système sécurité
│   └── DEMARRAGE_SERVICES_SECURITE.md       # Démarrage services
└── 🧪 tests/                    # Tests
    ├── README.md                 # Stratégie tests
    └── TESTS_PAGE_DETAIL_SERVICES.md        # Tests page services
```

---

## 🔗 Liens rapides

### Pour les développeurs
- **[Configuration](./development/setup/README.md)** - Environnement de développement
- **[API](./api/api-reference/README.md)** - Documentation des APIs
- **[Architecture](./core/architecture/README.md)** - Vue technique
- **[Tests](./development/testing/README.md)** - Stratégies de tests
- **[Frontend](./frontend/README.md)** - Développement Next.js

### Pour les administrateurs
- **[Administration](./administration/README.md)** - Guide administration
- **[Gestion Utilisateurs](./administration/GUIDE_GESTION_UTILISATEURS.md)** - Utilisateurs et permissions
- **[Déploiement](./deployment/production/README.md)** - Production
- **[Sécurité](./security/README.md)** - Bonnes pratiques
- **[Monitoring](./monitoring/README.md)** - Surveillance système

### Pour le monitoring
- **[📚 Quick Start](./monitoring/QUICK_START_MONITORING.md)** - 🚀 Démarrage rapide
- **[📊 Guide Monitoring](./monitoring/GUIDE_MONITORING_SERVICES.md)** - Monitoring des services
- **[📈 Tendances Métriques](./monitoring/GUIDE_TENDANCES_METRIQUES.md)** - Analyse des tendances
- **[💻 Commandes](./monitoring/MONITORING_COMMANDS.md)** - Commandes utiles
- **[📁 Fichiers](./monitoring/FICHIERS_MONITORING.md)** - Organisation fichiers
- **[📊 Statistiques](./monitoring/SYSTEME_STATISTIQUES_APPLICATIVES.md)** - Statistiques applicatives
- **[⚡ Améliorations](./monitoring/AMELIORATIONS_CHARGEMENT_METRIQUES.md)** - Optimisations
- **[🔧 Corrections](./monitoring/CORRECTION_COHERENCE_METRIQUES.md)** - Cohérence métriques
- **[📝 Résumé](./monitoring/INTEGRATION_MONITORING_RESUME.md)** - Résumé intégration

### Pour le dépannage
- **[Guide Principal](./troubleshooting/README.md)** - Résolution problèmes
- **[Analytics Dashboard](./troubleshooting/CORRECTIONS_ANALYTICS_DASHBOARD.md)** - Corrections analytics
- **[Erreurs 404/Timeouts](./troubleshooting/CORRECTIONS_ERREURS_404_TIMEOUTS.md)** - Erreurs HTTP
- **[Session](./troubleshooting/CORRECTIONS_FINALES_SESSION.md)** - Corrections session
- **[Graphiques](./troubleshooting/CORRECTIONS_GRAPHIQUES_ANALYTICS.md)** - Corrections graphiques

### Pour les utilisateurs
- **[Démarrage](./deployment/getting-started/README.md)** - Installation
- **[Dépannage](./troubleshooting/README.md)** - Résolution problèmes
- **[Performance](./performance/README.md)** - Optimisation

---

## 📚 PDFs disponibles

### 📄 **PDF Principal**
- **[📚 Documentation Complète](./pdfs/documentation-complete.pdf)** - Tout en un (63 pages)

### 🏗️ **PDFs par catégorie**
- **[🏛️ Architecture](./pdfs/core/architecture.pdf)**
- **[🔧 Services](./pdfs/core/services.pdf)**
- **[💾 Base de Données](./pdfs/core/database.pdf)**

### 📡 **APIs**
- **[📖 API Reference](./pdfs/api/api-reference.pdf)**
- **[🔗 Endpoints](./pdfs/api/endpoints.pdf)**

### 🚀 **Déploiement**
- **[⚡ Démarrage](./pdfs/deployment/getting-started.pdf)**
- **[🏭 Production](./pdfs/deployment/production.pdf)**

### 💻 **Développement**
- **[⚙️ Configuration](./pdfs/development/setup.pdf)**
- **[🧪 Tests](./pdfs/development/testing.pdf)**

---

## 🔍 Recherche dans la documentation

### Mots-clés principaux
- **Architecture** : microservices, scalabilité, Docker
- **API** : REST, endpoints, authentification, JWT
- **Déploiement** : production, sécurité, monitoring
- **Développement** : Node.js, TypeScript, tests, CI/CD
- **Base de données** : PostgreSQL, Prisma, schémas
- **Mobile** : Flutter, synchronisation, offline

---

## 🆕 Nouveautés

### Version 4.1
- ✅ **Base de données étendue** avec relations many-to-many
- ✅ **Historique des statuts** des candidatures
- ✅ **Système de notifications** multi-canaux
- ✅ **Calendrier intégré** avec relations polymorphes
- ✅ **Synchronisation mobile** avec queue offline
- ✅ **Documentation restructurée** et organisée

---

## 📞 Support

- **📧 Email** : support@jobbingtrack.test
- **🐛 Issues** : [GitHub Issues](https://github.com/votre-repo/jobbingtrack/issues)
- **📖 Documentation** : Tous les guides mis à jour
- **🔄 Migration** : Guide dans chaque document

---

**Version** : 4.1 - Navigation organisée
**Dernière mise à jour** : Octobre 2025
