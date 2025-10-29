# Système de Monitoring Complet - JobbingTrack

[← Retour au README principal](../README.md) | [📚 Documentation](../docs/README.md) | [🧭 Navigation](../docs/navigation.md)

📖 **[Architecture Métriques](../docs/architecture/metrics/README.md)** | **[Dépannage Métriques](../docs/architecture/metrics/troubleshooting/README.md)**

## Vue d'ensemble

Ce système de monitoring complet fournit une surveillance avancée de votre plateforme JobbingTrack avec des métriques détaillées, des visualisations et des alertes automatiques.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DASHBOARD GRAFANA                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │   Services  │  │ Conteneurs  │  │   Système   │  │ Alertes  │ │
│  │   Backend   │  │ Monitoring  │  │    Hôte     │  │          │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬───┘ │
└─────────┼─────────────────┼─────────────────┼─────────────────┼──────┘
          │                 │                 │                 │
          │    WebSocket + REST API          │                 │
          │                 │                 │                 │
┌─────────▼─────────────────▼─────────────────▼─────────────────▼────────┐
│                    PROMETHEUS (Stockage & Requêtage)                   │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  cAdvisor     Node Exporter    Blackbox Exp.    Services       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────┬─────────────┬─────────────┬─────────────┬───────────────────┘
          │             │             │             │
┌─────────▼─────────────▼─────────────▼─────────────▼─────────────────────┐
│                    SOURCES DE MÉTRIQUES                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌─────────────────┐ │
│  │ cAdvisor│  │Node Exp.│  │Blackbox │  │ Jobbing  │  │  Alertmanager   │ │
│  │ Docker  │  │Système  │  │Exporter │  │Track     │  │                 │ │
│  └─────────┘  └─────────┘  └─────────┘  └──────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## Composants

### 1. cAdvisor (Port 8080)
- **Monitoring des conteneurs** avec métriques détaillées
- **Métriques Docker** : CPU, mémoire, réseau, disque par conteneur
- **Interface web** pour visualisation temps réel

### 2. Prometheus (Port 9090)
- **Collecte et stockage** des métriques
- **Requêtage puissant** avec PromQL
- **Règles d'alertes** configurables
- **Historique** des métriques

### 3. Grafana (Port 3000)
- **Visualisation** des métriques
- **Dashboards préconfigurés** pour JobbingTrack
- **Alertes visuelles** et notifications
- **Interface moderne** et personnalisable

### 4. Node Exporter (Port 9100)
- **Métriques système** de l'hôte
- **CPU, mémoire, disque** du serveur
- **Informations réseau** et processus

### 5. Alertmanager (Port 9093)
- **Gestion des alertes** Prometheus
- **Notifications** par email, Slack, etc.
- **Groupement** et déduplication des alertes

### 6. Blackbox Exporter (Port 9115)
- **Test des endpoints HTTP**
- **Monitoring de disponibilité**
- **Tests de latence** et de statut

## Démarrage

### Démarrage rapide
```bash
# Démarrer tout le système de monitoring
cd monitoring && ./start-monitoring.sh up

# Tester que tout fonctionne
cd monitoring && ./test-monitoring.sh
```

### Démarrage manuel
```bash
cd monitoring
docker compose up -d
```

## Utilisation

### Interfaces disponibles

| Service | URL | Description |
|---------|-----|-------------|
| **cAdvisor** | http://localhost:8082 | Métriques des conteneurs Docker |
| **Prometheus** | http://localhost:9093 | Interface de requête des métriques |
| **Grafana** | http://localhost:3003 | Dashboards de visualisation (admin/admin) |
| **Alertmanager** | http://localhost:9096 | Gestion des alertes |
| **Node Exporter** | http://localhost:9101/metrics | Métriques système brutes |
| **Blackbox Exp.** | http://localhost:9118 | Tests d'endpoints |

### Commandes utiles

```bash
# Démarrer le monitoring
./monitoring/start-monitoring.sh up

# Arrêter le monitoring
./monitoring/start-monitoring.sh down

# Redémarrer le monitoring
./monitoring/start-monitoring.sh restart

# Voir les logs
./monitoring/start-monitoring.sh logs

# Voir l'état des services
./monitoring/start-monitoring.sh status

# Tester le système
./monitoring/test-monitoring.sh
```

## Métriques Collectées

### Métriques des Conteneurs (cAdvisor)
- **CPU** : Utilisation par cœur, pourcentage total
- **Mémoire** : Utilisation, limite, cache, RSS
- **Réseau** : Octets RX/TX, erreurs, paquets
- **Système de fichiers** : Utilisation disque par point de montage
- **Processus** : Nombre de processus, threads

### Métriques Système (Node Exporter)
- **CPU** : Utilisation, fréquence, température
- **Mémoire** : RAM totale, utilisée, disponible, swap
- **Disque** : Espace utilisé, I/O, latence
- **Réseau** : Interfaces, trafic, erreurs
- **Système** : Load average, uptime, nombre de processus

### Métriques d'Application (Prometheus)
- **Disponibilité** : Services up/down
- **Performance** : Latence des endpoints
- **Erreurs** : Taux d'erreur HTTP
- **Ressources** : Métriques personnalisées des services

## Dashboards Grafana

### Dashboard "JobbingTrack - Overview Complet"
- **État des services** backend
- **Utilisation CPU** par service
- **Utilisation mémoire** par service
- **Trafic réseau** RX/TX
- **Métriques système** (CPU, mémoire)
- **Disponibilité** des endpoints
- **Temps de réponse** HTTP

### Configuration
- **Datasources** : Prometheus, cAdvisor, Node Exporter
- **Refresh** : 30 secondes
- **Thème** : Sombre
- **Alertes** : Intégrées avec Alertmanager

## Alertes

### Alertes configurées
- **Services arrêtés** (> 1 minute)
- **CPU élevé** (> 80% pendant 5 minutes)
- **Mémoire élevée** (> 85% pendant 5 minutes)
- **Conteneurs problématiques** (CPU/mémoire élevés)
- **Endpoints inaccessibles** (> 2 minutes)

### Notifications
- **Email** : Configuré pour `admin@jobbingtrack.com`
- **Groupement** : Par nom d'alerte et instance
- **Délai de répétition** : 1 heure

## Intégration avec JobbingTrack

### Services surveillés
- **API Gateway** (port 3000)
- **Tous les services backend** (ports 3001-3015)
- **Frontend** (port 3000)
- **PostgreSQL** (via postgres-exporter)
- **Redis** (via redis-exporter)

### Métriques personnalisées
Les services backend peuvent exposer leurs propres métriques sur `/metrics` pour être scrapés par Prometheus.

## Configuration Avancée

### Ajouter de nouveaux services
1. Ajouter le service au `scrape_configs` de Prometheus
2. Créer des règles d'alertes si nécessaire
3. Mettre à jour les dashboards Grafana

### Personnaliser les alertes
1. Modifier `prometheus/alerts.yml`
2. Configurer les notifications dans `alertmanager/alertmanager.yml`
3. Tester avec `curl http://localhost:9090/api/v1/rules`

### Créer de nouveaux dashboards
1. Importer un dashboard JSON dans Grafana
2. Configurer les datasources appropriées
3. Ajouter aux `grafana/dashboards/`

## Dépannage

### Problèmes courants

#### cAdvisor ne démarre pas
```bash
# Vérifier les privilèges
docker run --rm -v /:/rootfs:ro gcr.io/cadvisor/cadvisor:v0.47.2 --help

# Démarrer avec plus de privilèges si nécessaire
docker run --privileged -v /:/rootfs:ro gcr.io/cadvisor/cadvisor:v0.47.2
```

#### Prometheus ne trouve pas les métriques
```bash
# Vérifier les targets
curl http://localhost:9090/api/v1/targets

# Vérifier la configuration
curl http://localhost:9090/api/v1/status/config
```

#### Grafana ne se connecte pas à Prometheus
```bash
# Tester la connexion
curl http://prometheus:9090/api/v1/query?query=up

# Vérifier les datasources dans Grafana
# Aller dans Configuration > Data Sources
```

### Tests de santé
```bash
# Tester tous les services
./monitoring/test-monitoring.sh

# Tester un service spécifique
curl http://localhost:8080/api/v1.3/docker/
curl http://localhost:9090/-/healthy
curl http://localhost:3000/api/health
```

## Sécurité

- **Accès réseau** : Services accessibles uniquement via le réseau Docker interne
- **Authentification** : Grafana protégé par mot de passe
- **HTTPS** : En production, utiliser un reverse proxy avec SSL
- **Privilèges** : cAdvisor nécessite des privilèges spéciaux pour accéder aux informations système

## Évolution

Le système est conçu pour être **évolutif** :
- **Nouveaux exporters** peuvent être ajoutés facilement
- **Dashboards personnalisés** pour des métriques spécifiques
- **Alertes avancées** avec templates et routage
- **Intégration** avec d'autres outils de monitoring

## Support

Pour toute question ou problème :
1. Consulter les logs : `./monitoring/start-monitoring.sh logs`
2. Tester le système : `./monitoring/test-monitoring.sh`
3. Vérifier les configurations dans chaque dossier
4. Consulter la documentation Prometheus/Grafana officielle
