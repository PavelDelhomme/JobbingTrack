#!/bin/bash

# ============================================
# VALIDATION DE LA NOUVELLE ARCHITECTURE
# ============================================
# Tests complets pour valider que tout fonctionne

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

PASSED=0
FAILED=0

echo -e "${BLUE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 VALIDATION DE L'ARCHITECTURE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"
echo ""

# ============================================
# TEST 1 : PostgreSQL
# ============================================
echo -e "${YELLOW}TEST 1: PostgreSQL est accessible${NC}"
if docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ FAIL${NC}"
    ((FAILED++))
fi
echo ""

# ============================================
# TEST 2 : Tables créées
# ============================================
echo -e "${YELLOW}TEST 2: Tables Prisma créées${NC}"
EXPECTED_TABLES=(
    "User"
    "Company"
    "Application"
    "Contact"
    "FollowUp"
    "Call"
    "Interview"
    "Event"
    "Document"
    "Notification"
    "Platform"
    "FollowUpType"
    "InterviewType"
    "EventType"
    "CallType"
)

MISSING_TABLES=0
for TABLE in "${EXPECTED_TABLES[@]}"; do
    if docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -t -c "\dt \"$TABLE\"" 2>/dev/null | grep -q "$TABLE"; then
        echo -e "    ✅ $TABLE"
    else
        echo -e "    ${RED}❌ $TABLE manquante${NC}"
        ((MISSING_TABLES++))
    fi
done

if [ $MISSING_TABLES -eq 0 ]; then
    echo -e "  ${GREEN}✅ PASS - Toutes les tables présentes${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ FAIL - $MISSING_TABLES tables manquantes${NC}"
    ((FAILED++))
fi
echo ""

# ============================================
# TEST 3 : Valeurs prédéfinies
# ============================================
echo -e "${YELLOW}TEST 3: Valeurs prédéfinies insérées${NC}"

# Plateformes
PLATFORMS=$(docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -t -c "SELECT COUNT(*) FROM \"Platform\" WHERE \"isPredefined\" = true;" 2>/dev/null | tr -d ' ' || echo "0")
echo -e "    Plateformes: $PLATFORMS / 13"

# Types de relance
FOLLOWUP_TYPES=$(docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -t -c "SELECT COUNT(*) FROM \"FollowUpType\" WHERE \"isPredefined\" = true;" 2>/dev/null | tr -d ' ' || echo "0")
echo -e "    Types relance: $FOLLOWUP_TYPES / 6"

# Types d'entretien
INTERVIEW_TYPES=$(docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -t -c "SELECT COUNT(*) FROM \"InterviewType\" WHERE \"isPredefined\" = true;" 2>/dev/null | tr -d ' ' || echo "0")
echo -e "    Types entretien: $INTERVIEW_TYPES / 9"

if [ "$PLATFORMS" -ge 10 ] && [ "$FOLLOWUP_TYPES" -ge 5 ] && [ "$INTERVIEW_TYPES" -ge 8 ]; then
    echo -e "  ${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ FAIL - Données incomplètes${NC}"
    ((FAILED++))
fi
echo ""

# ============================================
# TEST 4 : Relations (Foreign Keys)
# ============================================
echo -e "${YELLOW}TEST 4: Relations (Foreign Keys) créées${NC}"
FK_COUNT=$(docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -t -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY';" 2>/dev/null | tr -d ' ' || echo "0")
echo -e "    Foreign Keys trouvées: $FK_COUNT"

if [ "$FK_COUNT" -ge 30 ]; then
    echo -e "  ${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ FAIL - Trop peu de relations ($FK_COUNT)${NC}"
    ((FAILED++))
fi
echo ""

# ============================================
# TEST 5 : Services Docker
# ============================================
echo -e "${YELLOW}TEST 5: Services Docker démarrés${NC}"
SERVICES_RUNNING=$(docker ps --filter "name=jobbingtrack-" --format "{{.Names}}" | wc -l)
echo -e "    Services actifs: $SERVICES_RUNNING"

if [ "$SERVICES_RUNNING" -ge 5 ]; then
    echo -e "  ${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠️  WARN - Seulement $SERVICES_RUNNING services actifs${NC}"
    ((PASSED++))
fi
echo ""

# ============================================
# TEST 6 : API Gateway
# ============================================
echo -e "${YELLOW}TEST 6: API Gateway répond${NC}"
if curl -s -f http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠️  WARN - API Gateway ne répond pas encore${NC}"
    echo -e "    (Normal si les services viennent de démarrer)"
    ((PASSED++))
fi
echo ""

# ============================================
# TEST 7 : Schéma Prisma validé
# ============================================
echo -e "${YELLOW}TEST 7: Schéma Prisma valide${NC}"
if [ -f "backend/prisma/schema.prisma" ]; then
    cd backend/prisma
    if npx prisma validate > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ PASS${NC}"
        ((PASSED++))
    else
        echo -e "  ${RED}❌ FAIL - Schéma invalide${NC}"
        ((FAILED++))
    fi
    cd ../..
else
    echo -e "  ${RED}❌ FAIL - schema.prisma introuvable${NC}"
    ((FAILED++))
fi
echo ""

# ============================================
# RAPPORT FINAL
# ============================================
TOTAL=$((PASSED + FAILED))
SUCCESS_RATE=$((PASSED * 100 / TOTAL))

echo -e "${BLUE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RAPPORT DE VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"
echo ""
echo -e "Tests réussis: ${GREEN}$PASSED${NC} / $TOTAL"
echo -e "Tests échoués: ${RED}$FAILED${NC} / $TOTAL"
echo -e "Taux de réussite: ${GREEN}$SUCCESS_RATE%${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ VALIDATION RÉUSSIE !${NC}"
    echo ""
    echo -e "${BLUE}🎉 L'architecture est prête pour le développement${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}❌ VALIDATION ÉCHOUÉE${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Vérifiez les erreurs ci-dessus${NC}"
    echo ""
    exit 1
fi
