# 🚀 Démarrage Rapide - JobbingTrack

Guide d'installation et configuration pour JobbingTrack v4.1.

[← Retour au README principal](../../README.md)

## 🎯 Prérequis

### Configuration système minimale
- **CPU** : 2 cœurs
- **RAM** : 4GB
- **Stockage** : 10GB disponibles
- **OS** : Linux/macOS/Windows (WSL2 recommandé)

### Outils requis
- **Docker** : 20.10+
- **Docker Compose** : 2.0+
- **Git** : 2.30+
- **Node.js** : 20 LTS (pour développement)
- **Make** (optionnel, pour les commandes automatisées)

---

## ⚡ Installation rapide

### 1. Clonage du projet
```bash
git clone https://github.com/votre-repo/jobbingtrack.git
cd jobbingtrack
```

### 2. Configuration de l'environnement
```bash
# Copier le fichier d'environnement
cp .env.example .env

# Éditer les variables d'environnement
nano .env
```

### 3. Démarrage des services
```bash
# Services de base (PostgreSQL, Redis, API Gateway, Frontend)
make up

# Ou avec Docker Compose directement
docker-compose up -d postgres redis api-gateway frontend
```

### 4. Ports et accès

Une fois les services démarrés, vous pouvez accéder aux différentes interfaces :

- **Frontend** : http://localhost:8000
- **API Gateway** : http://localhost:3000
- **cAdvisor** : http://localhost:8081
- **Metrics Aggregator** : http://localhost:8082
- **Grafana** : http://localhost:8083 (admin/admin)
- **Prometheus** : http://localhost:9090
- **Alertmanager** : http://localhost:8085
- **Node Exporter** : http://localhost:8084
- **Blackbox Exporter** : http://localhost:8086

### 5. Vérification de l'installation
```bash
# Vérifier que tous les services sont démarrés
curl http://localhost:3000/health

# Accéder à l'interface web
open http://localhost:8000

# Vérifier les logs
make logs
```

---

## 🏗️ Architecture de démarrage

### Services démarrés par défaut
```bash
make up  # Démarre automatiquement :
├── 🗄️ PostgreSQL (5432)       - Base de données
├── 💾 Redis (6379)            - Cache et sessions
├── 🚪 API Gateway (3000)      - Point d'entrée API
├── 🌐 Frontend (8000)         - Interface web
├── 📊 Metrics Aggregator (8082) - Monitoring
└── 🖥️ cAdvisor (8081)         - Métriques Docker
```

### Services optionnels
```bash
# Ajouter les services métier
make up-profile PROFILE=auth         # Authentification
make up-profile PROFILE=applications # Candidatures
make up-profile PROFILE=companies    # Entreprises
make up-profile PROFILE=contacts     # Contacts
make up-profile PROFILE=interviews   # Entretiens
make up-profile PROFILE=calls        # Appels
make up-profile PROFILE=events       # Événements
make up-profile PROFILE=followups    # Suivi
make up-profile PROFILE=profiles     # Profils
make up-profile PROFILE=notifications # Notifications
make up-profile PROFILE=workflows    # Workflows

# Services système
make up-profile PROFILE=dashboard    # Dashboard admin
make up-profile PROFILE=security     # Sécurité
make up-profile PROFILE=monitoring   # Monitoring complet
make up-profile PROFILE=full         # Tous les services
```

---

## 🔧 Configuration avancée

### Variables d'environnement

#### Base de données
```env
POSTGRES_DB=jobbingtrack
POSTGRES_USER=jobbingtrack
POSTGRES_PASSWORD=jobbingtrack123
DATABASE_URL=postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack
```

#### Authentification
```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production-2025
JWT_REFRESH_SECRET=your-refresh-token-secret-change-in-production-2025
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=30d
```

#### Services
```env
REDIS_URL=redis://redis:6379
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
FRONTEND_URL=http://localhost:8000
```

#### Email (SMTP)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=JobbingTrack <noreply@jobbingtrack.com>
```

### Configuration Docker

#### Réseau personnalisé
```yaml
# docker-compose.yml
networks:
  jobbingtrack-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

services:
  postgres:
    networks:
      - jobbingtrack-network
    # ... autres configurations
```

#### Volumes persistants
```yaml
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  uploads:
    driver: local
```

---

## 🧪 Tests et validation

### Tests automatiques
```bash
# Tests unitaires
make test

# Tests d'intégration
make test-integration

# Tests end-to-end
make test-e2e

# Tests de performance
make test-performance
```

### Vérifications manuelles

#### 1. Vérifier la base de données
```bash
# Connexion PostgreSQL
docker exec -it jobbingtrack_postgres_1 psql -U jobbingtrack -d jobbingtrack

# Lister les schémas
\dn

# Lister les tables principales
SELECT schemaname, tablename FROM pg_tables WHERE schemaname IN ('auth', 'applications', 'companies');
```

#### 2. Vérifier les services
```bash
# Health check API Gateway
curl http://localhost:3000/health

# Métriques Prometheus
curl http://localhost:9090/api/v1/query?query=up

# Interface cAdvisor
open http://localhost:8081
```

#### 3. Vérifier le frontend
```bash
# Build du frontend
cd frontend && npm run build

# Tests frontend
cd frontend && npm run test

# Linting
cd frontend && npm run lint
```

---

## 📱 Applications mobiles

### Flutter Mobile App
```bash
# Démarrer l'émulateur mobile
make up-profile PROFILE=mobile

# Ou directement
docker-compose -f flutter-mobile-app/docker-compose.yml up -d

# Accéder à l'interface mobile
open http://localhost:8090
```

### Configuration mobile
```dart
// lib/services/api_service.dart
class ApiService {
  static const String baseUrl = 'http://localhost:3000';
  static const String wsUrl = 'ws://localhost:3000';

  // Configuration pour production
  // static const String baseUrl = 'https://api.jobbingtrack.com';
  // static const String wsUrl = 'wss://api.jobbingtrack.com';
}
```

---

## 🔍 Dépannage

### Problèmes courants

#### 1. Ports déjà utilisés
```bash
# Vérifier les ports occupés
lsof -i :3000
lsof -i :8000

# Modifier les ports dans docker-compose.yml
# ports:
#   - "3001:3000"  # API Gateway
#   - "8001:8000"  # Frontend
```

#### 2. Base de données non accessible
```bash
# Vérifier les logs PostgreSQL
make logs SERVICE=postgres

# Reset de la base de données
make down
docker volume rm jobbingtrack_postgres_data
make up
```

#### 3. Services qui ne démarrent pas
```bash
# Vérifier les logs
make logs

# Redémarrer les services
make restart

# Rebuild des images
make build
make up
```

#### 4. Problèmes de réseau
```bash
# Vérifier le réseau Docker
docker network ls
docker network inspect jobbingtrack-network

# Recréer le réseau si nécessaire
docker-compose down
docker network rm jobbingtrack-network
make up
```

---

## 🚀 Prochaines étapes

### 1. Configuration complète
- [Guide de développement](../development/setup.md)
- [Documentation API](../api/api-reference.md)
- [Guide d'administration](../administration/guide.md)

### 2. Déploiement en production
- [Guide production](production.md)
- [Configuration sécurité](security.md)
- [Monitoring et métriques](../../monitoring/)

### 3. Personnalisation
- [Configuration frontend](../../../frontend/README.md)
- [Application mobile](../../../mobile/README.md)
- [Thèmes et personnalisation](../../../frontend/src/styles/customization.css)

---

## 📞 Support

- **Logs** : `make logs` pour voir tous les logs
- **Monitoring** : `http://localhost:8081` (cAdvisor)
- **Santé** : `http://localhost:3000/health`
- **Tests** : `make test` pour valider l'installation

---

**Version**: 4.1 - Installation simplifiée
**Dernière mise à jour**: Octobre 2025

### Outils de Monitoring

- **cAdvisor** : http://localhost:8081
- **Prometheus** : http://localhost:9090
- **Grafana** : http://localhost:8083 (admin/admin)
- **Node Exporter** : http://localhost:8084
- **Alertmanager** : http://localhost:8085
- **Blackbox Exporter** : http://localhost:808600/health
