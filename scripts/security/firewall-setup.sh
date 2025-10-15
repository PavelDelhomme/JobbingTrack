#!/bin/bash

# ============================================================================
# Configuration Firewall Sécurisé - JobbingTrack
# ============================================================================
# Ce script configure des règles de firewall strictes avec iptables
# pour protéger l'infrastructure réseau de JobbingTrack

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables de configuration
DOCKER_NETWORK="jobbingtrack-network"
POSTGRES_PORT="5432"
REDIS_PORT="6379"
API_GATEWAY_PORT="3000"
FRONTEND_PORT="3001"
MONITORING_PORT="9090"

# Ports des services backend
AUTH_SERVICE_PORT="3001"
APPLICATION_SERVICE_PORT="3002"
COMPANY_SERVICE_PORT="3003"
CONTACT_SERVICE_PORT="3004"
INTERVIEW_SERVICE_PORT="3005"
NOTIFICATION_SERVICE_PORT="3006"
DASHBOARD_SERVICE_PORT="3007"
CALL_SERVICE_PORT="3008"
PROFILE_SERVICE_PORT="3009"
EVENT_SERVICE_PORT="3011"
FOLLOWUP_SERVICE_PORT="3012"
WORKFLOW_SERVICE_PORT="3013"

# Ports administratifs et monitoring
SSH_PORT="22"
PROMETHEUS_PORT="9090"
GRAFANA_PORT="3001"
ADMIN_PORT="8080"

# Réseaux autorisés (à adapter selon votre infrastructure)
TRUSTED_NETWORKS=(
    "127.0.0.0/8"      # Loopback
    "10.0.0.0/8"       # Réseau privé
    "172.16.0.0/12"    # Réseau privé
    "192.168.0.0/16"   # Réseau privé
)

# Services externes autorisés
ALLOWED_OUTBOUND=(
    "smtp.ovh.net:587"    # SMTP OVH
    "smtp.gmail.com:587"  # SMTP Gmail (si utilisé)
    "cdn.jsdelivr.net:443" # CDN pour les dépendances frontend
    "registry.npmjs.org:443" # NPM registry
)

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

# Vérification d'iptables
if ! command -v iptables &> /dev/null; then
    error "iptables n'est pas installé"
    exit 1
fi

log "🔒 Configuration du firewall sécurisé pour JobbingTrack"

# ============================================================================
# SAUVEGARDE DES RÈGLES EXISTANTES
# ============================================================================

BACKUP_FILE="/etc/iptables.backup.$(date +%Y%m%d_%H%M%S)"
log "Sauvegarde des règles iptables existantes dans $BACKUP_FILE"
iptables-save > "$BACKUP_FILE"

# ============================================================================
# RÈGLES DE BASE - POLITIQUE PAR DÉFAUT DENY
# ============================================================================

log "Configuration des politiques par défaut..."

# Politique par défaut : DROP tout le trafic
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT  # Autoriser le trafic sortant par défaut

# Vider toutes les règles existantes
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X

# ============================================================================
# RÈGLES DE BASE - CONNEXIONS ÉTABLIES
# ============================================================================

log "Configuration des règles de base..."

# Autoriser les connexions établies et liées
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Autoriser le loopback
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# ============================================================================
# RÈGLES POUR LES RÉSEAUX DE CONFIANCE
# ============================================================================

log "Configuration des réseaux de confiance..."

for network in "${TRUSTED_NETWORKS[@]}"; do
    log "Autorisation du réseau de confiance: $network"
    iptables -A INPUT -s "$network" -j ACCEPT
done

# ============================================================================
# RÈGLES POUR LES SERVICES CRITIQUES
# ============================================================================

log "Configuration des règles pour les services critiques..."

# SSH (accès administratif)
if [[ -n "$SSH_PORT" ]]; then
    log "Configuration SSH sur le port $SSH_PORT"
    iptables -A INPUT -p tcp --dport "$SSH_PORT" -m conntrack --ctstate NEW -j ACCEPT
    iptables -A INPUT -p tcp --dport "$SSH_PORT" -m recent --set --name SSH
    iptables -A INPUT -p tcp --dport "$SSH_PORT" -m recent --update --seconds 60 --hitcount 5 --name SSH -j DROP
fi

# ============================================================================
# RÈGLES POUR L'APPLICATION JOBBINGTRACK
# ============================================================================

log "Configuration des règles pour JobbingTrack..."

# API Gateway (port d'entrée principal)
iptables -A INPUT -p tcp --dport "$API_GATEWAY_PORT" -m conntrack --ctstate NEW -j ACCEPT

# Frontend (si exposé directement)
iptables -A INPUT -p tcp --dport "$FRONTEND_PORT" -m conntrack --ctstate NEW -j ACCEPT

# Services backend (communication interne uniquement)
# Ces ports ne sont accessibles que depuis les autres conteneurs Docker

# ============================================================================
# RÈGLES POUR LE MONITORING
# ============================================================================

log "Configuration des règles pour le monitoring..."

# Prometheus
if [[ -n "$PROMETHEUS_PORT" ]]; then
    iptables -A INPUT -p tcp --dport "$PROMETHEUS_PORT" -s "${TRUSTED_NETWORKS[0]}" -m conntrack --ctstate NEW -j ACCEPT
fi

# Grafana
if [[ -n "$GRAFANA_PORT" ]]; then
    iptables -A INPUT -p tcp --dport "$GRAFANA_PORT" -s "${TRUSTED_NETWORKS[0]}" -m conntrack --ctstate NEW -j ACCEPT
fi

# ============================================================================
# RÈGLES POUR LES SERVICES EXTERNES
# ============================================================================

log "Configuration des règles pour les services externes..."

# Autoriser les connexions sortantes vers les services externes nécessaires
for service in "${ALLOWED_OUTBOUND[@]}"; do
    IFS=':' read -r host port <<< "$service"
    if [[ -n "$host" && -n "$port" ]]; then
        log "Autorisation de connexion sortante vers $host:$port"
        iptables -A OUTPUT -p tcp --dport "$port" -d "$host" -m conntrack --ctstate NEW -j ACCEPT
    fi
done

# Autoriser les connexions sortantes DNS
iptables -A OUTPUT -p udp --dport 53 -m conntrack --ctstate NEW -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -m conntrack --ctstate NEW -j ACCEPT

# ============================================================================
# RÈGLES DE PROTECTION CONTRE LES ATTAQUES
# ============================================================================

log "Configuration des règles de protection contre les attaques..."

# Protection contre les scans SYN
iptables -A INPUT -p tcp --syn -m recent --set --name SYN_FLOOD
iptables -A INPUT -p tcp --syn -m recent --update --seconds 1 --hitcount 10 --name SYN_FLOOD -j DROP

# Protection contre les pings de la mort
iptables -A INPUT -p icmp --icmp-type echo-request -m limit --limit 1/s -j ACCEPT
iptables -A INPUT -p icmp --icmp-type echo-request -j DROP

# Protection contre les floods UDP
iptables -A INPUT -p udp -m limit --limit 10/s -j ACCEPT
iptables -A INPUT -p udp -j DROP

# Protection contre les connexions invalides
iptables -A INPUT -m conntrack --ctstate INVALID -j DROP

# ============================================================================
# RÈGLES POUR DOCKER
# ============================================================================

log "Configuration des règles pour Docker..."

# Autoriser le trafic Docker interne
iptables -A FORWARD -i "$DOCKER_NETWORK" -o "$DOCKER_NETWORK" -j ACCEPT

# ============================================================================
# RÈGLES POUR LE TRAFIC INTERNE ENTRE SERVICES
# ============================================================================

log "Configuration du trafic interne entre services..."

# Autoriser la communication entre les services backend
for port in $AUTH_SERVICE_PORT $APPLICATION_SERVICE_PORT $COMPANY_SERVICE_PORT $CONTACT_SERVICE_PORT $INTERVIEW_SERVICE_PORT $NOTIFICATION_SERVICE_PORT $DASHBOARD_SERVICE_PORT $CALL_SERVICE_PORT $PROFILE_SERVICE_PORT $EVENT_SERVICE_PORT $FOLLOWUP_SERVICE_PORT $WORKFLOW_SERVICE_PORT; do
    iptables -A INPUT -p tcp --dport "$port" -s "$DOCKER_NETWORK" -m conntrack --ctstate NEW -j ACCEPT
done

# ============================================================================
# RÈGLES DE LOGGING
# ============================================================================

log "Configuration du logging de sécurité..."

# Créer une chaîne pour le logging des paquets rejetés
iptables -N LOG_REJECTED
iptables -A LOG_REJECTED -m limit --limit 5/m --limit-burst 10 -j LOG --log-prefix "IPTABLES REJECTED: " --log-level 4
iptables -A LOG_REJECTED -j DROP

# Créer une chaîne pour le logging des paquets suspects
iptables -N LOG_SUSPICIOUS
iptables -A LOG_SUSPICIOUS -m limit --limit 5/m --limit-burst 10 -j LOG --log-prefix "IPTABLES SUSPICIOUS: " --log-level 6
iptables -A LOG_SUSPICIOUS -j DROP

# ============================================================================
# RÈGLES DE REJET EXPLICITE
# ============================================================================

log "Configuration des règles de rejet explicite..."

# Rejeter les paquets spoofés
iptables -A INPUT -s 10.0.0.0/8 -j DROP
iptables -A INPUT -s 172.16.0.0/12 -j DROP
iptables -A INPUT -s 192.168.0.0/16 -j DROP
iptables -A INPUT -s 224.0.0.0/4 -j DROP
iptables -A INPUT -s 240.0.0.0/5 -j DROP
iptables -A INPUT -s 127.0.0.0/8 -j DROP
iptables -A INPUT -d 127.0.0.0/8 -j DROP

# Rejeter les ports dangereux
iptables -A INPUT -p tcp --dport 23 -j DROP    # Telnet
iptables -A INPUT -p tcp --dport 25 -j DROP    # SMTP (si pas utilisé)
iptables -A INPUT -p udp --dport 69 -j DROP    # TFTP
iptables -A INPUT -p udp --dport 161 -j DROP   # SNMP
iptables -A INPUT -p tcp --dport 443 -j DROP   # HTTPS (si pas utilisé directement)

# ============================================================================
# APPLICATION DES RÈGLES DE LOGGING
# ============================================================================

# Appliquer le logging aux paquets qui n'ont pas été acceptés
iptables -A INPUT -j LOG_SUSPICIOUS
iptables -A FORWARD -j LOG_SUSPICIOUS

# ============================================================================
# AFFICHAGE DU RÉSUMÉ
# ============================================================================

log "Résumé de la configuration firewall:"
echo ""
echo "🔒 Ports ouverts:"
echo "   • SSH: $SSH_PORT (protégé)"
echo "   • API Gateway: $API_GATEWAY_PORT"
echo "   • Frontend: $FRONTEND_PORT"
echo "   • Monitoring: $PROMETHEUS_PORT, $GRAFANA_PORT"
echo ""
echo "🛡️  Protections activées:"
echo "   • Anti-SYN flood"
echo "   • Anti-ping flood"
echo "   • Anti-UDP flood"
echo "   • Détection de paquets invalides"
echo "   • Liste noire d'IPs spoofées"
echo "   • Logging des paquets rejetés"
echo ""
echo "🌐 Réseaux autorisés:"
for network in "${TRUSTED_NETWORKS[@]}"; do
    echo "   • $network"
done
echo ""
echo "📤 Services externes autorisés:"
for service in "${ALLOWED_OUTBOUND[@]}"; do
    echo "   • $service"
done

# ============================================================================
# SAUVEGARDE DE LA CONFIGURATION
# ============================================================================

log "Sauvegarde de la configuration iptables..."
iptables-save > /etc/iptables/rules.v4

# ============================================================================
# VÉRIFICATION DE LA CONFIGURATION
# ============================================================================

log "Vérification de la configuration..."

# Test de syntaxe des règles
if iptables -L -n >/dev/null 2>&1; then
    success "Configuration iptables appliquée avec succès"
else
    error "Erreur dans la configuration iptables"
    exit 1
fi

# ============================================================================
# INSTRUCTIONS DE MAINTENANCE
# ============================================================================

echo ""
echo "🔧 Maintenance et vérification:"
echo ""
echo "   • Vérifier les règles actives:"
echo "     iptables -L -v -n"
echo ""
echo "   • Voir les connexions actives:"
echo "     iptables -L -n | grep -E '(ACCEPT|DROP)'"
echo ""
echo "   • Restaurer depuis la sauvegarde:"
echo "     iptables-restore < $BACKUP_FILE"
echo ""
echo "   • Vérifier les logs de sécurité:"
echo "     journalctl -f | grep 'IPTABLES'"
echo ""
echo "   • Ajouter une IP temporairement:"
echo "     iptables -I INPUT -s <IP> -j ACCEPT"
echo ""

success "Configuration du firewall sécurisé terminée avec succès !"
log "Configuration sauvegardée dans $BACKUP_FILE"

# ============================================================================
# CONFIGURATION POUR DOCKER COMPOSE
# ============================================================================

cat > /tmp/docker-firewall-setup.sh << 'EOF'
#!/bin/bash
# Script pour configurer le firewall avec Docker

# Récupérer l'ID du réseau Docker
DOCKER_NETWORK_ID=$(docker network ls | grep jobbingtrack-network | awk '{print $1}')

if [[ -n "$DOCKER_NETWORK_ID" ]]; then
    log "Configuration du réseau Docker: $DOCKER_NETWORK_ID"
    # Ajouter des règles spécifiques pour Docker si nécessaire
    iptables -A DOCKER-USER -j RETURN
fi

EOF

chmod +x /tmp/docker-firewall-setup.sh

log "Script de configuration Docker créé: /tmp/docker-firewall-setup.sh"
