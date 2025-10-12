#!/bin/bash

# Script de test pour vérifier que tous les microservices fonctionnent
# JobbingTrack

set -e

echo "🧪 Test des microservices JobbingTrack"
echo "======================================"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Fonction pour tester un endpoint
test_endpoint() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    print_info "Test de $service_name sur $url"
    
    if response=$(curl -s -w "%{http_code}" -o /dev/null "$url" 2>/dev/null); then
        if [ "$response" = "$expected_status" ]; then
            print_success "$service_name répond correctement (HTTP $response)"
            return 0
        else
            print_error "$service_name répond avec un code inattendu (HTTP $response, attendu $expected_status)"
            return 1
        fi
    else
        print_error "$service_name n'est pas accessible"
        return 1
    fi
}

# Fonction pour tester un service complet
test_service() {
    local service_name=$1
    local port=$2
    local health_endpoint="http://localhost:$port/health"
    
    echo ""
    echo "🔍 Test du service $service_name (port $port)"
    echo "----------------------------------------"
    
    if test_endpoint "$service_name" "$health_endpoint"; then
        print_success "Service $service_name opérationnel"
        return 0
    else
        print_error "Service $service_name en panne"
        return 1
    fi
}

# Vérifier que Docker Compose est en cours d'exécution
print_info "Vérification de Docker Compose..."
if ! docker compose ps | grep -q "Up"; then
    print_warning "Aucun service Docker Compose en cours d'exécution"
    print_info "Démarrage des services..."
    docker compose up -d
    print_info "Attente que les services soient prêts..."
    sleep 30
fi

# Tests des services
echo ""
echo "🚀 Début des tests des microservices"
echo "===================================="

# Variables pour compter les succès/échecs
success_count=0
total_count=0

# Liste des services à tester
services=(
    "API Gateway:3000"
    "Auth Service:3001"
    "Application Service:3002"
    "Company Service:3003"
    "Contact Service:3004"
    "Interview Service:3005"
    "Notification Service:3006"
    "Dashboard Service:3007"
)

# Tester chaque service
for service_info in "${services[@]}"; do
    IFS=':' read -r service_name port <<< "$service_info"
    total_count=$((total_count + 1))
    
    if test_service "$service_name" "$port"; then
        success_count=$((success_count + 1))
    fi
done

# Test de l'API Gateway (routage)
echo ""
echo "🔗 Test du routage de l'API Gateway"
echo "=================================="

print_info "Test du routage vers Auth Service via API Gateway..."
if test_endpoint "API Gateway Auth Route" "http://localhost:3000/api/v1/auth/health" 200; then
    print_success "Routage vers Auth Service fonctionnel"
    success_count=$((success_count + 1))
else
    print_error "Routage vers Auth Service défaillant"
fi
total_count=$((total_count + 1))

# Test de la base de données
echo ""
echo "🗄️ Test de la base de données"
echo "============================="

print_info "Test de la connexion PostgreSQL..."
if docker compose exec postgres pg_isready -U jobbingtrack -d jobbingtrack > /dev/null 2>&1; then
    print_success "PostgreSQL opérationnel"
    success_count=$((success_count + 1))
else
    print_error "PostgreSQL inaccessible"
fi
total_count=$((total_count + 1))

# Test de Redis
print_info "Test de Redis..."
if docker compose exec redis redis-cli ping > /dev/null 2>&1; then
    print_success "Redis opérationnel"
    success_count=$((success_count + 1))
else
    print_error "Redis inaccessible"
fi
total_count=$((total_count + 1))

# Résumé des tests
echo ""
echo "📊 Résumé des tests"
echo "=================="
echo "Services testés: $total_count"
echo "Succès: $success_count"
echo "Échecs: $((total_count - success_count))"

if [ $success_count -eq $total_count ]; then
    echo ""
    print_success "🎉 Tous les tests sont passés avec succès!"
    echo ""
    echo "🚀 Votre architecture microservices est opérationnelle!"
    echo ""
    echo "📋 Services disponibles:"
    for service_info in "${services[@]}"; do
        IFS=':' read -r service_name port <<< "$service_info"
        echo "  - $service_name: http://localhost:$port"
    done
    echo ""
    echo "🔗 API Gateway: http://localhost:3000"
    echo "📚 Documentation: http://localhost:3000/api-docs"
    echo ""
    exit 0
else
    echo ""
    print_error "❌ Certains tests ont échoué"
    echo ""
    print_info "Pour diagnostiquer les problèmes:"
    echo "  - Voir les logs: make logs"
    echo "  - Statut des services: make status"
    echo "  - Redémarrer les services: make restart"
    echo ""
    exit 1
fi
