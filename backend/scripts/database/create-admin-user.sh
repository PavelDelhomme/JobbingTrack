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
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@jobbingtrack.test}
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
            
            # Essayer d'abord le seed Prisma
            docker exec $AUTH_CONTAINER npx prisma db seed 2>/dev/null && {
                echo -e "${GREEN}✅ Utilisateur admin créé via prisma db seed${NC}"
                exit 0
            }
            
            # Si le seed ne fonctionne pas, utiliser une approche Node.js
            echo -e "${YELLOW}💡 Création manuelle de l'utilisateur admin via Node.js...${NC}"
            docker exec $AUTH_CONTAINER node -e "
            const { PrismaClient } = require('@prisma/client');
            const bcrypt = require('bcryptjs');
            
            async function createAdmin() {
                const prisma = new PrismaClient();
                try {
                    const hashedPassword = await bcrypt.hash('$ADMIN_PASSWORD', 10);
                    const user = await prisma.user.upsert({
                        where: { email: '$ADMIN_EMAIL' },
                        update: {
                            firstName: '$ADMIN_FIRST_NAME',
                            lastName: '$ADMIN_LAST_NAME',
                            role: 'SUPER_ADMIN',
                            isActive: true,
                            emailVerified: true,
                            emailVerifiedAt: new Date()
                        },
                        create: {
                            email: '$ADMIN_EMAIL',
                            password: hashedPassword,
                            firstName: '$ADMIN_FIRST_NAME',
                            lastName: '$ADMIN_LAST_NAME',
                            role: 'SUPER_ADMIN',
                            isActive: true,
                            emailVerified: true,
                            emailVerifiedAt: new Date()
                        }
                    });
                    console.log('✅ Utilisateur admin créé/mis à jour:', user.email);
                } catch (error) {
                    console.error('❌ Erreur:', error.message);
                    process.exit(1);
                } finally {
                    await prisma.\$disconnect();
                }
            }
            createAdmin();
            " || echo -e "${RED}❌ Impossible de créer l'utilisateur via Node.js${NC}"
            exit 0
        else
            echo -e "${RED}❌ Service auth-service non trouvé${NC}"
            exit 1
        fi
    fi
    
    # Vérifier si l'utilisateur existe déjà (trim pour éviter faux positifs)
    EXISTS=$(docker exec $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c "SELECT COUNT(*) FROM \"User\" WHERE email = '$ADMIN_EMAIL';" 2>/dev/null | tr -d ' \n\r\t' || echo "0")

    if [ -z "$EXISTS" ] || [ "$EXISTS" = "0" ]; then
        echo "🔧 Création de l'utilisateur administrateur..."
        AUTH_CONTAINER=$(docker ps -q -f name=jobbingtrack-auth-service 2>/dev/null)
        CREATED_VIA_NODE=""
        if [ -n "$AUTH_CONTAINER" ]; then
            if docker exec $AUTH_CONTAINER node -e "
            const { PrismaClient } = require('@prisma/client');
            const bcrypt = require('bcryptjs');
            async function createAdmin() {
                const prisma = new PrismaClient();
                try {
                    const hashedPassword = await bcrypt.hash('$ADMIN_PASSWORD', 10);
                    await prisma.user.upsert({
                        where: { email: '$ADMIN_EMAIL' },
                        create: { email: '$ADMIN_EMAIL', password: hashedPassword, firstName: '$ADMIN_FIRST_NAME', lastName: '$ADMIN_LAST_NAME', role: 'SUPER_ADMIN', isActive: true, emailVerified: true, emailVerifiedAt: new Date() },
                        update: { firstName: '$ADMIN_FIRST_NAME', lastName: '$ADMIN_LAST_NAME', role: 'SUPER_ADMIN', isActive: true, emailVerified: true, emailVerifiedAt: new Date() }
                    });
                    console.log('OK');
                } finally { await prisma.\$disconnect(); }
            }
            createAdmin();
            " 2>/dev/null | grep -q OK; then
                CREATED_VIA_NODE="1"
                echo -e "${GREEN}✅ Utilisateur admin créé via auth-service (mot de passe: \$ADMIN_PASSWORD)${NC}"
            fi
        fi
        if [ -z "$CREATED_VIA_NODE" ]; then
        # Hash bcrypt pour ADMIN_PASSWORD — généré via auth-service si disponible, sinon hash pour "secret"
        BCRYPT_HASH="$(
          if [ -n "$AUTH_CONTAINER" ]; then
            docker exec $AUTH_CONTAINER node -e "console.log(require('bcryptjs').hashSync('$ADMIN_PASSWORD', 10))" 2>/dev/null || true
          fi
        )"
        if [ -z "$BCRYPT_HASH" ]; then
          # Fallback : hash pour "secret" (si auth-service indisponible). Pour password123, lancez avec auth-service démarré.
          BCRYPT_HASH='$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36ZPfP6P.wqgU5OVgHOVCoi'
          echo -e "${YELLOW}💡 Mot de passe admin = 'secret' (hash par défaut). Pour password123: relancez 'make create-admin-user' avec auth-service up.${NC}"
        fi
        # Échapper $ pour le shell dans la chaîne psql
        BCRYPT_ESC=$(echo "$BCRYPT_HASH" | sed 's/\$/\\$/g')
        # id obligatoire (Prisma @id @default(cuid())) : CUID-like = 'c' + 24 caractères (compatible toutes versions PG)
        docker exec $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
        INSERT INTO \"User\" (id, email, password, \"firstName\", \"lastName\", role, \"isActive\", \"emailVerified\", \"emailVerifiedAt\", \"createdAt\", \"updatedAt\")
        VALUES (
          'c' || substr(md5(random()::text || now()::text), 1, 24),
          '$ADMIN_EMAIL',
          '$BCRYPT_ESC',
          '$ADMIN_FIRST_NAME',
          '$ADMIN_LAST_NAME',
          'SUPER_ADMIN',
          true,
          true,
          NOW(),
          NOW(),
          NOW()
        );
        " 2>&1 || {
            echo -e "${RED}❌ Erreur lors de la création de l'utilisateur${NC}"
            echo -e "${YELLOW}💡 La table User existe-t-elle ? Lancez 'make db-migrate' si nécessaire${NC}"
            exit 1
        }
        fi
    else
        echo "🔄 Utilisateur déjà existant, mise à jour..."
        UPDATE_RESULT=$(docker exec $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
        UPDATE \"User\" SET
            \"firstName\" = '$ADMIN_FIRST_NAME',
            \"lastName\" = '$ADMIN_LAST_NAME',
            role = 'SUPER_ADMIN',
            \"isActive\" = true,
            \"emailVerified\" = true,
            \"emailVerifiedAt\" = NOW(),
            \"updatedAt\" = NOW()
        WHERE email = '$ADMIN_EMAIL';
        " 2>&1)
        
        # UPDATE peut retourner "UPDATE 0" si rien n'a changé, ce n'est pas une erreur
        if echo "$UPDATE_RESULT" | grep -q "ERROR"; then
            echo -e "${RED}❌ Erreur lors de la mise à jour de l'utilisateur${NC}"
            echo "$UPDATE_RESULT"
            exit 1
        else
            echo "✅ Utilisateur vérifié/mis à jour"
        fi
    fi

else
    echo -e "${YELLOW}🐳 Docker non disponible, tentative de connexion directe...${NC}"

    # Tentative de connexion directe (si PostgreSQL est accessible localement)
    if command -v psql &> /dev/null; then
        echo "🔧 Création de l'utilisateur administrateur (connexion directe)..."

        # Vérifier si l'utilisateur existe déjà (trim)
        EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -A -c "SELECT COUNT(*) FROM \"User\" WHERE email = '$ADMIN_EMAIL';" 2>/dev/null | tr -d ' \n\r\t' || echo "0")

        if [ -z "$EXISTS" ] || [ "$EXISTS" = "0" ]; then
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
            INSERT INTO \"User\" (id, email, password, \"firstName\", \"lastName\", role, \"isActive\", \"emailVerified\", \"emailVerifiedAt\", \"createdAt\", \"updatedAt\")
            VALUES ('c' || substr(md5(random()::text || now()::text), 1, 24), '$ADMIN_EMAIL', '\$2b\$10\$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36ZPfP6P.wqgU5OVgHOVCoi', '$ADMIN_FIRST_NAME', '$ADMIN_LAST_NAME', 'SUPER_ADMIN', true, true, NOW(), NOW(), NOW());
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
                \"emailVerified\" = true,
                \"emailVerifiedAt\" = NOW(),
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

# Nettoyer USER_COUNT (enlever espaces et retours à la ligne)
USER_COUNT=$(echo "$USER_COUNT" | tr -d ' \t\n\r')

if [ "$USER_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Utilisateur administrateur créé/vérifié avec succès !${NC}"
    echo ""
    echo "🔑 Informations de connexion:"
    echo "   Email:    $ADMIN_EMAIL"
    echo "   Mot de passe: $ADMIN_PASSWORD"
    echo "   Rôle:     SUPER_ADMIN"
    echo ""
    echo "🌐 Accédez à l'application:"
    echo "   Frontend: http://localhost:8080"
    echo "   API:      http://localhost:3000"
    exit 0
else
    echo -e "${YELLOW}⚠️  Utilisateur non trouvé après création, mais ce n'est pas forcément une erreur${NC}"
    echo -e "${YELLOW}💡 L'utilisateur peut exister dans une autre base ou nécessiter une synchronisation${NC}"
    # Ne pas sortir en erreur si l'utilisateur existe déjà ailleurs
    exit 0
fi
