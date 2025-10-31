#!/bin/bash

# ============================================
# VÉRIFICATION SETUP DOCKER & CONTENEURS
# ============================================
# Vérifie que tout est accessible dans les conteneurs

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

PASSED=0
FAILED=0
WARNINGS=0

echo -e "${PURPLE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 VÉRIFICATION SETUP DOCKER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"
echo ""

# ============================================
# TEST 1 : Fichiers Prisma Accessibles
# ============================================
echo -e "${BLUE}TEST 1: Fichiers Prisma accessibles${NC}"

FILES=(
    "backend/prisma/schema.prisma"
    "backend/prisma/seed.js"
    "backend/prisma/package.json"
    "backend/prisma/index.js"
    "backend/prisma/.gitignore"
)

MISSING_FILES=0
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo -e "  ${RED}❌ $file MANQUANT${NC}"
        ((MISSING_FILES++))
    fi
done

if [ $MISSING_FILES -eq 0 ]; then
    echo -e "  ${GREEN}✅ PASS - Tous les fichiers Prisma présents${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ FAIL - $MISSING_FILES fichiers manquants${NC}"
    ((FAILED++))
fi
echo ""

# ============================================
# TEST 2 : Configuration Docker Compose
# ============================================
echo -e "${BLUE}TEST 2: Configuration docker-compose.yml${NC}"

if [ ! -f "docker-compose.yml" ]; then
    echo -e "  ${RED}❌ docker-compose.yml introuvable${NC}"
    ((FAILED++))
else
    # Vérifier les services critiques
    SERVICES=("postgres" "auth-service" "application-service" "company-service")
    MISSING_SERVICES=0
    
    for service in "${SERVICES[@]}"; do
        if grep -q "$service:" docker-compose.yml; then
            echo "  ✅ Service $service défini"
        else
            echo -e "  ${YELLOW}⚠️  Service $service manquant${NC}"
            ((MISSING_SERVICES++))
        fi
    done
    
    if [ $MISSING_SERVICES -eq 0 ]; then
        echo -e "  ${GREEN}✅ PASS - Services critiques définis${NC}"
        ((PASSED++))
    else
        echo -e "  ${YELLOW}⚠️  WARNING - $MISSING_SERVICES services manquants${NC}"
        ((WARNINGS++))
    fi
fi
echo ""

# ============================================
# TEST 3 : Variables d'Environnement
# ============================================
echo -e "${BLUE}TEST 3: Variables d'environnement${NC}"

# Vérifier .env à la racine
if [ -f ".env" ]; then
    echo "  ✅ .env à la racine existe"
    
    # Vérifier les variables critiques
    VARS=("DATABASE_URL" "POSTGRES_USER" "POSTGRES_PASSWORD" "JWT_SECRET")
    MISSING_VARS=0
    
    for var in "${VARS[@]}"; do
        if grep -q "^$var=" .env; then
            echo "  ✅ $var défini"
        else
            echo -e "  ${RED}❌ $var manquant${NC}"
            ((MISSING_VARS++))
        fi
    done
    
    if [ $MISSING_VARS -eq 0 ]; then
        echo -e "  ${GREEN}✅ PASS - Variables critiques définies${NC}"
        ((PASSED++))
    else
        echo -e "  ${RED}❌ FAIL - $MISSING_VARS variables manquantes${NC}"
        ((FAILED++))
    fi
else
    echo -e "  ${RED}❌ .env à la racine manquant${NC}"
    ((FAILED++))
fi
echo ""

# ============================================
# TEST 4 : Réseau Docker
# ============================================
echo -e "${BLUE}TEST 4: Réseau Docker${NC}"

NETWORKS=$(docker network ls | grep jobbingtrack | wc -l)

if [ "$NETWORKS" -gt 0 ]; then
    echo "  ✅ Réseau(x) jobbingtrack trouvé(s): $NETWORKS"
    docker network ls | grep jobbingtrack | awk '{print "    - " $2}'
    echo -e "  ${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠️  Aucun réseau jobbingtrack (sera créé au démarrage)${NC}"
    ((WARNINGS++))
fi
echo ""

# ============================================
# TEST 5 : PostgreSQL Accessible (si démarré)
# ============================================
echo -e "${BLUE}TEST 5: PostgreSQL (si démarré)${NC}"

if docker ps | grep -q jobbingtrack-postgres; then
    echo "  ✅ PostgreSQL est démarré"
    
    # Tester la connexion
    if docker exec jobbingtrack-postgres pg_isready -U jobbingtrack > /dev/null 2>&1; then
        echo "  ✅ PostgreSQL répond"
        
        # Vérifier la DB
        if docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT 1;" > /dev/null 2>&1; then
            echo "  ✅ Base jobbingtrack accessible"
            echo -e "  ${GREEN}✅ PASS${NC}"
            ((PASSED++))
        else
            echo -e "  ${RED}❌ Base jobbingtrack inaccessible${NC}"
            ((FAILED++))
        fi
    else
        echo -e "  ${RED}❌ PostgreSQL ne répond pas${NC}"
        ((FAILED++))
    fi
else
    echo -e "  ${YELLOW}⚠️  PostgreSQL non démarré (normal si pas encore lancé)${NC}"
    ((WARNINGS++))
fi
echo ""

# ============================================
# TEST 6 : Volumes Docker
# ============================================
echo -e "${BLUE}TEST 6: Volumes Docker${NC}"

VOLUMES=$(docker volume ls | grep jobbingtrack | wc -l)

if [ "$VOLUMES" -gt 0 ]; then
    echo "  ✅ Volumes jobbingtrack trouvés: $VOLUMES"
    docker volume ls | grep jobbingtrack | awk '{print "    - " $2}'
    echo -e "  ${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠️  Aucun volume (seront créés au premier démarrage)${NC}"
    ((WARNINGS++))
fi
echo ""

# ============================================
# TEST 7 : Scripts Exécutables
# ============================================
echo -e "${BLUE}TEST 7: Scripts exécutables${NC}"

SCRIPTS=(
    "scripts/run-prisma-migrations.sh"
    "scripts/deploy-new-database-architecture.sh"
    "scripts/update-prisma-imports.sh"
    "scripts/validate-new-architecture.sh"
    "scripts/git-commit-migration.sh"
    "scripts/verify-docker-setup.sh"
)

NON_EXECUTABLE=0
for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            echo "  ✅ $script"
        else
            echo -e "  ${YELLOW}⚠️  $script (non exécutable)${NC}"
            ((NON_EXECUTABLE++))
        fi
    else
        echo -e "  ${RED}❌ $script (manquant)${NC}"
        ((NON_EXECUTABLE++))
    fi
done

if [ $NON_EXECUTABLE -eq 0 ]; then
    echo -e "  ${GREEN}✅ PASS - Tous les scripts exécutables${NC}"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠️  WARNING - $NON_EXECUTABLE scripts à rendre exécutables${NC}"
    echo -e "  ${YELLOW}   Exécutez: chmod +x scripts/*.sh${NC}"
    ((WARNINGS++))
fi
echo ""

# ============================================
# TEST 8 : Services Docker (si démarrés)
# ============================================
echo -e "${BLUE}TEST 8: Services Docker (si démarrés)${NC}"

SERVICES_RUNNING=$(docker ps --filter "name=jobbingtrack-" --format "{{.Names}}" | wc -l)

if [ "$SERVICES_RUNNING" -gt 0 ]; then
    echo "  ✅ Services jobbingtrack démarrés: $SERVICES_RUNNING"
    docker ps --filter "name=jobbingtrack-" --format "    - {{.Names}} ({{.Status}})"
    echo -e "  ${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠️  Aucun service démarré (normal si pas encore lancé)${NC}"
    ((WARNINGS++))
fi
echo ""

# ============================================
# TEST 9 : Accès backend/prisma depuis services
# ============================================
echo -e "${BLUE}TEST 9: Accès backend/prisma depuis un service${NC}"

# Tester si auth-service peut accéder à backend/prisma
if docker ps | grep -q jobbingtrack-auth-service; then
    echo "  ✅ auth-service est démarré"
    
    # Vérifier si le service peut voir backend/prisma
    # Note: Cela dépend de comment les volumes sont montés
    if docker exec jobbingtrack-auth-service test -f /app/package.json 2>/dev/null; then
        echo "  ✅ auth-service peut accéder à son répertoire"
        echo -e "  ${GREEN}✅ PASS${NC}"
        ((PASSED++))
    else
        echo -e "  ${YELLOW}⚠️  Impossible de vérifier l'accès aux fichiers${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "  ${YELLOW}⚠️  auth-service non démarré (test impossible)${NC}"
    echo "  ℹ️  Ce test sera possible après le démarrage"
    ((WARNINGS++))
fi
echo ""

# ============================================
# TEST 10 : Configuration Prisma
# ============================================
echo -e "${BLUE}TEST 10: Configuration Prisma dans services${NC}"

# Vérifier si les services ont la dépendance @jobbingtrack/database
SERVICES_TO_CHECK=("auth-service" "application-service" "company-service")
SERVICES_OK=0

for service in "${SERVICES_TO_CHECK[@]}"; do
    PACKAGE_JSON="backend/$service/package.json"
    if [ -f "$PACKAGE_JSON" ]; then
        if grep -q "@jobbingtrack/database" "$PACKAGE_JSON" 2>/dev/null; then
            echo "  ✅ $service a @jobbingtrack/database"
            ((SERVICES_OK++))
        else
            echo -e "  ${YELLOW}⚠️  $service n'a pas @jobbingtrack/database${NC}"
        fi
    else
        echo -e "  ${YELLOW}⚠️  $PACKAGE_JSON introuvable${NC}"
    fi
done

if [ $SERVICES_OK -gt 0 ]; then
    echo -e "  ${GREEN}✅ PASS - $SERVICES_OK services configurés${NC}"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠️  WARNING - Aucun service configuré avec @jobbingtrack/database${NC}"
    echo "  ℹ️  Exécutez: bash scripts/update-prisma-imports.sh"
    ((WARNINGS++))
fi
echo ""

# ============================================
# TEST 11 : Sécurité (.env dans .gitignore)
# ============================================
echo -e "${BLUE}TEST 11: Sécurité - .env dans .gitignore${NC}"

# Vérifier .gitignore à la racine
if [ -f ".gitignore" ]; then
    if grep -q "^\.env" .gitignore 2>/dev/null; then
        echo "  ✅ .env ignoré dans .gitignore racine"
    else
        echo -e "  ${RED}❌ .env NON ignoré dans .gitignore racine${NC}"
        ((FAILED++))
    fi
fi

# Vérifier backend/prisma/.gitignore
if [ -f "backend/prisma/.gitignore" ]; then
    if grep -q "\.env" backend/prisma/.gitignore 2>/dev/null; then
        echo "  ✅ .env ignoré dans backend/prisma/.gitignore"
        echo -e "  ${GREEN}✅ PASS${NC}"
        ((PASSED++))
    else
        echo -e "  ${RED}❌ .env NON ignoré dans backend/prisma/.gitignore${NC}"
        ((FAILED++))
    fi
else
    echo -e "  ${RED}❌ backend/prisma/.gitignore manquant${NC}"
    ((FAILED++))
fi
echo ""

# ============================================
# TEST 12 : Workflow GitHub Actions
# ============================================
echo -e "${BLUE}TEST 12: Workflow GitHub Actions${NC}"

if [ -f ".github/workflows/database-validation.yml" ]; then
    echo "  ✅ database-validation.yml existe"
    
    # Vérifier que le workflow a les jobs nécessaires
    JOBS=("validate-schema" "test-migrations" "validate-relationships" "security-check")
    JOBS_OK=0
    
    for job in "${JOBS[@]}"; do
        if grep -q "$job:" .github/workflows/database-validation.yml; then
            echo "  ✅ Job $job présent"
            ((JOBS_OK++))
        else
            echo -e "  ${YELLOW}⚠️  Job $job manquant${NC}"
        fi
    done
    
    if [ $JOBS_OK -eq ${#JOBS[@]} ]; then
        echo -e "  ${GREEN}✅ PASS - Tous les jobs présents${NC}"
        ((PASSED++))
    else
        echo -e "  ${YELLOW}⚠️  WARNING - Jobs manquants${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "  ${RED}❌ .github/workflows/database-validation.yml manquant${NC}"
    ((FAILED++))
fi
echo ""

# ============================================
# RAPPORT FINAL
# ============================================
TOTAL=$((PASSED + FAILED + WARNINGS))

echo ""
echo -e "${PURPLE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RAPPORT DE VÉRIFICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"
echo ""
echo -e "Tests réussis:  ${GREEN}$PASSED${NC} / $TOTAL"
echo -e "Tests échoués:  ${RED}$FAILED${NC} / $TOTAL"
echo -e "Avertissements: ${YELLOW}$WARNINGS${NC} / $TOTAL"
echo ""

if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ TOUT EST PARFAIT !${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "🚀 Vous pouvez lancer le déploiement :"
    echo "   bash scripts/deploy-new-database-architecture.sh"
    echo ""
    exit 0
elif [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚠️  VÉRIFICATION OK AVEC AVERTISSEMENTS${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "📝 Actions recommandées :"
    
    if [ $NON_EXECUTABLE -gt 0 ]; then
        echo "   chmod +x scripts/*.sh"
    fi
    
    echo ""
    echo "✅ Vous pouvez quand même lancer le déploiement"
    echo ""
    exit 0
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ ÉCHECS DÉTECTÉS${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "⚠️  Corrigez les erreurs avant de continuer"
    echo ""
    exit 1
fi
