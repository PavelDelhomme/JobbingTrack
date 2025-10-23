# 🚀 Remplacement pour les commandes Make - JobbingTrack

## 📋 Description

Ce projet utilise des scripts shell pour remplacer les commandes `make` manquantes. Ces scripts détectent automatiquement la version de Docker Compose installée et fournissent une interface simple pour gérer les services JobbingTrack.

## 🔧 Commandes disponibles

### Démarrage des services

```bash
# Démarrer les services essentiels (recommandé)
./make-up.sh
# ou
./make.sh up

# Démarrer TOUS les services (avec métriques)
./make-up-full.sh
# ou
./make.sh up-full

# Arrêter tous les services
./make-down.sh
# ou
./make.sh down
```

### Diagnostics

```bash
# Voir les logs en temps réel
./make.sh logs

# Voir le statut des services
./make.sh status

# Afficher l'aide
./make.sh help
```

## 🌐 Services disponibles

### Services essentiels (démarrés par défaut)
- **Frontend** : http://localhost:8080
- **API Gateway** : http://localhost:3000
- **Auth Service** : http://localhost:3001
- **Dashboard Service** : http://localhost:3007
- **PostgreSQL** : localhost:5432
- **Redis** : localhost:6379

### Services avec profils (optionnels)
- Services métier (applications, companies, contacts, interviews, etc.)
- Services de métriques (Prometheus, Grafana, cAdvisor)
- Services de workflow et notifications

## 🔑 Identifiants de connexion

- **Email** : admin@jobbingtrack.com
- **Mot de passe** : SuperAdmin123!

## 🐳 Détection automatique Docker Compose

Les scripts détectent automatiquement la commande Docker Compose disponible :

1. **docker-compose** (standalone) - prioritaire
2. **docker compose** (Docker CLI plugin)
3. **Chemin absolu** (`/usr/bin/docker-compose`, `/usr/local/bin/docker-compose`)

## 💡 Astuces

- Les scripts affichent toujours quelle commande Docker Compose est utilisée
- Utilisez `./make.sh` sans arguments pour voir l'aide complète
- Les services essentiels démarrent rapidement (~30 secondes)
- Tous les services avec métriques peuvent prendre plus de temps (~2-3 minutes)

## 🔍 Dépannage

### Si les services ne démarrent pas :
```bash
# Vérifier que Docker fonctionne
docker info

# Vérifier la syntaxe des fichiers docker-compose
docker compose -f docker-compose.yml config

# Voir les logs détaillés
./make.sh logs
```

### Si Docker Compose n'est pas détecté :
```bash
# Installer docker-compose
sudo apt-get install docker-compose-plugin  # Ubuntu/Debian
# ou
sudo yum install docker-compose-plugin       # CentOS/RHEL

# Ou utiliser Docker Desktop qui inclut Docker Compose
```

## 📚 Scripts disponibles

- `make.sh` - Interface principale (recommandé)
- `make-up.sh` - Démarrage des services essentiels
- `make-up-full.sh` - Démarrage de tous les services
- `make-down.sh` - Arrêt de tous les services

## ⚡ Démarrage rapide

1. **Démarrage simple** :
   ```bash
   ./make.sh up
   ```

2. **Accès aux interfaces** :
   - Frontend : http://localhost:8080
   - API : http://localhost:3000
   - Auth : http://localhost:3001
   - Dashboard : http://localhost:3007

3. **Connexion** :
   - Email: admin@jobbingtrack.com
   - Mot de passe: SuperAdmin123!

## 🔄 Migration depuis make

| Ancienne commande | Nouvelle commande |
|-------------------|------------------|
| `make up` | `./make.sh up` ou `./make-up.sh` |
| `make up-full` | `./make.sh up-full` ou `./make-up-full.sh` |
| `make down` | `./make.sh down` ou `./make-down.sh` |
| `make logs` | `./make.sh logs` |
| `make status` | `./make.sh status` |

---

**🎯 Résultat** : JobbingTrack est maintenant accessible et fonctionnel !
