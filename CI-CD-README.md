# 🚀 CI/CD Pipeline - JobbingTrack

## 📋 Vue d'ensemble

Cette pipeline CI/CD complète et opérationnelle pour JobbingTrack assure la qualité du code, l'exécution de tous les tests et le déploiement automatique.

## 🏗️ Architecture de la Pipeline

### 1. **Analyse de la qualité du code**
- Linting avec ESLint
- Formatage avec Prettier
- Vérification des types TypeScript

### 2. **Tests Backend**
- Tests unitaires pour tous les microservices
- Tests de connectivité des services
- Tests de santé des APIs
- Tests de base de données (PostgreSQL + Redis)

### 3. **Tests Frontend**
- Tests unitaires avec Jest
- Tests E2E avec Playwright
- Tests d'accessibilité
- Build de production

### 4. **Tests d'intégration**
- Tests de connectivité entre services
- Tests des endpoints API
- Tests des fonctionnalités principales
- Tests de performance

### 5. **Analyse de sécurité**
- Audit des dépendances npm
- Scan de sécurité Docker

### 6. **Déploiement automatique**
- Construction des images de production
- Déploiement sur la branche main

## 🚀 Utilisation

### Exécution locale des tests

```bash
# Tous les tests
./scripts/run-all-tests.sh

# Tests backend seulement
./scripts/run-all-tests.sh --backend-only

# Tests frontend seulement
./scripts/run-all-tests.sh --frontend-only

# Tests d'intégration seulement
./scripts/run-all-tests.sh --integration-only
```

### Tests individuels

```bash
# Tests backend
./scripts/test-backend.sh

# Tests frontend
./scripts/test-frontend.sh

# Tests d'intégration
./scripts/test-integration.sh
```

## 📁 Structure des fichiers

```
.github/workflows/
├── ci-cd.yml                 # Pipeline principale

scripts/
├── test-backend.sh           # Tests backend
├── test-frontend.sh          # Tests frontend
├── test-integration.sh       # Tests d'intégration
└── run-all-tests.sh          # Script principal

backend/
├── docker-compose.yml        # Configuration développement
└── docker-compose.prod.yml   # Configuration production

frontend/
├── docker-compose.frontend.yml    # Configuration développement
├── docker-compose.prod.yml        # Configuration production
├── jest.config.js                 # Configuration Jest
├── jest.setup.js                  # Setup Jest
└── playwright.config.ts           # Configuration Playwright
```

## 🔧 Configuration

### Variables d'environnement

```bash
# Backend
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
SMTP_HOST=your-smtp-host
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_AUTH_SERVICE_URL=http://localhost:3001
```

### Prérequis

- Node.js 20.19.5+
- Docker et Docker Compose
- PostgreSQL (pour les tests locaux)
- Redis (pour les tests locaux)

## 📊 Rapports de tests

Les résultats des tests sont sauvegardés dans le dossier `test-results/` :

- `backend-test.log` - Logs des tests backend
- `frontend-test.log` - Logs des tests frontend
- `integration-test.log` - Logs des tests d'intégration

## 🎯 Workflow recommandé

### 1. Développement local
```bash
# Démarrer l'environnement
make up

# Exécuter les tests
./scripts/run-all-tests.sh

# Vérifier la qualité
make check-health
```

### 2. Avant un commit
```bash
# Tests rapides
./scripts/run-all-tests.sh --frontend-only

# Tests complets
./scripts/run-all-tests.sh
```

### 3. Avant un merge
```bash
# Tous les tests
./scripts/run-all-tests.sh

# Vérification finale
make diagnose
```

## 🚨 Résolution des problèmes

### Problème : "node: No such file or directory"
**Solution** : La pipeline utilise maintenant `actions/setup-node@v4` avec la version Node.js 20.19.5

### Problème : Tests qui échouent
**Solution** : 
1. Vérifiez les logs dans `test-results/`
2. Assurez-vous que tous les services sont démarrés
3. Vérifiez la connectivité des ports

### Problème : Services non accessibles
**Solution** :
```bash
# Nettoyer l'environnement
make down
make clean

# Redémarrer
make up
```

## 📈 Métriques de qualité

La pipeline génère des rapports de couverture de code :
- Backend : Tests unitaires + tests d'intégration
- Frontend : Tests unitaires + tests E2E
- Couverture minimale : 70%

## 🔒 Sécurité

- Audit automatique des dépendances
- Scan de sécurité des images Docker
- Vérification des secrets et variables d'environnement

## 🚀 Déploiement

### Automatique
- Déploiement automatique sur la branche `main`
- Construction des images de production
- Tests de santé post-déploiement

### Manuel
```bash
# Construction des images de production
cd backend && docker compose -f docker-compose.prod.yml build
cd ../frontend && docker compose -f docker-compose.prod.yml build

# Déploiement
docker compose -f docker-compose.prod.yml up -d
```

## 📞 Support

Pour toute question ou problème :
1. Consultez les logs dans `test-results/`
2. Vérifiez la configuration des services
3. Exécutez `make diagnose` pour un diagnostic complet

---

**🎉 Félicitations ! Votre pipeline CI/CD est maintenant opérationnelle et prête à assurer la qualité de votre projet JobbingTrack !**
