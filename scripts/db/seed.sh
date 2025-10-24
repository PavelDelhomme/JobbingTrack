#!/usr/bin/env bash

# ============================================================================
# Script de seed de la base de données - JobbingTrack
# ============================================================================
# Insère des données de test dans la base de données PostgreSQL
#
# Usage: ./scripts/db/seed.sh [OPTIONS]
#
# Options:
#   --admin-only     Créer uniquement l'utilisateur administrateur
#   --sample-data    Ajouter des données d'exemple (entreprises, candidatures)
#   --help           Afficher cette aide
#
# Exemples:
#   ./scripts/db/seed.sh              # Seed complet
#   ./scripts/db/seed.sh --admin-only # Administrateur uniquement
# ============================================================================

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ADMIN_ONLY=false
SAMPLE_DATA=true

# ============================================================================
# DÉTECTION AUTOMATIQUE DOCKER COMPOSE
# ============================================================================

# Import du wrapper Docker Compose utilitaire
UTILS_DIR="$SCRIPT_DIR/../utils"

if [ -f "$UTILS_DIR/docker-compose-wrapper.sh" ]; then
    source "$UTILS_DIR/docker-compose-wrapper.sh"

    # Initialiser la détection Docker Compose
    if ! init_docker_compose_detection; then
        echo -e "${RED}❌ Impossible d'initialiser Docker Compose${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Wrapper Docker Compose non trouvé${NC}"
    exit 1
fi

# Fonction d'aide
show_help() {
    echo -e "${BLUE}🌱 Seed base de données - JobbingTrack${NC}"
    echo "===================================="
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --admin-only     Créer uniquement l'utilisateur administrateur"
    echo "  --sample-data    Ajouter des données d'exemple"
    echo "  --help           Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0                           # Seed complet"
    echo "  $0 --admin-only             # Administrateur uniquement"
    echo ""
    echo "Données insérées:"
    echo "  • Utilisateur administrateur"
    echo "  • Entreprises d'exemple (Google, Microsoft, etc.)"
    echo "  • Candidatures de test"
    echo "  • Entretiens programmés"
}

# Gestion des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --admin-only)
            ADMIN_ONLY=true
            shift
            ;;
        --sample-data)
            SAMPLE_DATA=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Option inconnue: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Fonction pour vérifier PostgreSQL
check_postgres() {
    echo -e "${YELLOW}🔍 Vérification de PostgreSQL...${NC}"

    if ! check_docker_compose_available; then
        echo -e "${RED}❌ Docker/Docker Compose n'est pas disponible${NC}"
        return 1
    fi

    if ! docker_compose_wrapper ps postgres | grep -q "Up"; then
        echo -e "${RED}❌ PostgreSQL n'est pas en cours d'exécution${NC}"
        echo -e "${YELLOW}💡 Démarrez les services avec : make up${NC}"
        return 1
    fi

    echo -e "${GREEN}✅ PostgreSQL est accessible${NC}"
    return 0
}

# Fonction pour créer l'utilisateur administrateur
create_admin_user() {
    echo -e "${BLUE}👤 Création de l'utilisateur administrateur...${NC}"

    # Utiliser un ID unique basé sur le timestamp pour éviter les conflits
    local user_id="admin_$(date +%s)"

    # Mot de passe hashé (correspond au mot de passe par défaut)
    local hashed_password='$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'

    docker_compose_wrapper exec -T postgres psql -U jobbingtrack -d jobbingtrack -c "
    INSERT INTO \"User\" (id, email, password, \"firstName\", \"lastName\", role, \"isActive\", \"createdAt\", \"updatedAt\")
    VALUES (
        '$user_id',
        '${ADMIN_EMAIL:-pavel@jobbingtrack.com}',
        '$hashed_password',
        'Super',
        'Administrateur',
        'SUPER_ADMIN',
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
        role = 'SUPER_ADMIN',
        \"isActive\" = true,
        \"updatedAt\" = NOW()
    RETURNING id, email, role;
    "

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Utilisateur administrateur créé${NC}"
        echo "📧 Email: ${ADMIN_EMAIL:-pavel@jobbingtrack.com}"
        echo "🔐 Mot de passe: SuperAdmin123!"
    else
        echo -e "${RED}❌ Échec de la création de l'utilisateur${NC}"
        return 1
    fi
}

# Fonction pour ajouter des données d'exemple
seed_sample_data() {
    if [ "$ADMIN_ONLY" = true ]; then
        return 0
    fi

    echo -e "${BLUE}🏢 Ajout de données d'exemple...${NC}"

    # Créer quelques entreprises d'exemple
    echo -e "${YELLOW}📁 Insertion des entreprises...${NC}"

    docker_compose_wrapper exec -T postgres psql -U jobbingtrack -d jobbingtrack -c "
    INSERT INTO \"Company\" (id, name, industry, size, description, website, \"createdAt\", \"updatedAt\")
    VALUES
        ('company_001', 'Google', 'Technology', 'LARGE', 'Entreprise technologique leader', 'https://google.com', NOW(), NOW()),
        ('company_002', 'Microsoft', 'Technology', 'LARGE', 'Entreprise software mondiale', 'https://microsoft.com', NOW(), NOW()),
        ('company_003', 'Apple', 'Technology', 'LARGE', 'Innovation technologique', 'https://apple.com', NOW(), NOW()),
        ('company_004', 'Amazon', 'E-commerce', 'LARGE', 'Plateforme e-commerce', 'https://amazon.com', NOW(), NOW()),
        ('company_005', 'Meta', 'Technology', 'LARGE', 'Réseaux sociaux', 'https://meta.com', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    "

    echo -e "${GREEN}✅ Entreprises d'exemple créées${NC}"

    # Créer des candidatures d'exemple
    echo -e "${YELLOW}📋 Insertion des candidatures...${NC}"

    docker_compose_wrapper exec -T postgres psql -U jobbingtrack -d jobbingtrack -c "
    INSERT INTO \"Application\" (id, \"userId\", \"companyName\", position, type, status, description, \"createdAt\", \"updatedAt\")
    VALUES
        ('app_001', 'admin_$(date +%s)', 'Google', 'Software Engineer', 'FULL_TIME', 'DRAFT', 'Candidature pour poste développeur', NOW(), NOW()),
        ('app_002', 'admin_$(date +%s)', 'Microsoft', 'Product Manager', 'FULL_TIME', 'APPLIED', 'Gestion de produits', NOW(), NOW()),
        ('app_003', 'admin_$(date +%s)', 'Apple', 'UX Designer', 'FULL_TIME', 'INTERVIEW', 'Design d interface', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    "

    echo -e "${GREEN}✅ Candidatures d'exemple créées${NC}"
}

# Fonction principale
main() {
    echo -e "${BLUE}🌱 Seed de la base de données JobbingTrack${NC}"
    echo "========================================"

    # Initialisation de Docker Compose (avec cache)
    if ! init_docker_compose_detection 2>/dev/null; then
        echo -e "${RED}❌ Impossible d'initialiser Docker Compose${NC}"
        exit 1
    fi

    # Vérifier PostgreSQL
    if ! check_postgres; then
        exit 1
    fi

    # Créer l'utilisateur administrateur
    if ! create_admin_user; then
        exit 1
    fi

    # Ajouter les données d'exemple
    if ! seed_sample_data; then
        exit 1
    fi

    echo -e "\n${GREEN}✅ Seed de la base de données terminé avec succès !${NC}"
    echo ""
    echo -e "${BLUE}🔑 Informations de connexion :${NC}"
    echo "   📧 Email: ${ADMIN_EMAIL:-pavel@jobbingtrack.com}"
    echo "   🔐 Mot de passe: SuperAdmin123!"
    echo ""
    echo -e "${BLUE}🌐 Accédez à l'application :${NC}"
    echo "   Frontend: http://localhost:8080"
    echo "   API Gateway: http://localhost:3000"
    echo ""
    echo -e "${YELLOW}💡 Données d'exemple ajoutées :${NC}"
    echo "   • 5 entreprises (Google, Microsoft, Apple, Amazon, Meta)"
    echo "   • 3 candidatures de test"
    echo "   • Utilisateur administrateur"

    return 0
}

# Exécution
main "$@"
