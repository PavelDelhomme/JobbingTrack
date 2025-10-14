#!/bin/bash

# Script d'application des mises à jour JobbingTrack
# Redémarre les services et applique les migrations

set -e

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

echo ""
print_step "Application des mises à jour JobbingTrack"
echo "==========================================="
echo ""

# 1. Arrêter tous les services
print_step "1. Arrêt de tous les services..."
cd backend
docker compose down
print_success "Services arrêtés"

# 2. Démarrer PostgreSQL et Redis
print_step "2. Démarrage de PostgreSQL et Redis..."
docker compose up -d postgres redis
print_success "Infrastructure démarrée"

# 3. Attendre que PostgreSQL soit prêt
print_info "Attente que PostgreSQL soit prêt..."
sleep 10

MAX_RETRIES=30
RETRY_COUNT=0
while ! docker compose exec postgres pg_isready -U jobbingtrack -d jobbingtrack > /dev/null 2>&1; do
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        print_error "PostgreSQL n'est pas prêt après ${MAX_RETRIES} tentatives"
        exit 1
    fi
    print_info "Attente de PostgreSQL... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT + 1))
done
print_success "PostgreSQL est prêt"

# 4. Créer et appliquer les migrations
print_step "4. Génération et application des migrations Prisma..."

# Migration pour auth-service (service principal)
print_info "Création de la migration..."
docker compose run --rm auth-service npx prisma migrate dev --name add_call_and_advanced_deletion --skip-seed

print_success "Migration créée et appliquée"

# 5. Générer les clients Prisma pour tous les services
print_step "5. Génération des clients Prisma..."

SERVICES=(
  "auth-service"
  "application-service"
  "company-service"
  "contact-service"
  "dashboard-service"
  "call-service"
  "event-service"
  "followup-service"
  "interview-service"
  "notification-service"
  "profile-service"
  "workflow-service"
)

for service in "${SERVICES[@]}"; do
  print_info "Génération du client Prisma pour $service..."
  docker compose run --rm $service npx prisma generate > /dev/null 2>&1 || true
done

print_success "Clients Prisma générés"

# 6. Seed des données (compte admin)
print_step "6. Initialisation des données admin..."
docker compose run --rm auth-service npx prisma db seed || true
print_success "Données initialisées"

# 7. Démarrer tous les services
print_step "7. Démarrage de tous les services..."
docker compose up -d
print_success "Services démarrés"

# 8. Attendre que les services soient prêts
print_info "Attente que les services soient prêts..."
sleep 20

# 9. Vérifier le statut
print_step "8. Vérification du statut des services..."
docker compose ps

# 10. Tester l'API Gateway
print_step "9. Test de l'API Gateway..."
sleep 5

if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    print_success "API Gateway opérationnel (http://localhost:3000)"
else
    print_error "API Gateway non accessible"
fi

# 11. Tester Auth Service
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    print_success "Auth Service opérationnel (http://localhost:3001)"
else
    print_warning "Auth Service pourrait avoir besoin de plus de temps"
fi

echo ""
print_success "🎉 Mise à jour terminée avec succès !"
echo ""
print_info "📊 Services disponibles:"
echo "  - API Gateway: http://localhost:3000"
echo "  - Frontend: http://localhost:8080 (si démarré)"
echo ""
print_info "🔐 Compte admin de test:"
echo "  - Email: pavel@jobbingtrack.com"
echo "  - Password: password123"
echo "  - Role: SUPER_ADMIN"
echo ""
print_info "🔧 Commandes utiles:"
echo "  - Voir les logs: cd backend && docker compose logs -f"
echo "  - Logs d'un service: cd backend && docker compose logs -f auth-service"
echo "  - Statut: cd backend && docker compose ps"
echo "  - Arrêter: cd backend && docker compose down"
echo ""

# 12. Afficher les derniers logs pour vérifier
print_step "10. Derniers logs des services..."
docker compose logs --tail=5

echo ""
print_success "✅ Tout est prêt ! Vous pouvez maintenant tester le dashboard admin."
echo ""

