#!/bin/bash

# ============================================
# SYSTÈME DE SUIVI COMPLET DES DÉPLOIEMENTS
# ============================================
# Enregistre et suit toutes les opérations

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Dossier de logs
LOGS_DIR="$PROJECT_ROOT/logs/deployment"
mkdir -p "$LOGS_DIR"

# Fichier de log principal
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOGS_DIR/deployment_${TIMESTAMP}.log"
HISTORY_FILE="$LOGS_DIR/deployment_history.json"

# ============================================
# FONCTIONS DE LOGGING
# ============================================

log_event() {
    local level="$1"
    local message="$2"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() {
    log_event "INFO" "$1"
}

log_success() {
    log_event "SUCCESS" "$1"
}

log_warning() {
    log_event "WARNING" "$1"
}

log_error() {
    log_event "ERROR" "$1"
}

# ============================================
# INITIALISATION
# ============================================

init_tracking() {
    echo -e "${PURPLE}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 SYSTÈME DE SUIVI DÉPLOIEMENT"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${NC}"
    echo ""
    
    log_info "Initialisation du suivi de déploiement"
    log_info "Fichier de log: $LOG_FILE"
    log_info "Historique: $HISTORY_FILE"
    
    # Initialiser le fichier d'historique si nécessaire
    if [ ! -f "$HISTORY_FILE" ]; then
        echo '{"deployments": []}' > "$HISTORY_FILE"
        log_info "Fichier d'historique créé"
    fi
    
    echo ""
}

# ============================================
# COLLECTE D'INFORMATIONS
# ============================================

collect_system_info() {
    log_info "Collecte des informations système..."
    
    # Git
    GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    GIT_STATUS=$(git status --porcelain | wc -l)
    
    # Docker
    DOCKER_VERSION=$(docker --version | awk '{print $3}' | tr -d ',')
    DOCKER_CONTAINERS=$(docker ps --format "{{.Names}}" | wc -l)
    
    # Système
    OS_INFO=$(uname -s)
    HOSTNAME=$(hostname)
    USER=$(whoami)
    
    # PostgreSQL
    if docker ps | grep -q jobbingtrack-postgres; then
        PG_STATUS="running"
        PG_TABLES=$(docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")
    else
        PG_STATUS="stopped"
        PG_TABLES="0"
    fi
    
    log_info "Branche Git: $GIT_BRANCH ($GIT_COMMIT)"
    log_info "Fichiers modifiés: $GIT_STATUS"
    log_info "Docker: $DOCKER_VERSION ($DOCKER_CONTAINERS conteneurs actifs)"
    log_info "PostgreSQL: $PG_STATUS ($PG_TABLES tables)"
    
    echo ""
}

# ============================================
# ENREGISTREMENT DÉPLOIEMENT
# ============================================

start_deployment() {
    local deployment_type="$1"
    
    log_info "═══════════════════════════════════════"
    log_info "DÉBUT DÉPLOIEMENT: $deployment_type"
    log_info "═══════════════════════════════════════"
    
    # Créer entrée déploiement
    DEPLOYMENT_ID="deploy_${TIMESTAMP}"
    START_TIME=$(date +%s)
    
    log_info "ID Déploiement: $DEPLOYMENT_ID"
    log_info "Type: $deployment_type"
    log_info "Démarré à: $(date)"
    
    echo ""
}

end_deployment() {
    local status="$1"
    local message="$2"
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    log_info "═══════════════════════════════════════"
    log_info "FIN DÉPLOIEMENT"
    log_info "═══════════════════════════════════════"
    log_info "Status: $status"
    log_info "Durée: ${DURATION}s"
    log_info "Message: $message"
    
    # Enregistrer dans l'historique JSON
    save_to_history "$status" "$message" "$DURATION"
    
    echo ""
    
    if [ "$status" = "SUCCESS" ]; then
        echo -e "${GREEN}✅ Déploiement terminé avec succès${NC}"
    else
        echo -e "${RED}❌ Déploiement échoué${NC}"
    fi
}

save_to_history() {
    local status="$1"
    local message="$2"
    local duration="$3"
    
    # Créer entrée JSON
    local entry=$(cat <<EOF
{
  "id": "$DEPLOYMENT_ID",
  "timestamp": "$TIMESTAMP",
  "date": "$(date -Iseconds)",
  "type": "$deployment_type",
  "status": "$status",
  "duration": $duration,
  "message": "$message",
  "git": {
    "branch": "$GIT_BRANCH",
    "commit": "$GIT_COMMIT",
    "modified_files": $GIT_STATUS
  },
  "docker": {
    "version": "$DOCKER_VERSION",
    "containers": $DOCKER_CONTAINERS
  },
  "database": {
    "status": "$PG_STATUS",
    "tables": $PG_TABLES
  },
  "user": "$USER",
  "hostname": "$HOSTNAME",
  "log_file": "$LOG_FILE"
}
EOF
)
    
    # Ajouter à l'historique (simplifié pour bash)
    echo "$entry" >> "$LOGS_DIR/last_deployment.json"
    
    log_success "Enregistrement dans l'historique"
}

# ============================================
# SUIVI ÉTAPE PAR ÉTAPE
# ============================================

track_step() {
    local step_name="$1"
    local step_number="$2"
    local total_steps="$3"
    
    log_info "─────────────────────────────────────"
    log_info "ÉTAPE $step_number/$total_steps: $step_name"
    log_info "─────────────────────────────────────"
    
    STEP_START=$(date +%s)
}

track_step_result() {
    local result="$1"
    local message="$2"
    
    STEP_END=$(date +%s)
    STEP_DURATION=$((STEP_END - STEP_START))
    
    if [ "$result" = "SUCCESS" ]; then
        log_success "Étape terminée: $message (${STEP_DURATION}s)"
    else
        log_error "Étape échouée: $message (${STEP_DURATION}s)"
    fi
    
    echo ""
}

# ============================================
# SUIVI TESTS
# ============================================

track_tests() {
    log_info "═══════════════════════════════════════"
    log_info "EXÉCUTION DES TESTS"
    log_info "═══════════════════════════════════════"
}

track_test() {
    local test_name="$1"
    local result="$2"
    
    if [ "$result" = "PASS" ]; then
        log_success "TEST: $test_name - PASS"
    else
        log_error "TEST: $test_name - FAIL"
    fi
}

# ============================================
# GÉNÉRATION RAPPORT
# ============================================

generate_report() {
    local report_file="$LOGS_DIR/report_${TIMESTAMP}.md"
    
    log_info "Génération du rapport: $report_file"
    
    cat > "$report_file" << EOF
# 📊 Rapport de Déploiement

**ID**: $DEPLOYMENT_ID  
**Date**: $(date)  
**Type**: $deployment_type  
**Durée**: ${DURATION}s  
**Status**: $status  

---

## 🔧 Informations Système

- **Système**: $OS_INFO
- **Hostname**: $HOSTNAME
- **Utilisateur**: $USER

## 🐳 Docker

- **Version**: $DOCKER_VERSION
- **Conteneurs actifs**: $DOCKER_CONTAINERS

## 📂 Git

- **Branche**: $GIT_BRANCH
- **Commit**: $GIT_COMMIT
- **Fichiers modifiés**: $GIT_STATUS

## 🗄️ Base de Données

- **Status PostgreSQL**: $PG_STATUS
- **Tables créées**: $PG_TABLES

---

## 📝 Logs Complets

Voir: \`$LOG_FILE\`

---

**Généré automatiquement le $(date)**
EOF
    
    log_success "Rapport généré"
    echo ""
    echo -e "${BLUE}📄 Rapport disponible: $report_file${NC}"
}

# ============================================
# AFFICHAGE HISTORIQUE
# ============================================

show_history() {
    echo -e "${BLUE}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📜 HISTORIQUE DES DÉPLOIEMENTS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${NC}"
    echo ""
    
    if [ ! -d "$LOGS_DIR" ]; then
        echo "Aucun historique disponible"
        return
    fi
    
    echo "Derniers déploiements:"
    echo ""
    
    # Lister les 10 derniers logs
    ls -t "$LOGS_DIR"/deployment_*.log 2>/dev/null | head -10 | while read -r log; do
        local date=$(basename "$log" | sed 's/deployment_\(.*\)\.log/\1/')
        local status=$(grep "\[SUCCESS\]" "$log" > /dev/null && echo "✅ SUCCESS" || echo "❌ FAILED")
        echo "  $status - $date"
        echo "    📄 $log"
        echo ""
    done
}

# ============================================
# NETTOYAGE LOGS ANCIENS
# ============================================

cleanup_old_logs() {
    local retention_days="${1:-30}"
    
    log_info "Nettoyage des logs de plus de $retention_days jours..."
    
    if [ -d "$LOGS_DIR" ]; then
        find "$LOGS_DIR" -name "deployment_*.log" -mtime +$retention_days -delete
        find "$LOGS_DIR" -name "report_*.md" -mtime +$retention_days -delete
        log_success "Nettoyage effectué"
    fi
}

# ============================================
# EXPORT LOGS
# ============================================

export_logs() {
    local export_dir="${1:-./deployment_logs_export}"
    
    log_info "Export des logs vers: $export_dir"
    
    mkdir -p "$export_dir"
    
    if [ -d "$LOGS_DIR" ]; then
        cp -r "$LOGS_DIR"/* "$export_dir/"
        log_success "Export terminé"
        echo ""
        echo -e "${GREEN}📦 Logs exportés vers: $export_dir${NC}"
    fi
}

# ============================================
# COMMANDES
# ============================================

case "${1:-track}" in
    track)
        init_tracking
        collect_system_info
        start_deployment "${2:-manual}"
        
        # Le script appelant devra appeler end_deployment
        echo "export DEPLOYMENT_ID='$DEPLOYMENT_ID'" > /tmp/deployment_tracking.env
        echo "export START_TIME='$START_TIME'" >> /tmp/deployment_tracking.env
        echo "export LOG_FILE='$LOG_FILE'" >> /tmp/deployment_tracking.env
        ;;
        
    end)
        source /tmp/deployment_tracking.env 2>/dev/null || true
        end_deployment "${2:-SUCCESS}" "${3:-Déploiement terminé}"
        generate_report
        ;;
        
    step)
        track_step "$2" "$3" "$4"
        ;;
        
    step-end)
        track_step_result "$2" "$3"
        ;;
        
    test)
        track_test "$2" "$3"
        ;;
        
    history)
        show_history
        ;;
        
    cleanup)
        cleanup_old_logs "${2:-30}"
        ;;
        
    export)
        export_logs "$2"
        ;;
        
    report)
        if [ -f "$LOGS_DIR/report_${2}.md" ]; then
            cat "$LOGS_DIR/report_${2}.md"
        else
            echo "Rapport introuvable"
        fi
        ;;
        
    *)
        echo "Usage: $0 {track|end|step|step-end|test|history|cleanup|export|report}"
        exit 1
        ;;
esac
