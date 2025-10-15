# 🛠️ Backend - Architecture Microservices

Architecture microservices complète avec 8 services opérationnels utilisant Node.js, Express, PostgreSQL et Redis.

## 📁 Structure

```
backend/
├── api-gateway/           # Point d'entrée principal (Port 3000)
├── auth-service/          # Authentification JWT (Port 3001)
├── application-service/   # Gestion des candidatures (Port 3002)
├── company-service/       # Gestion des entreprises (Port 3003)
├── contact-service/       # Gestion des contacts (Port 3004)
├── interview-service/     # Gestion des entretiens (Port 3005)
├── notification-service/  # Notifications et emails (Port 3006)
├── dashboard-service/     # Analytics et KPIs (Port 3007)
├── monitoring/           # Prometheus, Grafana, Jaeger
├── prisma/               # Schémas et migrations DB
└── docker-compose.yml    # Orchestration complète
```

## 🚀 Démarrage Rapide

```bash
# Démarrer tous les services
make up

# Ou avec Docker Compose directement
docker-compose up -d

# Voir les logs
make logs

# Vérifier la santé
make health
```

## 🔧 Services Disponibles

| Service | Port | État | Description |
|---------|------|------|-------------|
| API Gateway | 3000 | ✅ | Point d'entrée avec documentation Swagger |
| Auth Service | 3001 | ✅ | Authentification JWT et gestion utilisateurs |
| Application Service | 3002 | ✅ | CRUD complet des candidatures |
| Company Service | 3003 | ✅ | Base de données entreprises |
| Contact Service | 3004 | ✅ | Carnet d'adresses professionnel |
| Interview Service | 3005 | ✅ | Planning et feedback entretiens |
| Notification Service | 3006 | ✅ | Emails automatiques et rappels |
| Dashboard Service | 3007 | ✅ | Analytics et statistiques |

## 📊 Monitoring

- **Prometheus** : http://localhost:9090
- **Grafana** : http://localhost:3001
- **Jaeger** : http://localhost:16686
- **Adminer** : http://localhost:8080 (admin/admin)

## 🧪 Tests

```bash
# Tests de santé
make test-services

# Tests d'intégration
./test-microservices.sh

# Tests d'authentification
./tests/auth-tests.sh
```

## 🔐 Configuration

Voir le fichier principal [README.md](../../README.md) pour la configuration complète des variables d'environnement et l'installation.
