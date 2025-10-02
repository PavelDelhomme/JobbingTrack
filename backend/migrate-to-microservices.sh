#!/bin/bash

# Script de migration du monolithe vers les microservices
# JobbingTrack

set -e

echo "🚀 Migration vers l'architecture microservices JobbingTrack"
echo "=========================================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    print_error "Docker n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Vérifier que Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

print_step "1. Arrêt du backend monolithique"
if [ -f "../backend/docker-compose.yml" ]; then
    cd ../backend
    docker-compose down
    cd ../microservices
    print_message "Backend monolithique arrêté"
else
    print_warning "Backend monolithique non trouvé ou déjà arrêté"
fi

print_step "2. Sauvegarde de la base de données"
# Créer un dossier de sauvegarde
mkdir -p backups
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backups/jobbingtrack_backup_${TIMESTAMP}.sql"

# Sauvegarder la base de données si elle existe
if docker ps | grep -q "postgres"; then
    print_message "Sauvegarde de la base de données..."
    docker exec $(docker ps -q --filter "name=postgres") pg_dump -U jobbingtrack jobbingtrack > "$BACKUP_FILE"
    print_message "Sauvegarde créée: $BACKUP_FILE"
else
    print_warning "Base de données PostgreSQL non trouvée, pas de sauvegarde nécessaire"
fi

print_step "3. Construction des images Docker des microservices"
print_message "Construction de l'API Gateway..."
docker-compose build api-gateway

print_message "Construction du service d'authentification..."
docker-compose build auth-service

print_message "Construction des autres services..."
docker-compose build application-service company-service contact-service interview-service notification-service dashboard-service

print_step "4. Démarrage des services d'infrastructure"
print_message "Démarrage de PostgreSQL et Redis..."
docker-compose up -d postgres redis

# Attendre que PostgreSQL soit prêt
print_message "Attente que PostgreSQL soit prêt..."
sleep 10

# Vérifier que PostgreSQL est prêt
while ! docker-compose exec postgres pg_isready -U jobbingtrack -d jobbingtrack; do
    print_message "Attente de PostgreSQL..."
    sleep 2
done

print_step "5. Exécution des migrations de base de données"
print_message "Exécution des migrations Prisma..."
docker-compose run --rm auth-service npx prisma migrate deploy
docker-compose run --rm auth-service npx prisma generate

print_step "6. Démarrage des microservices"
print_message "Démarrage de tous les microservices..."
docker-compose up -d

print_step "7. Vérification des services"
print_message "Attente que tous les services soient prêts..."
sleep 15

# Vérifier le statut des services
print_message "Vérification du statut des services:"
docker-compose ps

print_step "8. Tests de connectivité"
print_message "Test de l'API Gateway..."
if curl -s http://localhost:3000/health > /dev/null; then
    print_message "✅ API Gateway opérationnel"
else
    print_error "❌ API Gateway non accessible"
fi

print_message "Test du service d'authentification..."
if curl -s http://localhost:3001/health > /dev/null; then
    print_message "✅ Service d'authentification opérationnel"
else
    print_error "❌ Service d'authentification non accessible"
fi

print_step "9. Migration terminée!"
echo ""
echo "🎉 Migration vers les microservices terminée avec succès!"
echo ""
echo "📊 Services disponibles:"
echo "  - API Gateway: http://localhost:3000"
echo "  - Documentation: http://localhost:3000/api-docs"
echo "  - Auth Service: http://localhost:3001"
echo "  - Application Service: http://localhost:3002"
echo "  - Company Service: http://localhost:3003"
echo "  - Contact Service: http://localhost:3004"
echo "  - Interview Service: http://localhost:3005"
echo "  - Notification Service: http://localhost:3006"
echo "  - Dashboard Service: http://localhost:3007"
echo ""
echo "🔧 Commandes utiles:"
echo "  - Voir les logs: make logs"
echo "  - Statut des services: make status"
echo "  - Arrêter les services: make down"
echo "  - Redémarrer: make up"
echo ""
echo "📚 Documentation complète: README.md"
echo ""

# Afficher les logs récents
print_message "Logs récents des services:"
docker-compose logs --tail=10
