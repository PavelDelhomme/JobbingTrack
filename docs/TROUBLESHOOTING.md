# Guide de Dépannage - JobbingTrack

[← Retour au README principal](../README.md)

## 🎯 Vue d'ensemble

Ce guide vous aide à résoudre les problèmes courants rencontrés avec JobbingTrack.

## 📋 Table des matières

- [🚨 Problèmes de démarrage](#-problèmes-de-démarrage)
- [🐳 Problèmes Docker](#-problèmes-docker)
- [💾 Problèmes de base de données](#-problèmes-de-base-de-données)
- [🌐 Problèmes de réseau](#-problèmes-de-réseau)
- [📊 Problèmes de monitoring](#-problèmes-de-monitoring)
- [🔧 Problèmes de développement](#-problèmes-de-développement)
- [📞 Support](#-support)

---

## 🚨 Problèmes de démarrage

### Services qui ne démarrent pas

#### Symptômes
- Erreur lors de `make up`
- Conteneurs qui redémarrent en boucle
- Messages d'erreur dans les logs

#### Solutions

1. **Vérifier Docker**
   ```bash
   # Vérifier que Docker est démarré
   sudo systemctl status docker
   
   # Redémarrer Docker si nécessaire
   sudo systemctl restart docker
   ```

2. **Nettoyer et redémarrer**
   ```bash
   # Arrêter tous les services
   make down
   
   # Nettoyer les volumes
   make clean
   
   # Redémarrer
   make up
   ```

3. **Vérifier les ports**
   ```bash
   # Vérifier les ports utilisés
   netstat -tulpn | grep :3000
   netstat -tulpn | grep :5432
   
   # Libérer les ports si nécessaire
   sudo fuser -k 3000/tcp
   ```

### Erreur "Port already in use"

#### Symptômes
```
ERROR: for postgres  Cannot start service postgres: driver failed programming external connectivity on endpoint postgres: Error starting userland proxy: listen tcp 0.0.0.0:5432: bind: address already in use
```

#### Solutions

1. **Identifier le processus utilisant le port**
   ```bash
   sudo lsof -i :5432
   sudo netstat -tulpn | grep :5432
   ```

2. **Arrêter le processus**
   ```bash
   # Si c'est un service PostgreSQL local
   sudo systemctl stop postgresql
   
   # Ou tuer le processus directement
   sudo kill -9 <PID>
   ```

3. **Modifier la configuration**
   ```bash
   # Changer le port dans docker-compose.yml
   ports:
     - "5433:5432"  # Au lieu de "5432:5432"
   ```

---

## 🐳 Problèmes Docker

### Images qui ne se construisent pas

#### Symptômes
- Erreur lors de `make build`
- Timeout lors de la construction
- Erreurs de dépendances

#### Solutions

1. **Nettoyer le cache Docker**
   ```bash
   docker system prune -a
   docker builder prune
   ```

2. **Reconstruire sans cache**
   ```bash
   make build --no-cache
   ```

3. **Vérifier l'espace disque**
   ```bash
   df -h
   docker system df
   ```

### Conteneurs qui redémarrent

#### Symptômes
- Conteneurs avec status "Restarting"
- Logs d'erreur répétitifs

#### Solutions

1. **Vérifier les logs**
   ```bash
   docker logs <container-name>
   make logs
   ```

2. **Vérifier la configuration**
   ```bash
   # Vérifier docker-compose.yml
   docker-compose config
   ```

3. **Redémarrer en mode debug**
   ```bash
   docker-compose up --no-deps <service-name>
   ```

---

## 💾 Problèmes de base de données

### Base de données non accessible

#### Symptômes
- Erreurs de connexion à la base
- Timeout des requêtes
- Services qui ne peuvent pas se connecter

#### Solutions

1. **Vérifier l'état de PostgreSQL**
   ```bash
   # Vérifier les conteneurs
   docker ps | grep postgres
   
   # Vérifier les logs
   docker logs postgres
   ```

2. **Tester la connexion**
   ```bash
   # Se connecter à la base
   docker exec -it postgres psql -U user -d jobbingtrack
   
   # Vérifier les bases de données
   \l
   ```

3. **Réinitialiser la base**
   ```bash
   make db-reset
   make db-seed
   ```

### Erreurs de migration

#### Symptômes
- Erreurs lors de `make db-migrate`
- Tables manquantes
- Erreurs de schéma

#### Solutions

1. **Vérifier les migrations**
   ```bash
   # Voir l'état des migrations
   make db-status
   
   # Appliquer les migrations
   make db-migrate
   ```

2. **Résoudre les conflits**
   ```bash
   # Rollback et re-apply
   make db-rollback
   make db-migrate
   ```

---

## 🌐 Problèmes de réseau

### Services non accessibles

#### Symptômes
- Erreur 502 Bad Gateway
- Timeout des requêtes
- Services qui ne répondent pas

#### Solutions

1. **Vérifier la connectivité**
   ```bash
   # Tester la connectivité interne
   docker exec -it api-gateway curl http://auth-service:3001/health
   
   # Tester depuis l'extérieur
   curl http://localhost:3000/health
   ```

2. **Vérifier les réseaux Docker**
   ```bash
   # Lister les réseaux
   docker network ls
   
   # Inspecter le réseau
   docker network inspect jobbingtrack_default
   ```

3. **Redémarrer les services réseau**
   ```bash
   make down
   docker network prune
   make up
   ```

### Problèmes de DNS

#### Symptômes
- Erreurs de résolution de noms
- Services qui ne trouvent pas d'autres services

#### Solutions

1. **Vérifier la résolution DNS**
   ```bash
   docker exec -it api-gateway nslookup auth-service
   ```

2. **Utiliser des IPs statiques**
   ```bash
   # Dans docker-compose.yml
   networks:
     default:
       ipam:
         config:
           - subnet: 172.20.0.0/16
   ```

---

## 📊 Problèmes de monitoring

### Prometheus non accessible

#### Symptômes
- Interface Prometheus non accessible
- Métriques non collectées
- Erreurs dans Grafana

#### Solutions

1. **Vérifier le statut**
   ```bash
   docker ps | grep prometheus
   curl http://localhost:9090
   ```

2. **Vérifier la configuration**
   ```bash
   docker exec -it prometheus cat /etc/prometheus/prometheus.yml
   ```

3. **Redémarrer le monitoring**
   ```bash
   make metrics-stop
   make metrics-start
   ```

### Grafana ne charge pas les données

#### Symptômes
- Dashboards vides
- Erreurs "No data"
- Sources de données non accessibles

#### Solutions

1. **Vérifier les sources de données**
   ```bash
   # Se connecter à Grafana
   open http://localhost:4000
   # Admin/Admin par défaut
   ```

2. **Vérifier la connectivité Prometheus**
   ```bash
   # Dans Grafana, tester la connexion à Prometheus
   http://prometheus:9090
   ```

---

## 🔧 Problèmes de développement

### Hot reload ne fonctionne pas

#### Symptômes
- Changements non pris en compte
- Serveur de développement qui ne redémarre pas

#### Solutions

1. **Vérifier les volumes**
   ```bash
   # Vérifier que les volumes sont bien montés
   docker exec -it frontend ls -la /app
   ```

2. **Redémarrer en mode dev**
   ```bash
   make dev
   ```

### Tests qui échouent

#### Symptômes
- Tests qui échouent de manière intermittente
- Timeouts dans les tests
- Erreurs de base de données

#### Solutions

1. **Nettoyer et relancer**
   ```bash
   make test-clean
   make test
   ```

2. **Tests avec plus de détails**
   ```bash
   make test --verbose
   ```

3. **Tests d'un service spécifique**
   ```bash
   make test-service SERVICE=backend
   ```

---

## 🔍 Diagnostic avancé

### Collecte d'informations

```bash
# Script de diagnostic complet
./scripts/health/check-all.sh --detailed

# Informations système
docker system info
docker-compose config
docker ps -a
docker images

# Logs de tous les services
make logs > diagnostic.log 2>&1
```

### Commandes de debugging

```bash
# Accéder à un conteneur
docker exec -it <container-name> /bin/bash

# Voir les processus dans un conteneur
docker exec -it <container-name> ps aux

# Voir les logs en temps réel
docker logs -f <container-name>

# Vérifier les ressources
docker stats
```

---

## 📞 Support

### Informations à fournir

Lorsque vous demandez de l'aide, fournissez :

1. **Version du système**
   ```bash
   docker --version
   docker-compose --version
   node --version
   ```

2. **Logs d'erreur**
   ```bash
   make logs > error.log 2>&1
   ```

3. **Configuration**
   ```bash
   docker-compose config > config.yml
   ```

4. **État des services**
   ```bash
   make ps > services.txt
   ```

### Ressources utiles

- [Documentation Docker](https://docs.docker.com/)
- [Documentation Docker Compose](https://docs.docker.com/compose/)
- [Documentation Node.js](https://nodejs.org/docs/)
- [Documentation PostgreSQL](https://www.postgresql.org/docs/)

### Contacts

- **Issues GitHub** : [GitHub Issues](https://github.com/PavelDelhomme/JobbingTrack/issues)
- **Discussions** : [GitHub Discussions](https://github.com/PavelDelhomme/JobbingTrack/discussions)
- **Email** : support@jobbingtrack.com

---

## 📚 Ressources supplémentaires

- [Guide de développement](DEVELOPMENT.md) - Développement
- [Documentation API](API.md) - APIs disponibles
- [Guide d'architecture](ARCHITECTURE.md) - Architecture
- [Scripts de santé](../scripts/health/README.md) - Scripts de diagnostic

---

[← Retour au README principal](../README.md) | [Guide de développement →](DEVELOPMENT.md)
