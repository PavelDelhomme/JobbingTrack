#!/bin/bash

# Script de test complet JobbingTrack
# Teste backend + frontend + toutes les routes API

set -e

echo "🧪 Test complet JobbingTrack"
echo "============================"
echo ""

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

# Test 1: API Gateway
print_info "Test API Gateway..."
if curl -s http://localhost:3000/health | grep -q "OK"; then
    print_success "API Gateway opérationnel"
else
    print_error "API Gateway non accessible"
fi

# Test 2: Tous les services
print_info "Test de tous les services..."
services=("applications" "companies" "contacts" "interviews" "notifications" "calls" "events" "followups")

for service in "${services[@]}"; do
    if curl -s "http://localhost:3000/api/v1/$service/health" | grep -q "OK"; then
        print_success "$service OK"
    else
        print_error "$service ERREUR"
    fi
done

# Test 3: Frontend
print_info "Test Frontend..."
if curl -s http://localhost:8080 | grep -q "<!DOCTYPE html"; then
    print_success "Frontend accessible"
else
    print_error "Frontend non accessible"
fi

# Test 4: Login
print_info "Test de l'authentification..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@jobbingtrack.test","password":"password123"}')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    print_success "Authentification fonctionnelle"
    
    # Extraire le token
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
    print_info "Token obtenu: ${TOKEN:0:20}..."
    
    # Tester avec le token
    print_info "Test de récupération du profil..."
    if curl -s http://localhost:3000/api/v1/auth/profile \
        -H "Authorization: Bearer $TOKEN" | grep -q "success"; then
        print_success "Récupération du profil OK"
    else
        print_error "Récupération du profil ERREUR"
    fi
else
    print_error "Authentification échouée"
fi

echo ""
echo "=============================="
echo -e "${GREEN}🎉 Tests terminés !${NC}"
echo ""
echo "📋 URLs disponibles :"
echo "  - Frontend : http://localhost:8080"
echo "  - Login : http://localhost:8080/login"
echo "  - Backoffice : http://localhost:8080/backoffice"
echo "  - API Gateway : http://localhost:3000"
echo ""
echo "🔐 Identifiants de test :"
echo "  Email : admin@jobbingtrack.test"
echo "  Mot de passe : password123"
echo ""

