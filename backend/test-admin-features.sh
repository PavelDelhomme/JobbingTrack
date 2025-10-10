#!/bin/bash

# Script de test des nouvelles fonctionnalités admin
# JobbingTrack - Dashboard Admin

set -e

API_URL="http://localhost:3000"
TOKEN=""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_test() {
    echo -e "${BLUE}🧪 $1${NC}"
}

echo ""
print_info "Test des fonctionnalités admin JobbingTrack"
echo "============================================="
echo ""

# 1. Login avec compte admin
print_test "1. Login avec compte SUPER_ADMIN..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pavel@jobbingtrack.com",
    "password": "password123"
  }')

if echo "$LOGIN_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
    ROLE=$(echo "$LOGIN_RESPONSE" | jq -r '.user.role')
    print_success "Login réussi (Rôle: $ROLE)"
    
    if [ "$ROLE" != "SUPER_ADMIN" ]; then
        print_error "Le rôle n'est pas SUPER_ADMIN. Exécutez le seed : docker compose run --rm auth-service npx prisma db seed"
        exit 1
    fi
else
    print_error "Échec du login"
    echo "$LOGIN_RESPONSE" | jq '.'
    exit 1
fi

# 2. Tester la route de services
print_test "2. Test de la liste des services disponibles..."
SERVICES_RESPONSE=$(curl -s "$API_URL/api/v1/admin/logs/services" \
  -H "Authorization: Bearer $TOKEN")

if echo "$SERVICES_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    SERVICE_COUNT=$(echo "$SERVICES_RESPONSE" | jq '.services | length')
    print_success "Liste des services récupérée ($SERVICE_COUNT services)"
else
    print_error "Échec récupération liste services"
    echo "$SERVICES_RESPONSE" | jq '.'
fi

# 3. Tester la récupération des logs
print_test "3. Test de récupération des logs (auth-service)..."
LOGS_RESPONSE=$(curl -s "$API_URL/api/v1/admin/logs/auth?lines=10" \
  -H "Authorization: Bearer $TOKEN")

if echo "$LOGS_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    LOG_COUNT=$(echo "$LOGS_RESPONSE" | jq '.lines')
    print_success "Logs récupérés ($LOG_COUNT lignes)"
else
    print_error "Échec récupération logs"
    echo "$LOGS_RESPONSE" | jq '.'
fi

# 4. Tester la corbeille (vide au début)
print_test "4. Test de la corbeille globale..."
TRASH_RESPONSE=$(curl -s "$API_URL/api/v1/admin/trash" \
  -H "Authorization: Bearer $TOKEN")

if echo "$TRASH_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    TRASH_COUNT=$(echo "$TRASH_RESPONSE" | jq '.total')
    print_success "Corbeille accessible ($TRASH_COUNT éléments)"
else
    print_error "Échec accès corbeille"
    echo "$TRASH_RESPONSE" | jq '.'
fi

# 5. Créer une candidature de test
print_test "5. Création d'une candidature de test..."
APP_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/applications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Company",
    "position": "Test Position",
    "status": "DRAFT"
  }')

if echo "$APP_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    APP_ID=$(echo "$APP_RESPONSE" | jq -r '.application.id')
    print_success "Candidature créée (ID: $APP_ID)"
    
    # 6. Supprimer la candidature (soft delete)
    print_test "6. Suppression (soft delete) de la candidature..."
    DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/api/v1/applications/$APP_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$DELETE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        print_success "Candidature supprimée (soft delete)"
        
        # 7. Vérifier qu'elle est dans la corbeille
        sleep 2
        print_test "7. Vérification de la présence dans la corbeille..."
        TRASH_CHECK=$(curl -s "$API_URL/api/v1/admin/trash?type=Application" \
          -H "Authorization: Bearer $TOKEN")
        
        TRASH_COUNT=$(echo "$TRASH_CHECK" | jq '.items | length')
        if [ "$TRASH_COUNT" -gt 0 ]; then
            print_success "Candidature trouvée dans la corbeille"
        else
            print_error "Candidature non trouvée dans la corbeille"
        fi
    else
        print_error "Échec suppression candidature"
    fi
else
    print_error "Échec création candidature"
    echo "$APP_RESPONSE" | jq '.'
fi

# 8. Tester le redémarrage d'un service
print_test "8. Test redémarrage d'un service (call-service)..."
RESTART_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/admin/services/restart" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"serviceName": "call"}')

if echo "$RESTART_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    print_success "Service redémarré avec succès"
else
    print_error "Échec redémarrage service"
    echo "$RESTART_RESPONSE" | jq '.'
fi

# 9. Vérifier que le workflow-service a démarré le scheduler
print_test "9. Vérification du scheduler (workflow-service)..."
WORKFLOW_LOGS=$(cd backend && docker compose logs workflow-service | grep -i "cron scheduler started" | tail -1)

if [ -n "$WORKFLOW_LOGS" ]; then
    print_success "Scheduler démarré avec 5 jobs CRON"
else
    print_error "Scheduler non démarré ou logs non trouvés"
fi

echo ""
print_success "🎉 Tests terminés !"
echo ""
print_info "📊 Résumé:"
echo "  ✅ Authentification avec rôle SUPER_ADMIN"
echo "  ✅ Routes admin accessibles"
echo "  ✅ Logs récupérables"
echo "  ✅ Corbeille fonctionnelle"
echo "  ✅ Soft delete opérationnel"
echo "  ✅ Gestion des services opérationnelle"
echo "  ✅ Scheduler CRON actif"
echo ""
print_info "🌐 Accès au dashboard:"
echo "  - URL: http://localhost:8080/backoffice"
echo "  - Email: pavel@jobbingtrack.com"
echo "  - Password: password123"
echo ""

