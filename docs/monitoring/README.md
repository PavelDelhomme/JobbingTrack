# 📊 Système de Monitoring Complet - JobbingTrack

[← Retour à la documentation](../README.md) | [← README principal](../../README.md) | [🧭 Navigation](../navigation.md)

📖 **[Architecture Métriques](../architecture/metrics/README.md)** | **[Dépannage Métriques](../architecture/metrics/troubleshooting/README.md)**

## 🎯 Vue d'ensemble

Système de monitoring complet pour JobbingTrack avec surveillance avancée des métriques, logs et alertes en temps réel.

## 🏗️ Architecture

### Stack de monitoring

```
┌─────────────────────────────────────────────────────────────────┐
│                    Machine Host Docker                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Backend  │  │ Frontend │  │ Postgres │  │ Redis    │       │
│  │ Services │  │ Service  │  │ Service  │  │ Service  │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │              │              │              │
│       └─────────────┴──────────────┴──────────────┘              │
│                       │                                           │
│         ┌─────────────▼──────────────┐                           │
│         │  cAdvisor + Promtail       │ ← Collecte                │
│         └─────────────┬──────────────┘                           │
│                       │                                           │
│         ┌─────────────▼──────────────┐                           │
│         │  Prometheus + Loki         │ ← Stockage                │
│         │  (90j métriques, 30j logs) │                           │
│         └─────────────┬──────────────┘                           │
│                       │                                           │
│         ┌─────────────▼──────────────┐                           │
│         │  Metrics Aggregator API    │ ← API Sécurisée           │
│         │  (JWT + API Key)           │                           │
│         └─────────────┬──────────────┘                           │
│                       │                                           │
│         ┌─────────────▼──────────────┐                           │
│         │  Dashboard Frontend        │ ← Interface               │
│         │  Grafana (optionnel)       │                           │
│         └────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Services

| Service | Port | Description | Accès |
|---------|------|-------------|-------|
| **cAdvisor** | 8081 | Collecte métriques conteneurs | http://localhost:8081 |
| **Prometheus** | 9090 | Stockage métriques time-series | http://localhost:9090 |
| **Loki** | 3100 | Agrégation logs | http://localhost:3100 |
| **Grafana** | 8083 | Visualisation et dashboards | http://localhost:8083 |
| **Alertmanager** | 8085 | Gestion alertes | http://localhost:8085 |
| **Metrics Aggregator** | 3014 | API métriques centralisée | http://localhost:3014 |

## 📦 Configuration

### docker-compose.yml

```yaml
# Monitoring Stack
cadvisor:
  image: gcr.io/cadvisor/cadvisor:latest
  container_name: jobbingtrack-cadvisor
  ports:
    - "8081:8080"
  volumes:
    - /:/rootfs:ro
    - /var/run:/var/run:ro
    - /sys:/sys:ro
    - /var/lib/docker/:/var/lib/docker:ro
    - /dev/disk/:/dev/disk:ro
  privileged: true

prometheus:
  image: prom/prometheus:latest
  container_name: jobbingtrack-prometheus
  ports:
    - "9090:9090"
  volumes:
    - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    - prometheus_data:/prometheus
  command:
    - '--config.file=/etc/prometheus/prometheus.yml'
    - '--storage.tsdb.retention.time=90d'

loki:
  image: grafana/loki:latest
  container_name: jobbingtrack-loki
  ports:
    - "3100:3100"
  volumes:
    - ./monitoring/loki/loki-config.yml:/etc/loki/local-config.yaml
    - loki_data:/loki

grafana:
  image: grafana/grafana:latest
  container_name: jobbingtrack-grafana
  ports:
    - "8083:3000"
  environment:
    - GF_SECURITY_ADMIN_USER=admin
    - GF_SECURITY_ADMIN_PASSWORD=admin
    - GF_INSTALL_PLUGINS=grafana-clock-panel
  volumes:
    - grafana_data:/var/lib/grafana
    - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
    - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
```

## 🔍 Métriques collectées

### Métriques système
- **CPU** : Utilisation par conteneur et globale
- **Mémoire** : RAM utilisée, limite, pourcentage
- **Réseau** : Trafic entrant/sortant, paquets
- **Disque** : I/O, espace utilisé

### Métriques applicatives
- **Requêtes HTTP** : Nombre, latence, codes status
- **Base de données** : Connexions, requêtes, latence
- **Queues** : Taille, messages traités
- **Services** : Santé, uptime, erreurs

### Métriques business
- **Utilisateurs** : Actifs, connexions
- **Candidatures** : Créées, mises à jour
- **Notifications** : Envoyées, taux de succès

## 📊 Dashboards Grafana

### Dashboard Principal
- Vue d'ensemble système
- Statut de tous les services
- Alertes actives
- Graphiques temps réel

### Dashboard Services
- Métriques par microservice
- Logs en temps réel
- Traces distribuées
- Dépendances inter-services

### Dashboard Infrastructure
- Ressources Docker host
- Conteneurs actifs
- Réseau et volumes
- Performances I/O

## 🚨 Alertes

### Configuration Alertmanager

```yaml
# monitoring/alertmanager/config.yml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'

receivers:
  - name: 'default'
    email_configs:
      - to: 'admin@jobbingtrack.test'
        from: 'alerts@jobbingtrack.test'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/xxx'
        channel: '#alerts'
```

### Règles d'alerte

```yaml
# monitoring/prometheus/alerts.yml
groups:
  - name: services
    interval: 30s
    rules:
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} est DOWN"
          
      - alert: HighCPU
        expr: container_cpu_usage_seconds_total > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CPU élevé sur {{ $labels.name }}"
          
      - alert: HighMemory
        expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Mémoire élevée sur {{ $labels.name }}"
```

## 🔧 Démarrage

### Démarrage complet

```bash
# Via Makefile
make up-monitoring          # Démarrer stack monitoring
make monitoring-status      # Vérifier statut
make monitoring-logs        # Voir les logs
```

### Démarrage manuel

```bash
# Démarrer tous les services monitoring
docker-compose up -d cadvisor prometheus loki grafana alertmanager

# Vérifier
docker-compose ps | grep -E "(cadvisor|prometheus|loki|grafana|alert)"
```

## 📖 Accès aux interfaces

| Service | URL | Credentials |
|---------|-----|-------------|
| **cAdvisor** | http://localhost:8081 | - |
| **Prometheus** | http://localhost:9090 | - |
| **Grafana** | http://localhost:8083 | admin / admin |
| **Alertmanager** | http://localhost:8085 | - |
| **API Métriques** | http://localhost:3014/api/v1/metrics | JWT requis |

## 🔐 Sécurité

### API Métriques
- **Authentification JWT** obligatoire
- **Rate limiting** : 1000 req/15min
- **CORS** configuré pour frontend uniquement
- **HTTPS** en production

### Grafana
- Changer mot de passe admin
- Configurer OAuth si nécessaire
- Activer authentification LDAP/AD
- Restreindre accès par IP

### Prometheus
- Authentification basique en production
- Restreindre accès réseau
- Chiffrement mTLS entre composants

## 📊 Requêtes PromQL utiles

### CPU par conteneur
```promql
rate(container_cpu_usage_seconds_total{name=~"jobbingtrack-.*"}[5m]) * 100
```

### Mémoire par conteneur
```promql
container_memory_usage_bytes{name=~"jobbingtrack-.*"} / 1024 / 1024
```

### Requêtes HTTP par seconde
```promql
rate(http_requests_total[5m])
```

### Latence médiane API
```promql
histogram_quantile(0.5, rate(http_request_duration_seconds_bucket[5m]))
```

## 🐛 Dépannage

### Problèmes courants

**Prometheus ne scrape pas les métriques**
```bash
# Vérifier configuration
docker exec jobbingtrack-prometheus cat /etc/prometheus/prometheus.yml

# Vérifier targets
curl http://localhost:9090/api/v1/targets
```

**Grafana ne se connecte pas à Prometheus**
```bash
# Vérifier datasource
docker exec jobbingtrack-grafana grafana-cli admin reset-admin-password admin
```

**cAdvisor n'affiche pas les conteneurs**
```bash
# Vérifier permissions
docker logs jobbingtrack-cadvisor
```

## 📚 Ressources

- **[Architecture Métriques](../architecture/metrics/README.md)** - Système de collecte détaillé
- **[Dépannage Métriques](../architecture/metrics/troubleshooting/README.md)** - Guide de résolution
- **[Backend Monitoring](../../backend/monitoring/README.md)** - Configuration backend
- **[Guide Administration](../administration/README.md)** - Administration système

## 🔄 Maintenance

### Rétention des données
- **Prometheus** : 90 jours (configurable)
- **Loki** : 30 jours (configurable)
- **Grafana** : Illimité (dashboards et config)

### Backup
```bash
# Backup Prometheus
docker exec jobbingtrack-prometheus tar czf /tmp/prometheus-backup.tar.gz /prometheus

# Backup Grafana
docker exec jobbingtrack-grafana tar czf /tmp/grafana-backup.tar.gz /var/lib/grafana
```

### Mise à jour
```bash
# Mise à jour des images
docker-compose pull cadvisor prometheus loki grafana alertmanager
docker-compose up -d --force-recreate cadvisor prometheus loki grafana alertmanager
```

---

**Version**: 4.1  
**Dernière mise à jour**: Octobre 2025
