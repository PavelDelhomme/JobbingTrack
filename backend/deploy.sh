#!/bin/bash

# Script de déploiement complet des microservices JobbingTrack
# Supporte les environnements: development, staging, production

set -e

# Configuration
ENVIRONMENT=${1:-development}
COMPOSE_FILE="docker-compose.yml"
MONITORING_COMPOSE_FILE="monitoring/docker-compose.monitoring.yml"

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

print_step() {
    echo -e "${BLUE}🔧 $1${NC}"
}

# Fonction d'aide
show_help() {
    echo "🚀 Script de déploiement JobbingTrack Microservices"
    echo ""
    echo "Usage: $0 [ENVIRONMENT] [OPTIONS]"
    echo ""
    echo "Environnements:"
    echo "  development  - Déploiement de développement (défaut)"
    echo "  staging      - Déploiement de staging"
    echo "  production   - Déploiement de production"
    echo ""
    echo "Options:"
    echo "  --monitoring - Inclure le monitoring (Prometheus, Grafana, etc.)"
    echo "  --clean      - Nettoyer avant le déploiement"
    echo "  --test       - Exécuter les tests après le déploiement"
    echo "  --help       - Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 development"
    echo "  $0 production --monitoring --test"
    echo "  $0 staging --clean"
}

# Vérifier les arguments
MONITORING=false
CLEAN=false
TEST=false

for arg in "$@"; do
    case $arg in
        --monitoring)
            MONITORING=true
            shift
            ;;
        --clean)
            CLEAN=true
            shift
            ;;
        --test)
            TEST=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        development|staging|production)
            ENVIRONMENT=$arg
            shift
            ;;
        *)
            print_error "Argument inconnu: $arg"
            show_help
            exit 1
            ;;
    esac
done

print_step "Déploiement en mode $ENVIRONMENT"

# Vérifier les prérequis
print_info "Vérification des prérequis..."

if ! command -v docker &> /dev/null; then
    print_error "Docker n'est pas installé"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose n'est pas installé"
    exit 1
fi

print_success "Prérequis vérifiés"

# Nettoyage si demandé
if [ "$CLEAN" = true ]; then
    print_step "Nettoyage des ressources existantes..."
    docker-compose -f $COMPOSE_FILE down -v --remove-orphans
    if [ "$MONITORING" = true ]; then
        docker-compose -f $MONITORING_COMPOSE_FILE down -v --remove-orphans
    fi
    docker system prune -f
    print_success "Nettoyage terminé"
fi

# Configuration selon l'environnement
print_step "Configuration pour l'environnement $ENVIRONMENT"

case $ENVIRONMENT in
    development)
        COMPOSE_CMD="docker-compose -f $COMPOSE_FILE"
        if [ "$MONITORING" = true ]; then
            COMPOSE_CMD="$COMPOSE_CMD -f $MONITORING_COMPOSE_FILE"
        fi
        ;;
    staging)
        COMPOSE_CMD="docker-compose -f $COMPOSE_FILE -f docker-compose.staging.yml"
        if [ "$MONITORING" = true ]; then
            COMPOSE_CMD="$COMPOSE_CMD -f $MONITORING_COMPOSE_FILE"
        fi
        ;;
    production)
        COMPOSE_CMD="docker-compose -f $COMPOSE_FILE -f docker-compose.prod.yml"
        if [ "$MONITORING" = true ]; then
            COMPOSE_CMD="$COMPOSE_CMD -f $MONITORING_COMPOSE_FILE"
        fi
        ;;
esac

# Construction des images
print_step "Construction des images Docker..."
$COMPOSE_CMD build --parallel
print_success "Images construites"

# Démarrage des services d'infrastructure
print_step "Démarrage des services d'infrastructure..."
$COMPOSE_CMD up -d postgres redis
print_success "Services d'infrastructure démarrés"

# Attendre que PostgreSQL soit prêt
print_info "Attente que PostgreSQL soit prêt..."
while ! $COMPOSE_CMD exec postgres pg_isready -U jobbingtrack -d jobbingtrack > /dev/null 2>&1; do
    print_info "Attente de PostgreSQL..."
    sleep 2
done
print_success "PostgreSQL prêt"

# Exécution des migrations
print_step "Exécution des migrations de base de données..."
$COMPOSE_CMD run --rm auth-service npx prisma migrate deploy
$COMPOSE_CMD run --rm auth-service npx prisma generate
print_success "Migrations exécutées"

# Démarrage des microservices
print_step "Démarrage des microservices..."
$COMPOSE_CMD up -d
print_success "Microservices démarrés"

# Démarrage du monitoring si demandé
if [ "$MONITORING" = true ]; then
    print_step "Démarrage du monitoring..."
    $COMPOSE_CMD up -d prometheus grafana jaeger elasticsearch kibana logstash
    print_success "Monitoring démarré"
fi

# Attendre que les services soient prêts
print_info "Attente que tous les services soient prêts..."
sleep 30

# Tests si demandés
if [ "$TEST" = true ]; then
    print_step "Exécution des tests..."
    if [ -f "test-services.sh" ]; then
        ./test-services.sh
    else
        print_warning "Script de test non trouvé, tests ignorés"
    fi
fi

# Affichage du statut
print_step "Statut des services:"
$COMPOSE_CMD ps

# Affichage des URLs
print_step "Services disponibles:"
echo ""
echo "🌐 API Gateway: http://localhost:3000"
echo "📚 Documentation: http://localhost:3000/api-docs"
echo ""

if [ "$MONITORING" = true ]; then
    echo "📊 Monitoring:"
    echo "  - Prometheus: http://localhost:9090"
    echo "  - Grafana: http://localhost:3001 (admin/admin)"
    echo "  - Jaeger: http://localhost:16686"
    echo "  - Kibana: http://localhost:5601"
    echo ""
fi

echo "🔧 Commandes utiles:"
echo "  - Logs: $COMPOSE_CMD logs -f"
echo "  - Statut: $COMPOSE_CMD ps"
echo "  - Arrêt: $COMPOSE_CMD down"
echo ""

print_success "🎉 Déploiement terminé avec succès!"
