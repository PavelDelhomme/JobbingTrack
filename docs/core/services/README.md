# 🔧 Services Microservices - JobbingTrack

Documentation détaillée des 18+ microservices de JobbingTrack v4.1.

[← Retour à la documentation](../../README.md) | [← README principal](../../../README.md)

## 🎯 Vue d'ensemble

JobbingTrack utilise une architecture de microservices moderne organisée autour de **services essentiels** (toujours démarrés) et **services optionnels** (démarrés selon les besoins via des profils Docker Compose).

## 📋 Services par catégories

### 🟢 Services essentiels (toujours actifs)

| Service | Port | Description | Docker Compose |
|---------|------|-------------|----------------|
| **🗄️ PostgreSQL** | 5432 | Base de données principale | `make up` |
| **💾 Redis** | 6379 | Cache et sessions | `make up` |
| **🚪 API Gateway** | 3000 | Point d'entrée unique | `make up` |
| **🌐 Frontend** | 8080 | Interface Next.js | `make up` |
| **📊 Metrics Aggregator** | 3014 | Monitoring centralisé | `make up-profile monitoring` |
| **🖥️ cAdvisor** | 8081 | Monitoring Docker | `make up-profile monitoring` |

### 🔵 Services métier principaux

| Service | Port | Profil | Description |
|---------|------|---------|-------------|
| **🔐 Auth Service** | 3001 | `auth` | Authentification JWT, utilisateurs |
| **📋 Application Service** | 3002 | `applications` | Gestion des candidatures |
| **🏢 Company Service** | 3003 | `companies` | Gestion des entreprises |
| **👥 Contact Service** | 3004 | `contacts` | Gestion des contacts |
| **🎤 Interview Service** | 3005 | `interviews` | Planification entretiens |
| **📞 Call Service** | 3006 | `calls` | Gestion des appels |
| **📅 Event Service** | 3007 | `events` | Calendrier et événements |
| **🔄 Followup Service** | 3008 | `followups` | Suivi et relances |
| **👤 Profile Service** | 3009 | `profiles` | Profils utilisateurs |
| **🔔 Notification Service** | 3010 | `notifications` | Notifications multi-canaux |
| **⚙️ Workflow Service** | 3011 | `workflows` | Automatisation workflows |
| **📊 Dashboard Service** | 3012 | `dashboard` | Analytics et KPIs |

### 🔴 Services système avancés

| Service | Port | Profil | Description |
|---------|------|---------|-------------|
| **🔒 Security Service** | 3013 | `security` | Audit et sécurité |
| **📈 System Metrics** | 3018 | `full` | Métriques système |
| **🚀 Deployment Service** | 3016 | `full` | Gestion déploiements |
| **🐳 Docker Stats** | 3015 | `full` | Statistiques Docker |

---

## 🚀 Commandes de démarrage

### Services essentiels (base)
```bash
make up  # Démarre les services de base
```

### Services par fonctionnalités
```bash
make up-profile PROFILE=auth         # Authentification
make up-profile PROFILE=applications # Candidatures
make up-profile PROFILE=companies    # Entreprises
make up-profile PROFILE=contacts     # Contacts
make up-profile PROFILE=interviews   # Entretiens
make up-profile PROFILE=calls        # Appels
make up-profile PROFILE=events       # Événements
make up-profile PROFILE=followups    # Suivis
make up-profile PROFILE=profiles     # Profils
make up-profile PROFILE=notifications # Notifications
make up-profile PROFILE=workflows    # Workflows
```

### Services système
```bash
make up-profile PROFILE=dashboard    # Dashboard
make up-profile PROFILE=security     # Sécurité
make up-profile PROFILE=monitoring   # Monitoring complet
make up-profile PROFILE=full         # Tous les services
```

---

## 🔗 Configuration réseau

### Réseau Docker
```yaml
# docker-compose.yml
networks:
  jobbingtrack-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Variables d'environnement partagées
```bash
# .env
POSTGRES_DB=jobbingtrack
POSTGRES_USER=jobbingtrack
POSTGRES_PASSWORD=jobbingtrack123

JWT_SECRET=your-secret-key-change-in-production-2025
JWT_REFRESH_SECRET=your-refresh-secret-change-too-2025

REDIS_URL=redis://redis:6379

ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
FRONTEND_URL=http://localhost:8080
```

---

## 📊 Monitoring et métriques

### Services de monitoring
- **Prometheus** (Port 9090) - Collecte des métriques
- **Grafana** (Port 3001) - Visualisation
- **cAdvisor** (Port 8081) - Métriques Docker
- **Metrics Aggregator** (Port 3014) - Agrégation

### Points d'accès monitoring
- **API Gateway Health** : `http://localhost:3000/health`
- **cAdvisor Web UI** : `http://localhost:8081`
- **Prometheus** : `http://localhost:9090`
- **Grafana** : `http://localhost:3001`

---

## 🔧 Détails techniques

### Configuration Docker standard
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
COPY prisma/ ./prisma/
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js
CMD ["node", "src/server.js"]
```

### Health checks
Tous les services incluent des health checks automatiques :
- **HTTP** : Endpoint `/health` pour les services web
- **Database** : `pg_isready` pour PostgreSQL
- **Cache** : `redis-cli ping` pour Redis
- **Custom** : Scripts spécifiques par service

### Logs et debugging
- **Logs centralisés** : Winston pour tous les services
- **Format structuré** : JSON avec métadonnées
- **Niveaux** : info, warn, error, debug
- **Rotation** : Automatique avec compression

---

## 📚 Ressources

- [Architecture complète](architecture.md) - Vue technique détaillée
- [Base de données](database.md) - Schémas et relations
- [API Reference](../api/api-reference.md) - Documentation des endpoints
- [Déploiement](../deployment/production.md) - Guide production

---

**Version**: 4.1 - Services microservices
**Dernière mise à jour**: Octobre 2025
