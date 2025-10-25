# 📚 Documentation JobbingTrack

## 🎯 Vue d'ensemble

Documentation complète et à jour du projet JobbingTrack, incluant l'architecture, les APIs, la base de données, et les guides de développement.

## 📋 Documentation principale

| Document | Description | État |
|----------|-------------|-------|
| [🏗️ Architecture](ARCHITECTURE.md) | Architecture microservices complète | ✅ Mis à jour |
| [📊 Base de Données](DATABASE_SCHEMA.md) | Structure complète de la base de données | 🆕 Nouveau |
| [📡 API](API.md) | Documentation des APIs REST | ✅ |
| [🔧 Services](SERVICES.md) | Détail des microservices | ✅ |
| [🚀 Déploiement](deployment-guide.md) | Guide de déploiement | ✅ |
| [🔒 Sécurité](security-guide.md) | Guide de sécurité | ✅ |
| [📈 Monitoring](METRICS_SYSTEM_README.md) | Système de monitoring | ✅ |

## 🛠️ Guides de développement

| Guide | Description | État |
|-------|-------------|-------|
| [💻 Développement](DEVELOPMENT.md) | Environnement de développement | ✅ |
| [🧪 Tests](TESTING-GUIDE.md) | Stratégies de tests | ✅ |
| [🐳 Docker](DOCKER_DETECTION_GUIDE.md) | Guide Docker | ✅ |
| [📱 Mobile](guide-mobile.md) | Application mobile Flutter | ✅ |
| [⚡ Performance](performance-guide.md) | Optimisations | ✅ |

## 📈 Nouveautés de la v4.1

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

## 📁 Structure des fichiers

```
docs/
├── ARCHITECTURE.md              # Architecture microservices
├── DATABASE_SCHEMA.md            # 🆕 Structure base de données complète
├── API.md                       # Documentation APIs
├── SERVICES.md                  # Détail des services
├── DEVELOPMENT.md               # Guide développement
├── deployment-guide.md          # Déploiement
├── security-guide.md            # Sécurité
├── METRICS_SYSTEM_README.md     # Monitoring
├── TESTING-GUIDE.md             # Tests
├── generate-pdfs.js             # Générateur PDFs
├── pdfs/                        # Versions PDF téléchargeables
└── [autres guides...]
```

## 🚀 Démarrage rapide

1. **Consulter l'architecture** : [ARCHITECTURE.md](ARCHITECTURE.md)
2. **Comprendre la base de données** : [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
3. **Explorer les APIs** : [API.md](API.md)
4. **Configurer le développement** : [DEVELOPMENT.md](DEVELOPMENT.md)

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

---

**Version** : 4.1 - Base de données étendue
**Dernière mise à jour** : $(date +%Y-%m-%d)
**Équipe** : JobbingTrack Development Team
