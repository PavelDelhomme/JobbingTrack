# 🔧 Scripts - JobbingTrack

Documentation complète de tous les scripts d'automatisation et d'utilitaires du projet.

[← Retour à la documentation](../README.md) | [🧭 Navigation](../navigation.md)

## 🎯 Vue d'ensemble

JobbingTrack dispose d'une collection de scripts organisés pour faciliter le développement, le déploiement et la maintenance du système.

---

## 📂 Structure des Scripts

```
scripts/
├── core/               # Scripts principaux du système
├── db/                 # Gestion de la base de données
├── docker/             # Gestion Docker et conteneurs
├── health/             # Vérification santé des services
├── monitoring/         # Scripts de monitoring
├── setup/              # Installation et configuration
├── testing/            # Scripts de tests
├── utils/              # Utilitaires divers
├── deployment/         # Déploiement
└── docs/               # Scripts documentation
```

---

## 🚀 Scripts Principaux (core/)

### `start.sh`
**Description** : Démarre les services principaux  
**Usage** :
```bash
./scripts/core/start.sh
```

### `stop.sh`
**Description** : Arrête tous les services  
**Usage** :
```bash
./scripts/core/stop.sh
```

### `check.sh`
**Description** : Vérifie l'état général du système  
**Usage** :
```bash
./scripts/core/check.sh
```

---

## 💾 Scripts Base de Données (db/)

### `backup.sh`
**Description** : Sauvegarde la base de données PostgreSQL  
**Usage** :
```bash
./scripts/db/backup.sh [nom_fichier]
```
**Exemple** :
```bash
./scripts/db/backup.sh backup_20251103
```

### `seed.sh`
**Description** : Peuple la base de données avec des données de test  
**Usage** :
```bash
./scripts/db/seed.sh
```

### `run-prisma-migrations.sh`
**Description** : Applique les migrations Prisma  
**Usage** :
```bash
./scripts/db/run-prisma-migrations.sh
```

---

## 🐳 Scripts Docker (docker/)

### `cleanup.sh`
**Description** : Nettoie les conteneurs, images et volumes Docker inutilisés  
**Usage** :
```bash
./scripts/docker/cleanup.sh
```

### `cleanup-docker-volumes.sh`
**Description** : Nettoie spécifiquement les volumes Docker  
**Usage** :
```bash
./scripts/docker/cleanup-docker-volumes.sh
```
**⚠️ Attention** : Supprime tous les volumes non utilisés

### `verify-docker-setup.sh`
**Description** : Vérifie la configuration Docker  
**Usage** :
```bash
./scripts/docker/verify-docker-setup.sh
```

---

## 🏥 Scripts Santé (health/)

### `check-all.sh`
**Description** : Vérifie la santé de tous les services  
**Usage** :
```bash
./scripts/health/check-all.sh
```
**Output** : Status de chaque service (✅/❌)

### `check-env.sh`
**Description** : Vérifie que toutes les variables d'environnement nécessaires sont définies  
**Usage** :
```bash
./scripts/health/check-env.sh
```

### `check-services.sh`
**Description** : Vérifie l'état des services Docker  
**Usage** :
```bash
./scripts/health/check-services.sh [service_name]
```

---

## 📊 Scripts Monitoring (monitoring/)

### `start-metrics.sh`
**Description** : Démarre les services de métriques (Prometheus, Grafana)  
**Usage** :
```bash
./scripts/monitoring/start-metrics.sh
```

### `test-metrics.sh`
**Description** : Teste la collecte des métriques  
**Usage** :
```bash
./scripts/monitoring/test-metrics.sh
```

### `clean-monitoring.sh`
**Description** : Nettoie les données de monitoring  
**Usage** :
```bash
./scripts/monitoring/clean-monitoring.sh
```

### `restart-monitoring.sh`
**Description** : Redémarre tous les services de monitoring  
**Usage** :
```bash
./scripts/monitoring/restart-monitoring.sh
```

---

## ⚙️ Scripts Setup (setup/)

### `install-dependencies.sh`
**Description** : Installe toutes les dépendances nécessaires  
**Usage** :
```bash
./scripts/setup/install-dependencies.sh
```
**Installe** :
- Node.js dependencies
- Python packages
- System packages

---

## 🧪 Scripts Testing (testing/)

### `quick-test.sh`
**Description** : Lance les tests rapides  
**Usage** :
```bash
./scripts/testing/quick-test.sh
```

### `full-setup.sh`
**Description** : Configuration complète pour les tests  
**Usage** :
```bash
./scripts/testing/full-setup.sh
```

### `run-tests.sh`
**Description** : Lance la suite complète de tests  
**Usage** :
```bash
./scripts/testing/run-tests.sh [type]
```
**Types** :
- `unit` - Tests unitaires
- `integration` - Tests d'intégration
- `e2e` - Tests end-to-end
- `all` - Tous les tests (défaut)

### `init-with-test-data.sh`
**Description** : Initialise la DB avec des données de test  
**Usage** :
```bash
./scripts/testing/init-with-test-data.sh
```

### `test-containers-access.sh`
**Description** : Teste l'accès aux conteneurs  
**Usage** :
```bash
./scripts/testing/test-containers-access.sh
```

### `test-reset-password.sh`
**Description** : Teste la fonctionnalité de reset password  
**Usage** :
```bash
./scripts/testing/test-reset-password.sh
```

### `generate-default-test-data.js`
**Description** : Génère des données de test par défaut (Node.js)  
**Usage** :
```bash
node ./scripts/testing/generate-default-test-data.js
```

### `generate-simple-test-data.js`
**Description** : Génère des données de test simples (Node.js)  
**Usage** :
```bash
node ./scripts/testing/generate-simple-test-data.js
```

### `enhance-existing-tests.js`
**Description** : Améliore les tests existants (Node.js)  
**Usage** :
```bash
node ./scripts/testing/enhance-existing-tests.js
```

---

## 🛠️ Scripts Utilitaires (utils/)

### `make.sh`
**Description** : Wrapper pour les commandes Make  
**Usage** :
```bash
./scripts/utils/make.sh <command>
```

### `make-up.sh`
**Description** : Lance les services essentiels via Make  
**Usage** :
```bash
./scripts/utils/make-up.sh
```

### `make-up-full.sh`
**Description** : Lance tous les services via Make  
**Usage** :
```bash
./scripts/utils/make-up-full.sh
```

### `make-down.sh`
**Description** : Arrête tous les services via Make  
**Usage** :
```bash
./scripts/utils/make-down.sh
```

### `wait-for-service.sh`
**Description** : Attend qu'un service soit disponible  
**Usage** :
```bash
./scripts/utils/wait-for-service.sh <service_url> [timeout]
```
**Exemple** :
```bash
./scripts/utils/wait-for-service.sh http://localhost:3000/health 60
```

### `diagnostic.sh`
**Description** : Diagnostic complet du système  
**Usage** :
```bash
./scripts/utils/diagnostic.sh
```
**Affiche** :
- État des conteneurs
- Utilisation des ressources
- Logs récents
- Configuration

### `rebuild-all.sh`
**Description** : Rebuild tous les services Docker  
**Usage** :
```bash
./scripts/utils/rebuild-all.sh
```
**⚠️ Attention** : Opération longue

### `cleanup-old-files.sh`
**Description** : Nettoie les fichiers temporaires et logs anciens  
**Usage** :
```bash
./scripts/utils/cleanup-old-files.sh [days]
```
**Par défaut** : Supprime les fichiers de plus de 7 jours

---

## 📄 Scripts Documentation (docs/)

### `verify-links.sh`
**Description** : Vérifie tous les liens dans la documentation  
**Usage** :
```bash
./scripts/docs/verify-links.sh
```

### `verify-links-simple.sh`
**Description** : Vérification simple et rapide des liens  
**Usage** :
```bash
./scripts/docs/verify-links-simple.sh
```

---

## 📝 Scripts Deployment (deployment/)

**Note** : Les scripts de déploiement sont documentés dans le dossier `deployment/README.md`

---

## 🔧 Utilisation Générale

### Workflow de Développement

#### 1. Démarrage quotidien
```bash
# Vérifier l'environnement
./scripts/health/check-env.sh

# Vérifier Docker
./scripts/docker/verify-docker-setup.sh

# Démarrer les services
./scripts/core/start.sh

# Vérifier la santé
./scripts/health/check-all.sh
```

#### 2. Développement
```bash
# Appliquer les migrations DB
./scripts/db/run-prisma-migrations.sh

# Peupler avec des données de test
./scripts/db/seed.sh

# Lancer les tests
./scripts/testing/quick-test.sh
```

#### 3. Monitoring
```bash
# Démarrer le monitoring
./scripts/monitoring/start-metrics.sh

# Tester les métriques
./scripts/monitoring/test-metrics.sh
```

#### 4. Nettoyage
```bash
# Nettoyer Docker
./scripts/docker/cleanup.sh

# Nettoyer les fichiers temporaires
./scripts/utils/cleanup-old-files.sh
```

---

## 🚨 Scripts d'Urgence

### Système ne répond plus
```bash
# Diagnostic complet
./scripts/utils/diagnostic.sh

# Arrêter tout
./scripts/core/stop.sh

# Nettoyer
./scripts/docker/cleanup.sh

# Redémarrer
./scripts/core/start.sh
```

### Base de données corrompue
```bash
# Sauvegarder d'abord !
./scripts/db/backup.sh emergency_backup

# Reset et réappliquer
cd backend
npx prisma migrate reset

# Restaurer
./scripts/db/seed.sh
```

### Conteneurs en erreur
```bash
# Vérifier les conteneurs
./scripts/health/check-services.sh

# Rebuild si nécessaire
./scripts/utils/rebuild-all.sh
```

---

## ⚙️ Variables d'Environnement

Certains scripts utilisent des variables d'environnement :

```bash
# Base de données
POSTGRES_DB=jobbingtrack
POSTGRES_USER=jobbingtrack
POSTGRES_PASSWORD=your_password

# Docker
DOCKER_BUILDKIT=1
COMPOSE_DOCKER_CLI_BUILD=1

# Monitoring
METRICS_PORT=3014
PROMETHEUS_PORT=9090
```

**📖 Documentation complète** : [Variables d'Environnement](../deployment/environment-variables/README.md)

---

## 📊 Maintenance Régulière

### Quotidienne
```bash
# Vérifier la santé
./scripts/health/check-all.sh
```

### Hebdomadaire
```bash
# Backup de la base
./scripts/db/backup.sh weekly_$(date +%Y%m%d)

# Nettoyer Docker
./scripts/docker/cleanup.sh

# Nettoyer les fichiers anciens
./scripts/utils/cleanup-old-files.sh 7
```

### Mensuelle
```bash
# Nettoyer les volumes Docker
./scripts/docker/cleanup-docker-volumes.sh

# Rebuild complet
./scripts/utils/rebuild-all.sh
```

---

## 🔍 Diagnostic et Dépannage

### Voir les logs en direct
```bash
# Tous les services
docker-compose logs -f

# Service spécifique
docker-compose logs -f api-gateway

# Ou via Make
make logs
make logs-service SERVICE=api-gateway
```

### Vérifier les ressources
```bash
# Utilisation Docker
docker stats

# Diagnostic complet
./scripts/utils/diagnostic.sh
```

### Tester les endpoints
```bash
# API Gateway
curl http://localhost:3000/health

# Frontend
curl http://localhost:8000

# Métriques
curl http://localhost:3014/metrics
```

---

## 📚 Ressources Supplémentaires

- 🚀 [Guide de Démarrage](../getting-started/README.md)
- 🐛 [Troubleshooting](../troubleshooting/README.md)
- 🔐 [Variables d'Environnement](../deployment/environment-variables/README.md)
- 💾 [Base de Données](../database/README.md)
- 📊 [Monitoring](../monitoring/README.md)

---

## 💡 Conseils

### Bonnes Pratiques
1. **Toujours sauvegarder** avant des opérations destructives
2. **Vérifier la santé** après chaque changement
3. **Lire les logs** en cas d'erreur
4. **Tester d'abord** dans un environnement de dev

### Performance
- Utilisez `make` plutôt que les scripts individuels quand possible
- Les scripts dans `utils/` sont des helpers pour `make`
- Les scripts de test génèrent beaucoup de données, nettoyez régulièrement

### Sécurité
- Les scripts ne contiennent pas de credentials
- Utilisez toujours `.env` pour les secrets
- Ne commitez jamais les fichiers `.env`

---

## 🆘 Support

Si un script ne fonctionne pas :

1. Vérifiez les permissions : `chmod +x scripts/**/*.sh`
2. Vérifiez les variables d'environnement
3. Consultez les logs : `./scripts/utils/diagnostic.sh`
4. Voir la [documentation de dépannage](../troubleshooting/README.md)

---

**Version**: 4.1  
**Dernière mise à jour**: Novembre 2025  
**Scripts organisés**: ✅ Structure cohérente
