#!/bin/bash

# ============================================================================
# Configuration du Monitoring de Sécurité - JobbingTrack
# ============================================================================
# Ce script configure un système de monitoring avancé pour surveiller
# les métriques de sécurité, les attaques et les performances système

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables de configuration
MONITORING_DIR="/opt/jobbingtrack-monitoring"
PROMETHEUS_VERSION="2.45.0"
GRAFANA_VERSION="10.0.3"
NODE_EXPORTER_VERSION="1.6.1"
COMPOSE_FILE="$MONITORING_DIR/docker-compose.monitoring.yml"

# Fonction de logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

# Vérification des privilèges root
if [[ $EUID -ne 0 ]]; then
   error "Ce script doit être exécuté en tant que root"
   exit 1
fi

log "🔍 Configuration du monitoring de sécurité avancé pour JobbingTrack"

# ============================================================================
# CRÉATION DU RÉPERTOIRE DE MONITORING
# ============================================================================

log "Création du répertoire de monitoring..."
mkdir -p "$MONITORING_DIR"/{prometheus,grafana,node-exporter,alerts,dashboards}

# ============================================================================
# CONFIGURATION PROMETHEUS
# ============================================================================

log "Configuration de Prometheus..."

cat > "$MONITORING_DIR/prometheus/prometheus.yml" << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  # Métriques système (Node Exporter)
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  # Métriques Docker
  - job_name: 'docker'
    static_configs:
      - targets: ['docker.sock:9323']

  # Métriques des services JobbingTrack
  - job_name: 'jobbingtrack-services'
    static_configs:
      - targets:
          - 'api-gateway:3000'
          - 'auth-service:3001'
          - 'application-service:3002'
          - 'company-service:3003'
          - 'contact-service:3004'
          - 'interview-service:3005'
          - 'notification-service:3006'
          - 'dashboard-service:3007'
          - 'call-service:3008'
          - 'profile-service:3009'
          - 'event-service:3011'
          - 'followup-service:3012'
          - 'workflow-service:3013'
    scrape_interval: 30s
    metrics_path: '/metrics'
    params:
      format: ['prometheus']

  # Métriques Nginx (si disponible)
  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx-proxy:80']
    scrape_interval: 30s

  # Métriques de sécurité personnalisées
  - job_name: 'security-metrics'
    static_configs:
      - targets: ['api-gateway:3000']
    scrape_interval: 10s
    metrics_path: '/api/v1/monitoring/security'
    params:
      format: ['prometheus']

  # Métriques utilisateur (application mobile)
  - job_name: 'user-metrics'
    static_configs:
      - targets: ['localhost:9464']
    scrape_interval: 15s
    metrics_path: '/api/v1/monitoring/users'
    params:
      format: ['json']

  # Métriques de performance
  - job_name: 'performance-metrics'
    static_configs:
      - targets: ['api-gateway:3000']
    scrape_interval: 30s
    metrics_path: '/api/v1/monitoring/performance'

# Configuration du stockage
storage:
  tsdb:
    path: /prometheus
    retention.time: 30d
    retention.size: 10GB

# Configuration externe
external_labels:
  monitor: 'jobbingtrack-monitor'
EOF

# ============================================================================
# RÈGLES D'ALERTES DE SÉCURITÉ
# ============================================================================

log "Configuration des règles d'alertes de sécurité..."

mkdir -p "$MONITORING_DIR/alerts"

cat > "$MONITORING_DIR/alerts/security_alerts.yml" << 'EOF'
groups:
  - name: security.alerts
    interval: 30s
    rules:

    # Alertes de taux d'attaques élevées
    - alert: HighAttackRate
      expr: rate(security_attacks_total[5m]) > 10
      for: 2m
      labels:
        severity: critical
        service: security
      annotations:
        summary: "Taux d'attaques élevé détecté"
        description: "Plus de {{ $value }} attaques par seconde détectées dans les 5 dernières minutes"

    # Alertes de tentatives d'intrusion
    - alert: IntrusionAttempts
      expr: increase(intrusion_attempts_total[10m]) > 50
      for: 1m
      labels:
        severity: high
        service: security
      annotations:
        summary: "Tentatives d'intrusion multiples"
        description: "{{ $value }} tentatives d'intrusion détectées dans les 10 dernières minutes"

    # Alertes de connexions échouées
    - alert: HighFailedAuthRate
      expr: rate(failed_authentications_total[5m]) > 20
      for: 3m
      labels:
        severity: warning
        service: auth
      annotations:
        summary: "Taux élevé d'échecs d'authentification"
        description: "Plus de {{ $value }} échecs d'authentification par seconde"

    # Alertes de dépassement de rate limiting
    - alert: RateLimitExceeded
      expr: rate(rate_limit_hits_total[5m]) > 100
      for: 2m
      labels:
        severity: warning
        service: security
      annotations:
        summary: "Dépassements de rate limiting fréquents"
        description: "Plus de {{ $value }} hits de rate limiting par seconde"

    # Alertes de détection WAF
    - alert: WAFBlocks
      expr: increase(waf_blocks_total[10m]) > 100
      for: 1m
      labels:
        severity: warning
        service: security
      annotations:
        summary: "Nombre élevé de blocages WAF"
        description: "{{ $value }} blocages WAF détectés dans les 10 dernières minutes"

    # Alertes de performances système
    - alert: HighCPUUsage
      expr: 100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
      for: 5m
      labels:
        severity: warning
        service: system
      annotations:
        summary: "Utilisation CPU élevée"
        description: "Utilisation CPU supérieure à 80% depuis 5 minutes"

    - alert: HighMemoryUsage
      expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
      for: 3m
      labels:
        severity: warning
        service: system
      annotations:
        summary: "Utilisation mémoire élevée"
        description: "Utilisation mémoire supérieure à 85% depuis 3 minutes"

    # Alertes de sécurité réseau
    - alert: SuspiciousNetworkActivity
      expr: rate(suspicious_connections_total[5m]) > 50
      for: 2m
      labels:
        severity: high
        service: network
      annotations:
        summary: "Activité réseau suspecte"
        description: "Plus de {{ $value }} connexions suspectes par seconde"

    # Alertes de services indisponibles
    - alert: ServiceDown
      expr: up{job="jobbingtrack-services"} == 0
      for: 1m
      labels:
        severity: critical
        service: "{{ $labels.instance }}"
      annotations:
        summary: "Service indisponible"
        description: "Le service {{ $labels.instance }} est indisponible depuis 1 minute"
EOF

# ============================================================================
# CONFIGURATION GRAFANA
# ============================================================================

log "Configuration de Grafana..."

cat > "$MONITORING_DIR/grafana/grafana.ini" << 'EOF'
[server]
http_port = 3001
root_url = %(protocol)s://%(domain)s:%(http_port)s/
serve_from_sub_path = true

[database]
type = sqlite3
path = /var/lib/grafana/grafana.db

[session]
provider = file
provider_config = sessions

[analytics]
check_for_updates = false
reporting_enabled = false

[security]
admin_user = admin
admin_password = jobbingtrack-grafana-2025
allow_embedding = false
disable_gravatar = true

[users]
allow_sign_up = false
allow_org_create = false
auto_assign_org = true
auto_assign_org_role = Viewer

[auth.anonymous]
enabled = false

[smtp]
enabled = true
host = smtp.ovh.net:587
user = candidatures@example.invalid
password = V**Uw61^3*bz5c2AFrx&2d&%
from_address = JobbingTrack Monitoring <monitoring@example.invalid>
from_name = Grafana

[alerting]
enabled = true
execute_alerts = true

[metrics]
enabled = true
EOF

# ============================================================================
# DASHBOARDS GRAFANA PRÉCONFIGURÉS
# ============================================================================

log "Création des dashboards Grafana..."

# Dashboard de sécurité
cat > "$MONITORING_DIR/dashboards/security_overview.json" << 'EOF'
{
  "dashboard": {
    "title": "Sécurité - Vue d'ensemble",
    "tags": ["security", "jobbingtrack"],
    "timezone": "browser",
    "panels": [
      {
        "title": "Taux d'attaques (5min)",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(security_attacks_total[5m])",
            "legendFormat": "Attaques/sec"
          }
        ]
      },
      {
        "title": "Tentatives d'intrusion",
        "type": "stat",
        "targets": [
          {
            "expr": "increase(intrusion_attempts_total[1h])",
            "legendFormat": "Tentatives (1h)"
          }
        ]
      },
      {
        "title": "Échecs d'authentification",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(failed_authentications_total[5m])",
            "legendFormat": "Échecs/sec"
          }
        ]
      },
      {
        "title": "Hits de rate limiting",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(rate_limit_hits_total[5m])",
            "legendFormat": "Hits/sec"
          }
        ]
      }
    ],
    "time": {
      "from": "now-6h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
EOF

# ============================================================================
# CONFIGURATION DOCKER COMPOSE POUR LE MONITORING
# ============================================================================

log "Création du fichier Docker Compose pour le monitoring..."

cat > "$COMPOSE_FILE" << EOF
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:v$PROMETHEUS_VERSION
    container_name: jobbingtrack-prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    networks:
      - jobbingtrack-monitoring
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    read_only: true

  grafana:
    image: grafana/grafana:$GRAFANA_VERSION
    container_name: jobbingtrack-grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=jobbingtrack-grafana-2025
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_INSTALL_PLUGINS=grafana-piechart-panel,grafana-worldmap-panel
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/grafana.ini:/etc/grafana/grafana.ini:ro
      - ./dashboards:/var/lib/grafana/dashboards:ro
    networks:
      - jobbingtrack-monitoring
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    read_only: true

  node-exporter:
    image: prom/node-exporter:v$NODE_EXPORTER_VERSION
    container_name: jobbingtrack-node-exporter
    command:
      - '--path.rootfs=/host'
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    networks:
      - jobbingtrack-monitoring
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    read_only: true

  alertmanager:
    image: prom/alertmanager:v0.25.0
    container_name: jobbingtrack-alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    ports:
      - "9093:9093"
    volumes:
      - ./alerts/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - alertmanager_data:/alertmanager
    networks:
      - jobbingtrack-monitoring
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    read_only: true

volumes:
  prometheus_data:
    driver: local
  grafana_data:
    driver: local
  alertmanager_data:
    driver: local

networks:
  jobbingtrack-monitoring:
    driver: bridge
    name: jobbingtrack-monitoring-network
EOF

# ============================================================================
# CONFIGURATION DOCKER COMPOSE POUR LES MÉTRIQUES DE SÉCURITÉ
# ============================================================================

log "Configuration des métriques de sécurité dans les services..."

# Ajouter les métriques de sécurité à l'API Gateway (exemple)
cat >> "$MONITORING_DIR/../production/docker-compose.production.yml" << 'EOF'

  # Service de métriques de sécurité
  security-metrics:
    image: node:18-alpine
    container_name: jobbingtrack-security-metrics
    command: sh -c "npm install express prom-client && node /app/metrics-server.js"
    volumes:
      - ./scripts/security/metrics-server.js:/app/metrics-server.js:ro
    ports:
      - "9464:9464"
    networks:
      - jobbingtrack-network
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    read_only: true
EOF

# ============================================================================
# DÉMARRAGE DU SYSTÈME DE MONITORING
# ============================================================================

log "Démarrage du système de monitoring..."

cd "$MONITORING_DIR"
docker-compose -f docker-compose.monitoring.yml up -d

# Attendre que les services démarrent
sleep 30

# Vérification que les services sont démarrés
if docker-compose -f docker-compose.monitoring.yml ps | grep -q "Up"; then
    success "Système de monitoring démarré avec succès"
else
    error "Erreur lors du démarrage du monitoring"
    exit 1
fi

# ============================================================================
# CONFIGURATION DES DASHBOARDS GRAFANA
# ============================================================================

log "Configuration des dashboards Grafana..."

# Attendre que Grafana soit prêt
sleep 20

# Création d'une datasource Prometheus dans Grafana (via API)
curl -X POST \
  http://admin:jobbingtrack-grafana-2025@localhost:3001/api/datasources \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Prometheus",
    "type": "prometheus",
    "url": "http://prometheus:9090",
    "access": "proxy",
    "isDefault": true
  }' || warning "Impossible de configurer automatiquement la datasource Grafana"

# ============================================================================
# RÉSUMÉ ET INSTRUCTIONS
# ============================================================================

echo ""
echo "🔍 Monitoring de sécurité configuré avec succès !"
echo ""
echo "📊 Services disponibles :"
echo "   • Prometheus : http://localhost:9090"
echo "   • Grafana : http://localhost:3001 (admin/jobbingtrack-grafana-2025)"
echo "   • Node Exporter : http://localhost:9100"
echo "   • Alertmanager : http://localhost:9093"
echo ""
echo "📈 Métriques surveillées :"
echo "   • Taux d'attaques et tentatives d'intrusion"
echo "   • Échecs d'authentification"
echo "   • Dépassements de rate limiting"
echo "   • Blocages WAF"
echo "   • Utilisation système (CPU, mémoire, disque)"
echo "   • Disponibilité des services"
echo ""
echo "🚨 Alertes configurées :"
echo "   • Taux d'attaques élevé (>10/sec)"
echo "   • Tentatives d'intrusion multiples (>50/10min)"
echo "   • Échecs d'authentification (>20/sec)"
echo "   • Utilisation CPU élevée (>80%)"
echo "   • Utilisation mémoire élevée (>85%)"
echo ""
echo "📋 Commandes utiles :"
echo "   • Arrêter le monitoring : cd $MONITORING_DIR && docker-compose down"
echo "   • Voir les logs : docker-compose logs -f prometheus"
echo "   • Redémarrer : docker-compose restart"
echo "   • Mettre à jour : docker-compose pull && docker-compose up -d"
echo ""
echo "🔧 Maintenance :"
echo "   • Sauvegarder les données : docker run --volumes-from jobbingtrack_grafana_1 -v \$(pwd):/backup alpine tar czf /backup/grafana-backup.tar.gz /var/lib/grafana"
echo "   • Restaurer : docker run --volumes-from jobbingtrack_grafana_1 -v \$(pwd):/backup alpine sh -c 'cd / && tar xzf /backup/grafana-backup.tar.gz'"
echo ""

success "Configuration du monitoring de sécurité terminée !"

# ============================================================================
# RAPPORT FINAL
# ============================================================================

cat > "$MONITORING_DIR/README.md" << 'EOF'
# Monitoring de Sécurité - JobbingTrack

## Vue d'ensemble
Ce système de monitoring surveille en temps réel la sécurité et les performances de l'infrastructure JobbingTrack.

## Services

### Prometheus
- **Port** : 9090
- **Fonction** : Collecte et stockage des métriques
- **Métriques clés** :
  - `security_attacks_total` : Nombre total d'attaques détectées
  - `intrusion_attempts_total` : Tentatives d'intrusion
  - `rate_limit_hits_total` : Hits de rate limiting
  - `waf_blocks_total` : Blocages WAF

### Grafana
- **Port** : 3001
- **Identifiants** : admin / jobbingtrack-grafana-2025
- **Dashboards disponibles** :
  - Sécurité - Vue d'ensemble
  - Performances système
  - Disponibilité des services

### Node Exporter
- **Port** : 9100
- **Fonction** : Métriques système (CPU, mémoire, disque, réseau)

### Alertmanager
- **Port** : 9093
- **Fonction** : Gestion et notification des alertes

## Métriques de sécurité personnalisées

Les services JobbingTrack exposent des métriques de sécurité via `/metrics` :
- Nombre d'attaques détectées
- Tentatives d'intrusion
- Échecs d'authentification
- Blocages WAF
- Hits de rate limiting

## Alertes configurées

### Niveau CRITIQUE
- Taux d'attaques > 10/sec pendant 2min
- Service indisponible pendant 1min

### Niveau HAUT
- Tentatives d'intrusion > 50 en 10min
- Activité réseau suspecte > 50/sec

### Niveau WARNING
- Échecs d'authentification > 20/sec
- Rate limiting > 100 hits/sec
- CPU > 80% pendant 5min
- Mémoire > 85% pendant 3min

## Utilisation

1. Accéder à Grafana : http://localhost:3001
2. Consulter les métriques : http://localhost:9090
3. Voir les alertes actives : http://localhost:9093
4. Surveiller le système : http://localhost:9100

## Maintenance

- Les données sont conservées pendant 30 jours
- Sauvegardes automatiques des dashboards
- Logs disponibles via `docker-compose logs`
- Métriques exportables au format Prometheus
EOF

success "Documentation créée : $MONITORING_DIR/README.md"

log "Configuration du monitoring de sécurité terminée avec succès !"
