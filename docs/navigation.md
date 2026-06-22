# 🧭 Navigation Documentation - JobbingTrack

## 🎯 Navigation principale

### 📖 **Documentation du Projet**
- **[🏠 README Principal](../README.md)** | **[📊 STATUS — état courant](STATUS.md)** | **[📚 Documentation Centralisée](README.md)**
- **[📁 Structure Documentation](project/STRUCTURE_DOCUMENTATION.md)** | **[🧭 Audit Documentation](operations/DOCUMENTATION_AUDIT_PLAN.md)**

### 📋 **Suivi projet (lots, tâches, erreurs)**
- **[📊 STATUS.md](STATUS.md)** — **état courant** (lire en premier)
- **[📋 pilotage/TODOS.md](pilotage/TODOS.md)** — tâches ordonnées · **[📐 project/PLAN.md](project/PLAN.md)** — plan lots A–H
- **[📦 project/BACKLOG.md](project/BACKLOG.md)** · **[✅ project/RESOLUTIONS.md](project/RESOLUTIONS.md)** · **[⚠️ troubleshooting/ERRORS.md](troubleshooting/ERRORS.md)**
- **[🧭 pilotage/PILOTAGE.md](pilotage/PILOTAGE.md)** · **[INDEX.md](INDEX.md)**

### 🚀 **Démarrage Rapide**
- **[⚡ Guide de Démarrage](getting-started/README.md)** - ⭐ Commencez ici !
- **[🚀 Guide de Setup Complet](getting-started/GUIDE_SETUP_COMPLET.md)** - ⭐ **NOUVEAU** : Setup complet depuis zéro avec `make setup`
- **[📦 Guide d'Installation](getting-started/GUIDE_INSTALLATION.md)** - ⭐ **NOUVEAU** : Installation complète Docker, configuration, dépannage
- **[📁 Guide d'Amélioration Structure](getting-started/GUIDE_STRUCTURE.md)** - ⭐ **NOUVEAU** : Simplifier et clarifier la structure du projet
- **[🔄 Guide de Redémarrage](getting-started/REDEMARRAGE.md)** - Comment redémarrer le projet
- **[🛠️ Commandes Makefile](development/makefile-commands/README.md)** - Guide complet des commandes
- **[🔧 Scripts](scripts/README.md)** - Tous les scripts disponibles
- **[💻 Guide développement](development/makefile/README.md)** - Makefile, commandes et flux de développement
- **[🎯 Configuration Déploiement](deployment/getting-started/README.md)** | **[🏭 Production](deployment/production/README.md)** - Configuration complète du déploiement

### 🏗️ **Architecture et Infrastructure**
- **[🏛️ Architecture Microservices](core/architecture/README.md)** | **[💾 Base de Données](database/README.md)** | **[📊 Analyses BDD](database/analysis/README.md)**
- **[⚡ Architecture Métriques](architecture/metrics/README.md)** | **[🔧 Dépannage Métriques](architecture/metrics/troubleshooting/README.md)**

### 📡 **API et Intégration**
- **[📖 API Reference](api/api-reference/README.md)** | **[🔗 Endpoints](api/endpoints/README.md)**

### 🚀 **Déploiement**
- **[🎯 Démarrage](deployment/getting-started/README.md)** | **[🏭 Production](deployment/production/README.md)** | **[🔐 Sécurité](deployment/security/README.md)**

### 💻 **Développement**
- **[⚙️ Makefile](development/makefile/README.md)** | **[🛠️ Commandes](development/makefile-commands/README.md)** | **[🧪 Tests](tests/README.md)**
- **[🛠️ Guide Makefile](development/makefile/README.md)** - Système complet avec aide intégrée

### 📱 **Applications**
- **[🖥️ Frontend Next.js](frontend/README.md)** | **[📱 Mobile Flutter](mobile/README.md)**
- **[🎨 Guide Frontend](frontend/README.md)** - Next.js, composants, services

### 📧 **Configuration Emails**
- **[📧 Guide Emails](emails/README.md)** - Configuration envoi d'emails (vérification, reset password)
- **[📬 Mail](emails/MAIL.md)** - Routes, flux et suivi emails
- **[SMTP](emails/SMTP_CONFIGURATION.md)** - Configuration SMTP
- **[Python Email Setup](emails/PYTHON_EMAIL_SETUP.md)** - Setup historique / compatibilité

### 🔧 **Administration**
- **[⚙️ Guide Administration](administration/README.md)** | **[🐛 Dépannage](troubleshooting/README.md)**
- **[👥 Gestion Utilisateurs](administration/GUIDE_GESTION_UTILISATEURS.md)** - Création, rôles, permissions

### 📊 **Performance et Sécurité**
- **[⚡ Performance](./performance/README.md)** | **[🔒 Sécurité](./security/README.md)**
- **[🛡️ Système Sécurité](security/SYSTEME_SECURITE_README.md)** - Architecture sécurité complète
- **[🔍 Audit Sécurité](security/SECURITY_AUDIT.md)** - ⭐ Audit complet avec recommandations
- **[🔐 Services Sécurité](security/DEMARRAGE_SERVICES_SECURITE.md)** - Démarrage et configuration

### 🧪 **Tests**
- **[🧪 Stratégie Tests](tests/README.md)** - Tests unitaires, intégration, E2E
- **[Commandes Tests](tests/COMMANDES_TESTS.md)** - Commandes de test
- **[Structure make tests](tests/STRUCTURE_TESTS_MAKE_TEST.md)** - Structure des campagnes
- **[Rapports conventions](tests/RAPPORTS_CONVENTIONS.md)** - Conventions rapports
- **[Tests finaux](tests/TESTS_END.md)** - Gate manuel / fin de suite

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
│   ├── makefile/README.md        # Guide Makefile
│   └── makefile-commands/README.md # Commandes Makefile
├── 🖥️ frontend/                 # Guide frontend
│   ├── README.md                 # Développement frontend
│   ├── GUIDE_ENREGISTREMENT_AUTOMATIQUE.md  # Enregistrement auto paramètres
│   ├── GUIDE_PREFERENCES_UTILISATEUR.md     # Préférences utilisateur
│   └── GUIDE_PAGE_DETAIL_SERVICE.md         # Page détail service
├── 📱 mobile/                   # Guide mobile
│   └── README.md                 # Développement mobile
├── 📧 emails/                   # Configuration emails
│   ├── README.md                 # Index emails
│   ├── MAIL.md                   # Flux et routes mail
│   ├── SMTP_CONFIGURATION.md     # SMTP
│   └── PYTHON_EMAIL_SETUP.md     # Setup historique Python
├── 🔧 administration/           # Guide administration
│   ├── README.md                 # Dashboard administrateur
│   └── GUIDE_GESTION_UTILISATEURS.md        # Gestion utilisateurs
├── 🐛 troubleshooting/          # Dépannage
│   ├── README.md                 # Guide de résolution
│   ├── POSTGRES_MONITORING.md    # PostgreSQL et monitoring
│   └── TROUBLESHOOTING_LOGIN.md  # Dépannage login
├── ⚡ performance/              # Optimisation
│   └── README.md                 # Guide performance
├── 🔒 security/                 # Sécurité
│   ├── README.md                 # Guide sécurité
│   ├── SYSTEME_SECURITE_README.md           # Système sécurité
│   ├── SECURITY_AUDIT.md                      # ⭐ Audit complet
│   └── DEMARRAGE_SERVICES_SECURITE.md       # Démarrage services
└── 🧪 tests/                    # Tests
    ├── README.md                 # Stratégie tests
    ├── COMMANDES_TESTS.md        # Commandes
    ├── STRUCTURE_TESTS_MAKE_TEST.md # Structure make tests
    └── TESTS_END.md              # Gate final
```

---

## 🔗 Liens rapides

### Pour les développeurs
- **[Makefile](./development/makefile/README.md)** - Environnement de développement et commandes
- **[API](./api/api-reference/README.md)** - Documentation des APIs
- **[Architecture](./core/architecture/README.md)** - Vue technique
- **[Tests](./tests/README.md)** - Stratégies de tests
- **[Frontend](./frontend/README.md)** - Développement Next.js

### Pour les administrateurs
- **[Administration](./administration/README.md)** - Guide administration
- **[Gestion Utilisateurs](./administration/GUIDE_GESTION_UTILISATEURS.md)** - Utilisateurs et permissions
- **[Déploiement](./deployment/production/README.md)** - Production
- **[Sécurité](./security/README.md)** - Bonnes pratiques
- **[Monitoring](./monitoring/README.md)** - Surveillance système

### Pour le monitoring
- **[📚 Quick Start](./monitoring/QUICK_START_MONITORING.md)** - 🚀 Démarrage rapide
- **[📊 Guide Monitoring](./monitoring/MONITORING_GUIDE.md)** - Monitoring des services
- **[📈 Flux métriques](./monitoring/metrics-flow.md)** - Collecte et API métriques
- **[💻 Commandes](./monitoring/MONITORING_COMMANDS.md)** - Commandes utiles
- **[🦀 Migration Rust](../monitoring/MIGRATION_RUST.md)** - Migration agents bas niveau
- **[⚡ Optimisation](./monitoring/PERFORMANCE_OPTIMIZATION.md)** - Optimisations metrics-aggregator

### Pour le dépannage
- **[Guide Principal](./troubleshooting/README.md)** - Résolution problèmes
- **[Login](./troubleshooting/TROUBLESHOOTING_LOGIN.md)** - Dépannage login
- **[Postgres monitoring](./troubleshooting/POSTGRES_MONITORING.md)** - PostgreSQL et monitoring

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
- PDFs développement historiques non régénérés dans l'état actuel ; voir les sources [development/makefile/README.md](development/makefile/README.md), [development/makefile-commands/README.md](development/makefile-commands/README.md) et [tests/README.md](tests/README.md).

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

- **📧 Email** : redacted@example.invalid
- **🐛 Issues** : [GitHub Issues](https://github.com/votre-repo/jobbingtrack/issues)
- **📖 Documentation** : Tous les guides mis à jour
- **🔄 Migration** : Guide dans chaque document

---

**Version** : 4.1 - Navigation organisée
**Dernière mise à jour** : Octobre 2025
