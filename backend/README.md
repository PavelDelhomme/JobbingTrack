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

---

## 🧭 Navigation

### 📚 **Documentation Centrale**
- **[Accueil](../../README.md)** - Vue d'ensemble du projet
- **[Documentation Organisée](../../docs/README.md)** - Documentation complète
- **[Spécifications Techniques](../../docs/SPEC-TECHNIQUE-JOBBINGTRACK.md)** - Architecture détaillée

### 🚀 **Démarrage Rapide**
- **[Guide de Démarrage Rapide](../../GUIDE-DEMARRAGE-RAPIDE.md)** - Installation express
- **[Guide de Développement](../../docs/guides/getting-started.md)** - Développement backend

### 🔧 **Architecture Microservices**
- **[Services Disponibles](#-services-disponibles)** - Vue d'ensemble des 8 services
- **[Monitoring](../../docs/technical/README.md#monitoring)** - Prometheus, Grafana, Jaeger
- **[Sécurité](../../docs/technical/README.md#securite)** - Authentification et autorisation

### 🧪 **Tests et Qualité**
- **[Tests Automatisés](../../tests/README.md)** - Suite complète de tests
- **[Tests de Santé](#tests)** - Vérification des services
- **[Tests d'Intégration](../../tests/README.md#tests-dintegration)** - Workflows complets

### 📦 **Déploiement**
- **[Guide de Déploiement](../../docs/deployment/README.md)** - Production complète
- **[Docker Compose](../../docs/technical/README.md#docker-compose)** - Orchestration
- **[Variables d'Environnement](../../README.md#variables-denvironnement)** - Configuration

### 🛠️ **Outils de Développement**
- **[Makefiles](../../makefiles/README.md)** - Commandes automatisées
- **[Scripts Backend](../../scripts/README.md)** - Outils spécialisés
- **[Prisma](../../docs/technical/README.md#prisma-orm)** - Base de données

### 📁 **Structure du Projet**
- **[Frontend](../../frontend/README.md)** - Dashboard Next.js
- **[Mobile](../../mobile/README.md)** - Application React Native
- **[API](../../docs/api/README.md)** - Documentation API complète
