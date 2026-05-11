#!/bin/bash
# Script de vérification complète du système JobbingTrack

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     🔍 VÉRIFICATION COMPLÈTE DU SYSTÈME                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

ERRORS_FILE="ERRORS.md"
RESOLUTIONS_FILE="RESOLUTIONS.md"
NON_FUNCTIONAL_FILE="NON_FONCTIONNELS_APRES_RESOLUTION.md"

# Initialiser les fichiers
echo "# 🔴 ERREURS DÉTECTÉES - JobbingTrack" > "$ERRORS_FILE"
echo "**Date**: $(date)" >> "$ERRORS_FILE"
echo "" >> "$ERRORS_FILE"
echo "## 📊 Résumé" >> "$ERRORS_FILE"
echo "- **Total erreurs**: 0" >> "$ERRORS_FILE"
echo "" >> "$ERRORS_FILE"

echo "# ✅ RÉSOLUTIONS APPLIQUÉES - JobbingTrack" > "$RESOLUTIONS_FILE"
echo "**Date**: $(date)" >> "$RESOLUTIONS_FILE"
echo "" >> "$RESOLUTIONS_FILE"

echo "# ⚠️ PROBLÈMES NON RÉSOLUS - JobbingTrack" > "$NON_FUNCTIONAL_FILE"
echo "**Date**: $(date)" >> "$NON_FUNCTIONAL_FILE"
echo "" >> "$NON_FUNCTIONAL_FILE"

ERROR_COUNT=0

# Fonction pour ajouter une erreur
add_error() {
    ERROR_COUNT=$((ERROR_COUNT + 1))
    echo "" >> "$ERRORS_FILE"
    echo "### 🔴 Erreur #$ERROR_COUNT: $1" >> "$ERRORS_FILE"
    echo "**Service**: $2" >> "$ERRORS_FILE"
    echo "**Description**: $3" >> "$ERRORS_FILE"
    echo "**Logs**: \`\`\`" >> "$ERRORS_FILE"
    echo "$4" >> "$ERRORS_FILE"
    echo "\`\`\`" >> "$ERRORS_FILE"
    echo "" >> "$ERRORS_FILE"
}

# 1. Vérifier les services Docker
echo "📦 Vérification des services Docker..."
SERVICES=(
    "jobbingtrack-postgres:5000"
    "jobbingtrack-redis:5001"
    "jobbingtrack-api-gateway:5002"
    "jobbingtrack-frontend:5003"
    "jobbingtrack-auth-service:5005"
    "jobbingtrack-application-service:5006"
    "jobbingtrack-company-service:5007"
    "jobbingtrack-contact-service:5008"
    "jobbingtrack-interview-service:5009"
    "jobbingtrack-call-service:5010"
    "jobbingtrack-event-service:5011"
    "jobbingtrack-followup-service:5012"
    "jobbingtrack-profile-service:5013"
    "jobbingtrack-notification-service:5014"
    "jobbingtrack-dashboard-service:5015"
    "jobbingtrack-workflow-service:5016"
    "jobbingtrack-security-service:5017"
    "jobbingtrack-deployment-service:5018"
    "jobbingtrack-monitoring-c:5098"
    "jobbingtrack-log-collector-c:3019"
)

for service_port in "${SERVICES[@]}"; do
    service="${service_port%%:*}"
    port="${service_port##*:}"
    
    if ! docker ps --format '{{.Names}}' | grep -q "^${service}$"; then
        add_error "Service non démarré" "$service" "Le service $service n'est pas en cours d'exécution" "docker ps | grep $service"
    fi
done

# 2. Vérifier les healthchecks
echo "🏥 Vérification des healthchecks..."
UNHEALTHY=$(docker ps --format '{{.Names}}\t{{.Status}}' | grep -i "unhealthy" || true)
if [ -n "$UNHEALTHY" ]; then
    while IFS=$'\t' read -r name status; do
        logs=$(docker logs "$name" --tail 20 2>&1 | tail -10)
        add_error "Service unhealthy" "$name" "Le service $name est marqué comme unhealthy" "$logs"
    done <<< "$UNHEALTHY"
fi

# 3. Vérifier les endpoints
echo "🌐 Vérification des endpoints..."
check_endpoint() {
    local url=$1
    local name=$2
    
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>&1 || echo "000")
    if [ "$response" != "200" ] && [ "$response" != "000" ]; then
        add_error "Endpoint non accessible" "$name" "L'endpoint $url retourne le code HTTP $response" "curl -v $url"
    elif [ "$response" = "000" ]; then
        add_error "Endpoint timeout" "$name" "L'endpoint $url ne répond pas (timeout)" "curl -v $url"
    fi
}

check_endpoint "http://localhost:5002/health" "API Gateway"
check_endpoint "http://localhost:5003" "Frontend"
check_endpoint "http://localhost:5005/api/v1/auth/health" "Auth Service"
check_endpoint "http://localhost:5098/api/v1/metrics" "Monitoring-C"

# 4. Vérifier les logs d'erreurs
echo "📋 Vérification des logs d'erreurs..."
for service in "${SERVICES[@]}"; do
    service_name="${service%%:*}"
    if docker ps --format '{{.Names}}' | grep -q "^${service_name}$"; then
        errors=$(docker logs "$service_name" --tail 100 2>&1 | grep -iE "error|Error|ERROR|failed|Failed|FAILED|exception|Exception|EXCEPTION" | head -5 || true)
        if [ -n "$errors" ]; then
            add_error "Erreurs dans les logs" "$service_name" "Des erreurs ont été détectées dans les logs du service" "$errors"
        fi
    fi
done

# Mettre à jour le résumé
sed -i "s/- \*\*Total erreurs\*\*: [0-9]*/- **Total erreurs**: $ERROR_COUNT/" "$ERRORS_FILE"

echo ""
echo "✅ Vérification terminée"
echo "📄 Résultats dans: $ERRORS_FILE"
echo "🔴 Total erreurs détectées: $ERROR_COUNT"

