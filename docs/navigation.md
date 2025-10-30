# 🧭 Navigation Documentation - JobbingTrack

## 🎯 Navigation principale

### 📖 **Documentation du Projet**
- **[🏠 README Principal](../README.md)** | **[📚 Documentation Centralisée](README.md)**

### 🚀 **Démarrage Rapide**
- **[⚡ Guide de Démarrage](getting-started/README.md)** - ⭐ Commencez ici !
- **[🛠️ Commandes Makefile](development/COMMANDES_MAKEFILE.md)** - Guide complet des commandes
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

### 🔧 **Administration**
- **[⚙️ Guide Administration](administration/README.md)** | **[🐛 Dépannage](troubleshooting/README.md)**

### 📊 **Performance et Sécurité**
- **[⚡ Performance](./performance/README.md)** | **[🔒 Sécurité](./security/README.md)**

---

## 📋 Structure des dossiers

```
docs/
├── 📖 README.md                 # Index principal
├── 🧭 navigation.md             # Ce fichier de navigation
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

---

## 🔗 Liens rapides

### Pour les développeurs
- **[Configuration](./development/setup/README.md)** - Environnement de développement
- **[API](./api/api-reference/README.md)** - Documentation des APIs
- **[Architecture](./core/architecture/README.md)** - Vue technique
- **[Tests](./development/testing/README.md)** - Stratégies de tests

### Pour les administrateurs
- **[Administration](./administration/README.md)** - Guide administration
- **[Déploiement](./deployment/production/README.md)** - Production
- **[Sécurité](./security/README.md)** - Bonnes pratiques
- **[Monitoring](../monitoring/README.md)** - Surveillance système

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

- **📧 Email** : support@jobbingtrack.com
- **🐛 Issues** : [GitHub Issues](https://github.com/votre-repo/jobbingtrack/issues)
- **📖 Documentation** : Tous les guides mis à jour
- **🔄 Migration** : Guide dans chaque document

---

**Version** : 4.1 - Navigation organisée
**Dernière mise à jour** : Octobre 2025
