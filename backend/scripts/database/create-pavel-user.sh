#!/bin/bash

# ============================================================================
# Script de création de l'utilisateur Pavel - JobbingTrack
# ============================================================================

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

# Informations de Pavel
PAVEL_EMAIL="pavel@jobbingtrack.com"
PAVEL_PASSWORD="password123"
PAVEL_FIRST_NAME="Pavel"
PAVEL_LAST_NAME="Delhomme"

echo -e "${YELLOW}👤 Création de l'utilisateur Pavel...${NC}"

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

    # Créer l'utilisateur Pavel via Docker
    echo "🔧 Création de l'utilisateur Pavel dans la base de données..."

    # Vérifier la connexion
    docker exec $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -c "SELECT 1;" >/dev/null 2>&1 || {
        echo -e "${RED}❌ Impossible de se connecter à PostgreSQL${NC}"
        exit 1
    }

    # D'abord, vérifier si la table User existe
    echo "🔍 Vérification de l'existence de la table User..."
    TABLE_EXISTS=$(docker exec $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User');" 2>/dev/null | tr -d ' \t\n\r')
    
    echo "🔍 Résultat de la vérification: '$TABLE_EXISTS'"
    
    if [ "$TABLE_EXISTS" != "t" ]; then
        echo -e "${YELLOW}⚠️  La table User n'existe pas dans la base principale${NC}"
        echo -e "${YELLOW}🔍 Tentative de création via le service auth-service...${NC}"
        
        # Essayer de créer l'utilisateur via le service auth-service
        AUTH_CONTAINER=$(docker ps -q -f name=jobbingtrack-auth-service)
        if [ -n "$AUTH_CONTAINER" ]; then
            echo "📦 Service auth-service trouvé: $AUTH_CONTAINER"
            
            # D'abord, s'assurer que le schéma est appliqué à la base de données
            echo -e "${YELLOW}🔧 Application du schéma Prisma dans auth-service...${NC}"
            docker exec $AUTH_CONTAINER npx prisma db push --accept-data-loss || {
                echo -e "${RED}❌ Impossible d'appliquer le schéma Prisma${NC}"
                exit 1
            }
            
            # Régénérer le client Prisma au cas où
            echo -e "${YELLOW}🔧 Régénération du client Prisma...${NC}"
            docker exec $AUTH_CONTAINER npx prisma generate 2>/dev/null
            
            echo -e "${YELLOW}💡 Création manuelle de l'utilisateur Pavel via Node.js...${NC}"
            docker exec $AUTH_CONTAINER node -e "
            const { PrismaClient } = require('@prisma/client');
            const bcrypt = require('bcryptjs');
            
            async function createPavel() {
                const prisma = new PrismaClient();
                try {
                    const hashedPassword = await bcrypt.hash('$PAVEL_PASSWORD', 10);
                    const user = await prisma.user.upsert({
                        where: { email: '$PAVEL_EMAIL' },
                        update: {
                            firstName: '$PAVEL_FIRST_NAME',
                            lastName: '$PAVEL_LAST_NAME',
                            role: 'SUPER_ADMIN',
                            isActive: true
                        },
                        create: {
                            email: '$PAVEL_EMAIL',
                            password: hashedPassword,
                            firstName: '$PAVEL_FIRST_NAME',
                            lastName: '$PAVEL_LAST_NAME',
                            role: 'SUPER_ADMIN',
                            isActive: true
                        }
                    });
                    console.log('✅ Utilisateur Pavel créé/mis à jour:', user.email);
                } catch (error) {
                    console.error('❌ Erreur:', error.message);
                    process.exit(1);
                } finally {
                    await prisma.\$disconnect();
                }
            }
            createPavel();
            " || echo -e "${RED}❌ Impossible de créer l'utilisateur via Node.js${NC}"
            exit 0
        else
            echo -e "${RED}❌ Service auth-service non trouvé${NC}"
            exit 1
        fi
    fi
    
    # Vérifier si l'utilisateur existe déjà
    EXISTS=$(docker exec $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM \"User\" WHERE email = '$PAVEL_EMAIL';" 2>/dev/null || echo "0")

    if [ "$EXISTS" = "0" ]; then
        echo "🔧 Création de l'utilisateur Pavel..."
        docker exec $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
        INSERT INTO \"User\" (email, password, \"firstName\", \"lastName\", role, \"isActive\", \"createdAt\", \"updatedAt\")
        VALUES ('$PAVEL_EMAIL', '\$2b\$10\$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36ZPfP6P.wqgU5OVgHOVCoi', '$PAVEL_FIRST_NAME', '$PAVEL_LAST_NAME', 'SUPER_ADMIN', true, NOW(), NOW());
        " 2>&1 || {
            echo -e "${RED}❌ Erreur lors de la création de l'utilisateur${NC}"
            echo -e "${YELLOW}💡 La table User existe-t-elle ? Lancez 'make db-migrate' si nécessaire${NC}"
            exit 1
        }
    else
        echo "🔄 Utilisateur déjà existant, mise à jour..."
        docker exec $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
        UPDATE \"User\" SET
            \"firstName\" = '$PAVEL_FIRST_NAME',
            \"lastName\" = '$PAVEL_LAST_NAME',
            role = 'SUPER_ADMIN',
            \"isActive\" = true,
            \"updatedAt\" = NOW()
        WHERE email = '$PAVEL_EMAIL';
        " 2>/dev/null || {
            echo -e "${RED}❌ Erreur lors de la mise à jour de l'utilisateur${NC}"
            exit 1
        }
    fi
fi

# Vérifier que l'utilisateur a été créé
echo "🔍 Vérification de la création de l'utilisateur..."

if command -v docker &> /dev/null && [ -n "$POSTGRES_CONTAINER" ]; then
    USER_COUNT=$(docker exec $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM \"User\" WHERE email = '$PAVEL_EMAIL';" 2>/dev/null || echo "0")
fi

if [ "$USER_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Utilisateur Pavel créé avec succès !${NC}"
    echo ""
    echo "🔑 Informations de connexion:"
    echo "   Email:    $PAVEL_EMAIL"
    echo "   Mot de passe: $PAVEL_PASSWORD"
    echo "   Rôle:     SUPER_ADMIN"
    echo ""
    echo "🌐 Accédez à l'application:"
    echo "   Frontend: http://localhost:8080"
    echo "   API:      http://localhost:3000"
else
    echo -e "${RED}❌ Échec de la création de l'utilisateur Pavel${NC}"
    exit 1
fi
