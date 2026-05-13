#!/bin/bash

# ============================================
# TEST D'ACCÈS DEPUIS LES CONTENEURS
# ============================================
# Vérifie que les conteneurs peuvent accéder aux fichiers nécessaires

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${PURPLE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 TEST D'ACCÈS DEPUIS CONTENEURS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"
echo ""

# ============================================
# VÉRIFICATION PRÉALABLE
# ============================================
echo -e "${BLUE}Vérification que les conteneurs sont démarrés...${NC}"
echo ""

SERVICES_RUNNING=$(docker ps --filter "name=jobbingtrack-" --format "{{.Names}}" | wc -l)

if [ "$SERVICES_RUNNING" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Aucun conteneur jobbingtrack démarré${NC}"
    echo ""
    echo "Pour lancer les tests, démarrez d'abord les services :"
    echo "  docker-compose up -d"
    echo ""
    echo "Ou utilisez :"
    echo "  make up-full"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ $SERVICES_RUNNING conteneurs actifs${NC}"
echo ""

# ============================================
# TEST 1 : PostgreSQL depuis conteneur
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 1: PostgreSQL depuis conteneur${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if docker ps | grep -q jobbingtrack-postgres; then
    echo "📊 Test de connexion depuis postgres vers lui-même..."
    
    if docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "\dt" > /dev/null 2>&1; then
        TABLES=$(docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
        echo "  ✅ PostgreSQL accessible"
        echo "  ✅ Tables créées: $TABLES"
    else
        echo -e "  ${RED}❌ PostgreSQL inaccessible${NC}"
    fi
else
    echo -e "${RED}❌ PostgreSQL non démarré${NC}"
fi
echo ""

# ============================================
# TEST 2 : Auth Service vers PostgreSQL
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 2: auth-service → PostgreSQL${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if docker ps | grep -q jobbingtrack-auth-service; then
    echo "📊 Test depuis auth-service..."
    
    # Vérifier variables d'environnement
    if docker exec jobbingtrack-auth-service env | grep -q "DATABASE_URL"; then
        echo "  ✅ DATABASE_URL défini"
        DB_URL=$(docker exec jobbingtrack-auth-service env | grep "DATABASE_URL" | cut -d= -f2)
        echo "  ℹ️  $DB_URL"
    else
        echo -e "  ${RED}❌ DATABASE_URL non défini${NC}"
    fi
    
    # Tester connexion réseau
    if docker exec jobbingtrack-auth-service ping -c 1 postgres > /dev/null 2>&1; then
        echo "  ✅ Peut pinguer postgres"
    else
        echo -e "  ${YELLOW}⚠️  Impossible de pinguer postgres${NC}"
    fi
    
    # Vérifier si Prisma est accessible
    if docker exec jobbingtrack-auth-service ls node_modules/@prisma/client > /dev/null 2>&1; then
        echo "  ✅ @prisma/client installé"
    else
        echo -e "  ${YELLOW}⚠️  @prisma/client non trouvé${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  auth-service non démarré${NC}"
fi
echo ""

# ============================================
# TEST 3 : Application Service vers PostgreSQL
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 3: application-service → PostgreSQL${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if docker ps | grep -q jobbingtrack-application-service; then
    echo "📊 Test depuis application-service..."
    
    if docker exec jobbingtrack-application-service env | grep -q "DATABASE_URL"; then
        echo "  ✅ DATABASE_URL défini"
    else
        echo -e "  ${RED}❌ DATABASE_URL non défini${NC}"
    fi
    
    if docker exec jobbingtrack-application-service ping -c 1 postgres > /dev/null 2>&1; then
        echo "  ✅ Peut pinguer postgres"
    else
        echo -e "  ${YELLOW}⚠️  Impossible de pinguer postgres${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  application-service non démarré${NC}"
fi
echo ""

# ============================================
# TEST 4 : Company Service vers PostgreSQL
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 4: company-service → PostgreSQL${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if docker ps | grep -q jobbingtrack-company-service; then
    echo "📊 Test depuis company-service..."
    
    if docker exec jobbingtrack-company-service env | grep -q "DATABASE_URL"; then
        echo "  ✅ DATABASE_URL défini"
    else
        echo -e "  ${RED}❌ DATABASE_URL non défini${NC}"
    fi
    
    if docker exec jobbingtrack-company-service ping -c 1 postgres > /dev/null 2>&1; then
        echo "  ✅ Peut pinguer postgres"
    else
        echo -e "  ${YELLOW}⚠️  Impossible de pinguer postgres${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  company-service non démarré${NC}"
fi
echo ""

# ============================================
# TEST 5 : Réseau Docker entre services
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 5: Réseau entre services${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if docker ps | grep -q jobbingtrack-auth-service && docker ps | grep -q jobbingtrack-application-service; then
    echo "📊 Test communication auth-service ↔ application-service..."
    
    # Test depuis auth vers application
    if docker exec jobbingtrack-auth-service ping -c 1 application-service > /dev/null 2>&1; then
        echo "  ✅ auth-service → application-service OK"
    else
        echo -e "  ${YELLOW}⚠️  auth-service → application-service KO${NC}"
    fi
    
    # Test depuis application vers auth
    if docker exec jobbingtrack-application-service ping -c 1 auth-service > /dev/null 2>&1; then
        echo "  ✅ application-service → auth-service OK"
    else
        echo -e "  ${YELLOW}⚠️  application-service → auth-service KO${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Services non démarrés${NC}"
fi
echo ""

# ============================================
# TEST 6 : Fichiers accessibles dans conteneurs
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 6: Fichiers accessibles${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if docker ps | grep -q jobbingtrack-auth-service; then
    echo "📊 Vérification depuis auth-service..."
    
    FILES=("package.json" "src/index.js" "node_modules")
    
    for file in "${FILES[@]}"; do
        if docker exec jobbingtrack-auth-service test -e "/app/$file" 2>/dev/null; then
            echo "  ✅ /app/$file accessible"
        else
            echo -e "  ${YELLOW}⚠️  /app/$file non trouvé${NC}"
        fi
    done
else
    echo -e "${YELLOW}⚠️  auth-service non démarré${NC}"
fi
echo ""

# ============================================
# TEST 7 : @jobbingtrack/database accessible
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 7: Package @jobbingtrack/database${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if docker ps | grep -q jobbingtrack-auth-service; then
    echo "📊 Vérification depuis auth-service..."
    
    # Vérifier si le package est référencé
    if docker exec jobbingtrack-auth-service grep -q "@jobbingtrack/database" package.json 2>/dev/null; then
        echo "  ✅ @jobbingtrack/database dans package.json"
        
        # Vérifier si installé
        if docker exec jobbingtrack-auth-service test -d "node_modules/@jobbingtrack/database" 2>/dev/null; then
            echo "  ✅ @jobbingtrack/database installé"
        else
            echo -e "  ${YELLOW}⚠️  @jobbingtrack/database non installé${NC}"
            echo "  ℹ️  Exécutez: docker exec jobbingtrack-auth-service npm install"
        fi
    else
        echo -e "  ${YELLOW}⚠️  @jobbingtrack/database non référencé${NC}"
        echo "  ℹ️  Exécutez: bash scripts/update-prisma-imports.sh"
    fi
else
    echo -e "${YELLOW}⚠️  auth-service non démarré${NC}"
fi
echo ""

# ============================================
# TEST 8 : Logs des services
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 8: Logs des services${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

SERVICES=$(docker ps --filter "name=jobbingtrack-" --format "{{.Names}}")

for service in $SERVICES; do
    echo "📝 Dernières lignes de $service:"
    docker logs "$service" --tail 3 2>&1 | sed 's/^/    /'
    echo ""
done

# ============================================
# RAPPORT FINAL
# ============================================
echo ""
echo -e "${PURPLE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RÉSUMÉ DES TESTS CONTENEURS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"
echo ""
echo "Services actifs: $SERVICES_RUNNING"
echo ""
echo -e "${GREEN}✅ Tests terminés${NC}"
echo ""
echo "💡 Pour voir plus de logs :"
echo "   docker logs jobbingtrack-auth-service"
echo "   docker logs jobbingtrack-postgres"
echo ""
echo "💡 Pour entrer dans un conteneur :"
echo "   docker exec -it jobbingtrack-auth-service sh"
echo ""
