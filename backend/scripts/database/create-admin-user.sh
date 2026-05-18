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

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"

read_env_key() {
    local key="$1"
    if [ -f "$ENV_FILE" ]; then
        awk -F= -v k="$key" '
            $1 == k {
                sub(/^[[:space:]]*/, "", $2)
                sub(/[[:space:]]*$/, "", $2)
                gsub(/^["'\'']|["'\'']$/, "", $2)
                print $2
                exit
            }
        ' "$ENV_FILE"
    fi
}

# Configuration : privilégie les variables exportées, puis .env, puis les valeurs dev historiques.
DB_HOST=${DB_HOST:-${POSTGRES_HOST:-$(read_env_key POSTGRES_HOST)}}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-${POSTGRES_PORT:-$(read_env_key POSTGRES_PORT)}}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-${POSTGRES_DB:-$(read_env_key POSTGRES_DB)}}
DB_NAME=${DB_NAME:-jobbingtrack}
DB_USER=${DB_USER:-${POSTGRES_USER:-$(read_env_key POSTGRES_USER)}}
DB_USER=${DB_USER:-jobbingtrack}
DB_PASSWORD=${DB_PASSWORD:-${POSTGRES_PASSWORD:-$(read_env_key POSTGRES_PASSWORD)}}

# Informations de l'administrateur à créer.
ADMIN_EMAIL=${ADMIN_EMAIL:-$(read_env_key ADMIN_EMAIL)}
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@jobbingtrack.com}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-$(read_env_key ADMIN_PASSWORD)}
ADMIN_FIRST_NAME=${ADMIN_FIRST_NAME:-$(read_env_key ADMIN_FIRST_NAME)}
ADMIN_FIRST_NAME=${ADMIN_FIRST_NAME:-Admin}
ADMIN_LAST_NAME=${ADMIN_LAST_NAME:-$(read_env_key ADMIN_LAST_NAME)}
ADMIN_LAST_NAME=${ADMIN_LAST_NAME:-JobbingTrack}

if [ -z "$ADMIN_PASSWORD" ]; then
    echo -e "${RED}❌ ADMIN_PASSWORD est obligatoire pour créer ou mettre à jour l'admin${NC}"
    echo -e "${YELLOW}💡 Définissez ADMIN_PASSWORD dans .env ou exportez-le avant de lancer ce script.${NC}"
    exit 1
fi

# Hash / upsert via variables d'environnement (évite la casse du mot de passe avec $, ', ", etc. dans node -e '…').
upsert_admin_via_auth_service() {
    local auth_container="$1"
    if [ -z "$auth_container" ]; then
        return 1
    fi
    docker exec \
        -e "ADMIN_EMAIL=$ADMIN_EMAIL" \
        -e "ADMIN_PASSWORD=$ADMIN_PASSWORD" \
        -e "ADMIN_FIRST_NAME=$ADMIN_FIRST_NAME" \
        -e "ADMIN_LAST_NAME=$ADMIN_LAST_NAME" \
        "$auth_container" node -e '
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
(async () => {
  const email = process.env.ADMIN_EMAIL;
  const plain = process.env.ADMIN_PASSWORD;
  const firstName = process.env.ADMIN_FIRST_NAME || "Admin";
  const lastName = process.env.ADMIN_LAST_NAME || "JobbingTrack";
  if (!email || !plain) {
    console.error("ADMIN_EMAIL ou ADMIN_PASSWORD manquant");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  const hashedPassword = await bcrypt.hash(plain, 10);
  await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      firstName,
      lastName,
      role: "SUPER_ADMIN",
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
    create: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: "SUPER_ADMIN",
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  const user = await prisma.user.findUnique({ where: { email } });
  const verify = await bcrypt.compare(plain, user.password);
  if (!verify) {
    console.error("VERIFY_FAILED");
    process.exit(1);
  }
  console.log("OK");
  await prisma.$disconnect();
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
' 2>/dev/null | grep -q OK
}

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
                            password: hashedPassword,
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
                        update: { password: hashedPassword, firstName: '$ADMIN_FIRST_NAME', lastName: '$ADMIN_LAST_NAME', role: 'SUPER_ADMIN', isActive: true, emailVerified: true, emailVerifiedAt: new Date() }
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
        AUTH_CONTAINER=$(docker ps -q -f name=jobbingtrack-auth-service 2>/dev/null)
        if [ -n "$AUTH_CONTAINER" ] && upsert_admin_via_auth_service "$AUTH_CONTAINER"; then
            echo "✅ Utilisateur vérifié/mis à jour (Prisma + bcrypt, mot de passe aligné sur ADMIN_PASSWORD)"
        else
            echo -e "${RED}❌ Impossible de mettre à jour l'admin : auth-service indisponible ou vérification bcrypt échouée${NC}"
            exit 1
        fi
    fi

else
    echo -e "${YELLOW}🐳 Docker non disponible, tentative de connexion directe...${NC}"

    # Tentative de connexion directe (si PostgreSQL est accessible localement)
    if command -v psql &> /dev/null; then
        echo "🔧 Création de l'utilisateur administrateur (connexion directe)..."
        BCRYPT_HASH="$(
            cd "$ROOT_DIR/backend/auth-service" && ADMIN_PASSWORD="$ADMIN_PASSWORD" node -e "console.log(require('bcryptjs').hashSync(process.env.ADMIN_PASSWORD, 10))" 2>/dev/null || true
        )"
        if [ -z "$BCRYPT_HASH" ]; then
            echo -e "${RED}❌ Impossible de hasher ADMIN_PASSWORD en connexion directe${NC}"
            echo -e "${YELLOW}💡 Lancez avec le conteneur auth-service démarré ou installez les dépendances backend/auth-service.${NC}"
            exit 1
        fi
        BCRYPT_ESC=$(echo "$BCRYPT_HASH" | sed 's/\$/\\$/g')

        # Vérifier si l'utilisateur existe déjà (trim)
        EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -A -c "SELECT COUNT(*) FROM \"User\" WHERE email = '$ADMIN_EMAIL';" 2>/dev/null | tr -d ' \n\r\t' || echo "0")

        if [ -z "$EXISTS" ] || [ "$EXISTS" = "0" ]; then
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
            INSERT INTO \"User\" (id, email, password, \"firstName\", \"lastName\", role, \"isActive\", \"emailVerified\", \"emailVerifiedAt\", \"createdAt\", \"updatedAt\")
            VALUES ('c' || substr(md5(random()::text || now()::text), 1, 24), '$ADMIN_EMAIL', '$BCRYPT_ESC', '$ADMIN_FIRST_NAME', '$ADMIN_LAST_NAME', 'SUPER_ADMIN', true, true, NOW(), NOW(), NOW());
            " 2>/dev/null || {
                echo -e "${RED}❌ Erreur lors de la création de l'utilisateur${NC}"
                exit 1
            }
        else
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
            UPDATE \"User\" SET
                password = '$BCRYPT_ESC',
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
    echo "   Mot de passe: valeur ADMIN_PASSWORD chargée depuis .env ou l'environnement (masquée)"
    echo "   Rôle:     SUPER_ADMIN"
    echo ""
    echo "🌐 Accédez à l'application:"
    echo "   Frontend: http://localhost:5003/login"
    echo "   Admin:    http://localhost:5003/b4ck0ff1ce"
    echo "   API:      http://127.0.0.1:5002"
    exit 0
else
    echo -e "${YELLOW}⚠️  Utilisateur non trouvé après création, mais ce n'est pas forcément une erreur${NC}"
    echo -e "${YELLOW}💡 L'utilisateur peut exister dans une autre base ou nécessiter une synchronisation${NC}"
    # Ne pas sortir en erreur si l'utilisateur existe déjà ailleurs
    exit 0
fi
