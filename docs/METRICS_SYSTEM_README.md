# Système de Métriques JobbingTrack

## Vue d'ensemble

Le système de métriques de JobbingTrack fournit une surveillance complète et temps réel de tous les composants de votre plateforme. Il utilise une architecture modulaire avec auto-discovery pour s'adapter automatiquement à l'ajout de nouveaux services.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│         DASHBOARD FRONTEND (React)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Metrics   │  │  Container  │  │   System    │    │
│  │    View     │  │   Monitor   │  │  Resources  │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
└─────────┼─────────────────┼─────────────────┼──────────┘
          │                 │                 │
          │    WebSocket + REST API          │
          │                 │                 │
┌─────────▼─────────────────▼─────────────────▼──────────┐
│           METRICS AGGREGATOR SERVICE (Node.js)          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Auto-Discovery Engine (détecte nouveaux services)│  │
│  └──────────────────────────────────────────────────┘  │
└─────────┬──────────────┬──────────────┬────────────────┘
          │              │              │
┌─────────▼────┐  ┌──────▼──────┐  ┌───▼──────────┐
│   cAdvisor   │  │Docker Stats │  │  Prometheus  │
│   (port 8080)│  │     API     │  │  (optionnel) │
└──────────────┘  └─────────────┘  └──────────────┘
          │              │              │
┌─────────▼──────────────▼───────────────────────────────┐
│              DOCKER CONTAINERS                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────┐ │
│  │Backend  │  │Frontend │  │Database │  │ Nouveau  │ │
│  │  API    │  │  App    │  │  (PG)   │  │ Service  │ │
│  └─────────┘  └─────────┘  └─────────┘  └──────────┘ │
└────────────────────────────────────────────────────────┘
```

## Composants

### 1. Metrics Aggregator Service (Port 3014)
- **Service principal** qui collecte et agrège toutes les métriques
- **Auto-discovery** : Détecte automatiquement les nouveaux conteneurs
- **WebSocket** : Diffuse les métriques en temps réel
- **API REST** : Fournit des endpoints pour récupérer les métriques

### 2. cAdvisor (Port 8080)
- **Monitoring des conteneurs** avec métriques détaillées
- **Intégration Docker** pour des statistiques précises
- **Métriques avancées** : CPU, mémoire, réseau, disque par conteneur

### 3. Prometheus (Port 9090) - Optionnel
- **Métriques avancées** avec stockage et requêtage
- **Alertes** et tableaux de bord personnalisés
- **Historique** des métriques sur le long terme

## Démarrage

### Démarrage complet avec métriques
```bash
# Utiliser le script de démarrage avec métriques
./scripts/start-with-metrics.sh
```

### Démarrage manuel
```bash
# Construire et démarrer tous les services
docker-compose build --parallel
docker-compose up -d

# Vérifier que tout fonctionne
./scripts/test-metrics-system.sh
```

## Utilisation

### Dashboard principal
- **URL** : http://localhost:3000/backoffice
- **Vue d'ensemble** : Métriques système, état des services
- **Connexion temps réel** : Mise à jour automatique via WebSocket

### Gestion des services
- **URL** : http://localhost:3000/backoffice/services
- **Surveillance** : État de santé de tous les services
- **Logs temps réel** : Journaux des services avec métriques
- **Tests automatiques** : Vérification périodique de la disponibilité

### APIs disponibles

#### Metrics Aggregator API
```bash
# État du service
curl http://localhost:3014/api/v1/health

# Toutes les métriques
curl http://localhost:3014/api/v1/metrics

# Services découverts
curl http://localhost:3014/api/v1/services

# Métriques d'un service spécifique
curl http://localhost:3014/api/v1/services/auth-service
```

#### cAdvisor API
```bash
# Métriques de tous les conteneurs
curl http://localhost:8080/api/v1.3/docker/

# Métriques d'un conteneur spécifique
curl http://localhost:8080/api/v1.3/docker/[container-id]
```

#### Prometheus (optionnel)
```bash
# Interface web
http://localhost:9090

# API de requête
curl http://localhost:9090/api/v1/query?query=up
```

## Métriques collectées

### Métriques système
- **CPU** : Utilisation totale et par cœur
- **Mémoire** : Utilisation, disponible, pourcentage
- **Charge système** : Charge moyenne du système
- **Disque** : Utilisation par point de montage

### Métriques par service
- **État de santé** : Online/Offline/Testing
- **Temps de réponse** : Latence des endpoints de santé
- **Version** : Version du service
- **Ressources** : Mémoire et CPU utilisés par conteneur

### Métriques réseau
- **Octets reçus/émis** : Trafic réseau par interface
- **Erreurs réseau** : Paquets d'erreur
- **Connexions** : Nombre de connexions actives

## Configuration

### Variables d'environnement

#### Metrics Aggregator Service
```bash
NODE_ENV=development
PORT=3014
FRONTEND_URL=http://localhost:3001
COLLECTION_INTERVAL=10
```

### Personnalisation

#### Ajout d'un nouveau service
1. Ajouter le service au `docker-compose.yml`
2. Ajouter la configuration dans `KNOWN_SERVICES` du Metrics Aggregator
3. Le service sera automatiquement découvert et surveillé

#### Métriques personnalisées
Les services peuvent exposer leurs propres métriques sur `/metrics` pour être scrapés par Prometheus.

## Monitoring et alertes

### Alertes automatiques
Le système peut être configuré pour envoyer des alertes en cas de :
- Service indisponible
- Utilisation CPU > 90%
- Utilisation mémoire > 85%
- Temps de réponse > 5 secondes

### Logs et débogage
```bash
# Voir les logs du Metrics Aggregator
docker-compose logs -f metrics-aggregator-service

# Voir les logs de cAdvisor
docker-compose logs -f cadvisor

# Voir tous les logs
docker-compose logs -f
```

## Dépannage

### Problèmes courants

#### Metrics Aggregator ne démarre pas
```bash
# Vérifier les logs
docker-compose logs metrics-aggregator-service

# Vérifier les ports disponibles
netstat -tuln | grep :3014
```

#### cAdvisor n'affiche pas les métriques
```bash
# Vérifier les permissions Docker
docker info

# Redémarrer cAdvisor
docker-compose restart cadvisor
```

#### WebSocket ne se connecte pas
```bash
# Vérifier la connectivité réseau
curl http://localhost:3014/api/v1/health

# Vérifier la configuration CORS
# FRONTEND_URL dans le docker-compose
```

### Tests de santé
```bash
# Lancer les tests automatiques
./scripts/test-metrics-system.sh

# Tests individuels
curl http://localhost:3014/api/v1/health
curl http://localhost:8080/api/v1.3/docker/
```

## Sécurité

- **Accès réseau** : Services accessibles uniquement via le réseau Docker interne
- **Authentification** : API Gateway gère l'authentification pour les endpoints sensibles
- **HTTPS** : En production, utiliser un reverse proxy avec SSL

## Évolution

Le système est conçu pour être **évolutif** :
- **Auto-discovery** : Nouveaux services détectés automatiquement
- **Métriques personnalisées** : Chaque service peut ajouter ses propres métriques
- **Scalabilité** : Supporte l'ajout de nouveaux nœuds de monitoring

## Support

Pour toute question ou problème :
1. Consulter les logs des services
2. Lancer les tests de diagnostic
3. Vérifier la configuration réseau et les ports
