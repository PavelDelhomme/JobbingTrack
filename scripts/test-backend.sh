#!/bin/bash

# ============================================================================
# Script de test backend pour JobbingTrack
# ============================================================================

set -e

echo "🧪 Démarrage des tests backend..."

# Variables
BACKEND_DIR="backend"
TEST_RESULTS_DIR="test-results"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Créer le dossier des résultats
mkdir -p "$TEST_RESULTS_DIR"

# Fonction pour exécuter les tests d'un service
run_service_tests() {
    local service_name="$1"
    local service_dir="$2"
    
    echo "🔍 Test du service: $service_name"
    
    if [ ! -f "$service_dir/package.json" ]; then
        echo "⚠️ Aucun package.json trouvé pour $service_name"
        return 0
    fi
    
    cd "$service_dir"
    
    # Vérifier si des tests existent
    if [ -d "tests" ] || [ -d "__tests__" ] || [ -d "test" ]; then
        echo "📦 Installation des dépendances pour $service_name..."
        npm ci --silent --no-audit
        
        echo "🧪 Exécution des tests pour $service_name..."
        
        # Essayer différents scripts de test
        if npm run test --dry-run 2>/dev/null; then
            npm run test 2>&1 | tee "../../$TEST_RESULTS_DIR/${service_name}-test.log"
            if [ ${PIPESTATUS[0]} -eq 0 ]; then
                echo "✅ Tests passés pour $service_name"
                ((PASSED_TESTS++))
            else
                echo "❌ Tests échoués pour $service_name"
                ((FAILED_TESTS++))
            fi
        elif npm run test:unit --dry-run 2>/dev/null; then
            npm run test:unit 2>&1 | tee "../../$TEST_RESULTS_DIR/${service_name}-test.log"
            if [ ${PIPESTATUS[0]} -eq 0 ]; then
                echo "✅ Tests unitaires passés pour $service_name"
                ((PASSED_TESTS++))
            else
                echo "❌ Tests unitaires échoués pour $service_name"
                ((FAILED_TESTS++))
            fi
        else
            echo "ℹ️ Aucun script de test configuré pour $service_name"
        fi
        
        ((TOTAL_TESTS++))
    else
        echo "ℹ️ Aucun dossier de tests trouvé pour $service_name"
    fi
    
    cd - > /dev/null
}

# Fonction pour tester la connectivité des services
test_service_connectivity() {
    echo "🌐 Test de connectivité des services..."
    
    local services=(
        "api-gateway:3000"
        "auth-service:3001"
        "application-service:3002"
        "company-service:3003"
        "contact-service:3004"
        "interview-service:3005"
        "notification-service:3006"
        "dashboard-service:3007"
    )
    
    for service in "${services[@]}"; do
        local name=$(echo "$service" | cut -d: -f1)
        local port=$(echo "$service" | cut -d: -f2)
        
        echo "🔍 Test de connectivité: $name (port $port)"
        
        if timeout 5 bash -c "</dev/tcp/localhost/$port" 2>/dev/null; then
            echo "✅ $name accessible sur le port $port"
        else
            echo "❌ $name non accessible sur le port $port"
            ((FAILED_TESTS++))
        fi
        
        ((TOTAL_TESTS++))
    done
}

# Fonction pour tester les endpoints API
test_api_endpoints() {
    echo "🔗 Test des endpoints API..."
    
    local endpoints=(
        "http://localhost:3000/health"
        "http://localhost:3000/api/auth/health"
        "http://localhost:3000/api/application/health"
        "http://localhost:3000/api/company/health"
        "http://localhost:3000/api/contact/health"
        "http://localhost:3000/api/interview/health"
        "http://localhost:3000/api/notification/health"
        "http://localhost:3000/api/dashboard/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        echo "🔍 Test de l'endpoint: $endpoint"
        
        if curl -f -s "$endpoint" > /dev/null 2>&1; then
            echo "✅ $endpoint accessible"
        else
            echo "❌ $endpoint non accessible"
            ((FAILED_TESTS++))
        fi
        
        ((TOTAL_TESTS++))
    done
}

# Fonction pour tester la base de données
test_database_connection() {
    echo "🗄️ Test de connexion à la base de données..."
    
    if command -v psql >/dev/null 2>&1; then
        if PGPASSWORD=jobbingtrack123 psql -h localhost -U jobbingtrack -d jobbingtrack -c "SELECT 1;" > /dev/null 2>&1; then
            echo "✅ Connexion à PostgreSQL réussie"
        else
            echo "❌ Connexion à PostgreSQL échouée"
            ((FAILED_TESTS++))
        fi
    else
        echo "ℹ️ psql non disponible, test de base de données ignoré"
    fi
    
    ((TOTAL_TESTS++))
}

# Fonction pour tester Redis
test_redis_connection() {
    echo "🔴 Test de connexion à Redis..."
    
    if command -v redis-cli >/dev/null 2>&1; then
        if redis-cli -h localhost -p 6379 ping > /dev/null 2>&1; then
            echo "✅ Connexion à Redis réussie"
        else
            echo "❌ Connexion à Redis échouée"
            ((FAILED_TESTS++))
        fi
    else
        echo "ℹ️ redis-cli non disponible, test Redis ignoré"
    fi
    
    ((TOTAL_TESTS++))
}

# Fonction pour générer le rapport
generate_report() {
    echo ""
    echo "📊 RAPPORT DES TESTS BACKEND"
    echo "============================"
    echo "Total des tests: $TOTAL_TESTS"
    echo "Tests passés: $PASSED_TESTS"
    echo "Tests échoués: $FAILED_TESTS"
    echo ""
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo "✅ TOUS LES TESTS SONT PASSÉS !"
        exit 0
    else
        echo "❌ $FAILED_TESTS TEST(S) ONT ÉCHOUÉ"
        echo "📋 Consultez les logs dans $TEST_RESULTS_DIR/ pour plus de détails"
        exit 1
    fi
}

# Fonction principale
main() {
    echo "🚀 Démarrage des tests backend JobbingTrack"
    echo "=========================================="
    
    # Vérifier que nous sommes dans le bon répertoire
    if [ ! -d "$BACKEND_DIR" ]; then
        echo "❌ Dossier backend non trouvé. Exécutez ce script depuis la racine du projet."
        exit 1
    fi
    
    # Tests des services individuels
    echo ""
    echo "🔧 Tests des services individuels..."
    for service_dir in "$BACKEND_DIR"/*/; do
        if [ -d "$service_dir" ]; then
            service_name=$(basename "$service_dir")
            run_service_tests "$service_name" "$service_dir"
        fi
    done
    
    # Tests de connectivité
    echo ""
    test_service_connectivity
    
    # Tests des endpoints API
    echo ""
    test_api_endpoints
    
    # Tests de base de données
    echo ""
    test_database_connection
    
    # Tests Redis
    echo ""
    test_redis_connection
    
    # Génération du rapport
    generate_report
}

# Exécution du script
main "$@"
