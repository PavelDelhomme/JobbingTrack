#!/bin/bash

# ============================================================================
# Script de création de l'utilisateur administrateur - JobbingTrack
# ============================================================================
# Ce script crée automatiquement l'utilisateur administrateur dans la base de données

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-jobbingtrack}
DB_USER=${DB_USER:-jobbingtrack}
DB_PASSWORD=${DB_PASSWORD:-jobbingtrack123}

# Informations de l'administrateur à créer
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@jobbingtrack.com}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-password123}
ADMIN_FIRST_NAME=${ADMIN_FIRST_NAME:-Admin}
ADMIN_LAST_NAME=${ADMIN_LAST_NAME:-JobbingTrack}

echo -e "${YELLOW}👤 Création de l'utilisateur administrateur...${NC}"

# Vérifier si Docker est disponible
if command -v docker &> /dev/null; then
    echo "🐳 Utilisation de Docker pour accéder à PostgreSQL..."

    # Récupérer l'ID du conteneur PostgreSQL
    POSTGRES_CONTAINER=$(docker ps -q -f name=jobbingtrack-postgres)

    if [ -z "$POSTGRES_CONTAINER" ]; then
        echo -e "${RED}❌ Aucun conteneur PostgreSQL trouvé${NC}"
        exit 1
    fi

    echo "📦 Conteneur PostgreSQL trouvé: $POSTGRES_CONTAINER"

    # Créer l'utilisateur admin via Docker
    echo "🔧 Création de l'utilisateur administrateur dans la base de données..."

    # Créer directement avec une commande simple
    docker exec $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -c "SELECT 1;" >/dev/null 2>&1 || {
        echo -e "${RED}❌ Impossible de se connecter à PostgreSQL${NC}"
        exit 1
    }

    # Vérifier si l'utilisateur existe déjà
    EXISTS=$(docker exec $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM \"User\" WHERE email = '$ADMIN_EMAIL';" 2>/dev/null || echo "0")

    if [ "$EXISTS" = "0" ]; then
        echo "🔧 Création de l'utilisateur administrateur..."
        docker exec $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
        INSERT INTO \"User\" (email, password, \"firstName\", \"lastName\", role, \"isActive\", \"createdAt\", \"updatedAt\")
        VALUES ('$ADMIN_EMAIL', '\$2b\$10\$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36ZPfP6P.wqgU5OVgHOVCoi', '$ADMIN_FIRST_NAME', '$ADMIN_LAST_NAME', 'SUPER_ADMIN', true, NOW(), NOW());
        " 2>/dev/null || {
            echo -e "${RED}❌ Erreur lors de la création de l'utilisateur${NC}"
            exit 1
        }
    else
        echo "🔄 Utilisateur déjà existant, mise à jour..."
        docker exec $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
        UPDATE \"User\" SET
            \"firstName\" = '$ADMIN_FIRST_NAME',
            \"lastName\" = '$ADMIN_LAST_NAME',
            role = 'SUPER_ADMIN',
            \"isActive\" = true,
            \"updatedAt\" = NOW()
        WHERE email = '$ADMIN_EMAIL';
        " 2>/dev/null || {
            echo -e "${RED}❌ Erreur lors de la mise à jour de l'utilisateur${NC}"
            exit 1
        }
    fi

else
    echo -e "${YELLOW}🐳 Docker non disponible, tentative de connexion directe...${NC}"

    # Tentative de connexion directe (si PostgreSQL est accessible localement)
    if command -v psql &> /dev/null; then
        echo "🔧 Création de l'utilisateur administrateur (connexion directe)..."

        # Vérifier si l'utilisateur existe déjà
        EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM \"User\" WHERE email = '$ADMIN_EMAIL';" 2>/dev/null || echo "0")

        if [ "$EXISTS" = "0" ]; then
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
            INSERT INTO \"User\" (email, password, \"firstName\", \"lastName\", role, \"isActive\", \"createdAt\", \"updatedAt\")
            VALUES ('$ADMIN_EMAIL', '\$2b\$10\$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36ZPfP6P.wqgU5OVgHOVCoi', '$ADMIN_FIRST_NAME', '$ADMIN_LAST_NAME', 'SUPER_ADMIN', true, NOW(), NOW());
            " 2>/dev/null || {
                echo -e "${RED}❌ Erreur lors de la création de l'utilisateur${NC}"
                exit 1
            }
        else
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
            UPDATE \"User\" SET
                \"firstName\" = '$ADMIN_FIRST_NAME',
                \"lastName\" = '$ADMIN_LAST_NAME',
                role = 'SUPER_ADMIN',
                \"isActive\" = true,
                \"updatedAt\" = NOW()
            WHERE email = '$ADMIN_EMAIL';
            " 2>/dev/null || {
                echo -e "${RED}❌ Erreur lors de la mise à jour de l'utilisateur${NC}"
                exit 1
            }
        fi
    else
        echo -e "${RED}❌ PostgreSQL client non disponible${NC}"
        exit 1
    fi
fi

# Vérifier que l'utilisateur a été créé
echo "🔍 Vérification de la création de l'utilisateur..."

if command -v docker &> /dev/null && [ -n "$POSTGRES_CONTAINER" ]; then
    USER_COUNT=$(docker exec $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM \"User\" WHERE email = '$ADMIN_EMAIL';" 2>/dev/null || echo "0")
else
    USER_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM \"User\" WHERE email = '$ADMIN_EMAIL';" 2>/dev/null || echo "0")
fi

if [ "$USER_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Utilisateur administrateur créé avec succès !${NC}"
    echo ""
    echo "🔑 Informations de connexion:"
    echo "   Email:    $ADMIN_EMAIL"
    echo "   Mot de passe: $ADMIN_PASSWORD"
    echo "   Rôle:     SUPER_ADMIN"
    echo ""
    echo "🌐 Accédez à l'application:"
    echo "   Frontend: http://localhost:8080"
    echo "   API:      http://localhost:3000"
else
    echo -e "${RED}❌ Échec de la création de l'utilisateur administrateur${NC}"
    exit 1
fi
