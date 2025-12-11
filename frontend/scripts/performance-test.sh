#!/bin/bash

# ============================================================================
# Script de test de performance Frontend - JobbingTrack
# ============================================================================
# Analyse la consommation mémoire et les performances du frontend
# Objectif: Identifier les causes de consommation mémoire élevée (1073MB)
# et proposer des optimisations pour réduire à ~500MB
# ============================================================================

set -euo pipefail

FRONTEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPORT_DIR="${FRONTEND_DIR}/performance-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${REPORT_DIR}/performance_${TIMESTAMP}.json"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================================"
echo "🔍 TEST DE PERFORMANCE FRONTEND"
echo "========================================================${NC}"
echo ""

# Créer le répertoire de rapports
mkdir -p "${REPORT_DIR}"

# Fonction pour obtenir la mémoire utilisée par le processus Node.js
get_memory_usage() {
    local pid=$1
    if [ -z "$pid" ]; then
        echo "0"
        return
    fi
    
    # Utiliser ps pour obtenir la mémoire en KB, puis convertir en MB
    local mem_kb=$(ps -o rss= -p "$pid" 2>/dev/null || echo "0")
    local mem_mb=$((mem_kb / 1024))
    echo "$mem_mb"
}

# Fonction pour analyser les bundles
analyze_bundles() {
    echo -e "${BLUE}📦 Analyse des bundles...${NC}"
    
    if [ ! -d "${FRONTEND_DIR}/.next" ]; then
        echo -e "${YELLOW}⚠️  Build non trouvé. Construction du projet...${NC}"
        cd "${FRONTEND_DIR}"
        npm run build > /dev/null 2>&1 || true
    fi
    
    # Analyser la taille des fichiers dans .next
    local total_size=0
    local js_size=0
    local css_size=0
    local image_size=0
    
    if [ -d "${FRONTEND_DIR}/.next/static" ]; then
        js_size=$(du -sk "${FRONTEND_DIR}/.next/static"/*.js 2>/dev/null | awk '{sum+=$1} END {print sum}' || echo "0")
        css_size=$(du -sk "${FRONTEND_DIR}/.next/static"/*.css 2>/dev/null | awk '{sum+=$1} END {print sum}' || echo "0")
    fi
    
    if [ -d "${FRONTEND_DIR}/.next/static/images" ]; then
        image_size=$(du -sk "${FRONTEND_DIR}/.next/static/images" 2>/dev/null | awk '{print $1}' || echo "0")
    fi
    
    total_size=$((js_size + css_size + image_size))
    
    echo "  • JS: $((js_size / 1024)) MB"
    echo "  • CSS: $((css_size / 1024)) MB"
    echo "  • Images: $((image_size / 1024)) MB"
    echo "  • Total: $((total_size / 1024)) MB"
    
    echo "{\"js_mb\": $((js_size / 1024)), \"css_mb\": $((css_size / 1024)), \"images_mb\": $((image_size / 1024)), \"total_mb\": $((total_size / 1024))}" > "${REPORT_DIR}/bundles_${TIMESTAMP}.json"
}

# Fonction pour analyser les dépendances
analyze_dependencies() {
    echo -e "${BLUE}📚 Analyse des dépendances...${NC}"
    
    cd "${FRONTEND_DIR}"
    
    # Compter le nombre de dépendances
    local deps_count=$(cat package.json | grep -c '"' || echo "0")
    local node_modules_size=0
    
    if [ -d "node_modules" ]; then
        node_modules_size=$(du -sk node_modules 2>/dev/null | awk '{print $1}' || echo "0")
    fi
    
    echo "  • Nombre de dépendances: $deps_count"
    echo "  • Taille node_modules: $((node_modules_size / 1024)) MB"
    
    echo "{\"deps_count\": $deps_count, \"node_modules_mb\": $((node_modules_size / 1024))}" > "${REPORT_DIR}/dependencies_${TIMESTAMP}.json"
}

# Fonction pour tester la mémoire en runtime
test_runtime_memory() {
    echo -e "${BLUE}💾 Test de mémoire en runtime...${NC}"
    
    # Démarrer le serveur en arrière-plan
    cd "${FRONTEND_DIR}"
    npm run dev > /dev/null 2>&1 &
    local server_pid=$!
    
    echo "  • Serveur démarré (PID: $server_pid)"
    echo "  • Attente de 10 secondes pour stabilisation..."
    sleep 10
    
    # Mesurer la mémoire
    local mem_usage=$(get_memory_usage "$server_pid")
    echo "  • Mémoire utilisée: ${mem_usage} MB"
    
    # Attendre encore 30 secondes et mesurer à nouveau
    echo "  • Attente de 30 secondes supplémentaires..."
    sleep 30
    local mem_usage_after=$(get_memory_usage "$server_pid")
    echo "  • Mémoire après 30s: ${mem_usage_after} MB"
    
    # Arrêter le serveur
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
    
    echo "{\"initial_mb\": $mem_usage, \"after_30s_mb\": $mem_usage_after, \"growth_mb\": $((mem_usage_after - mem_usage))}" > "${REPORT_DIR}/runtime_${TIMESTAMP}.json"
}

# Fonction pour analyser les imports
analyze_imports() {
    echo -e "${BLUE}🔍 Analyse des imports...${NC}"
    
    cd "${FRONTEND_DIR}"
    
    # Compter les imports de grandes bibliothèques
    local recharts_count=$(grep -r "from ['\"]recharts" src --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l || echo "0")
    local lucide_count=$(grep -r "from ['\"]lucide-react" src --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l || echo "0")
    local axios_count=$(grep -r "from ['\"]axios" src --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l || echo "0")
    local socket_count=$(grep -r "from ['\"]socket.io-client" src --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l || echo "0")
    
    echo "  • Imports recharts: $recharts_count"
    echo "  • Imports lucide-react: $lucide_count"
    echo "  • Imports axios: $axios_count"
    echo "  • Imports socket.io-client: $socket_count"
    
    echo "{\"recharts\": $recharts_count, \"lucide\": $lucide_count, \"axios\": $axios_count, \"socket\": $socket_count}" > "${REPORT_DIR}/imports_${TIMESTAMP}.json"
}

# Fonction pour générer le rapport final
generate_report() {
    echo -e "${BLUE}📊 Génération du rapport final...${NC}"
    
    local bundles_file="${REPORT_DIR}/bundles_${TIMESTAMP}.json"
    local deps_file="${REPORT_DIR}/dependencies_${TIMESTAMP}.json"
    local runtime_file="${REPORT_DIR}/runtime_${TIMESTAMP}.json"
    local imports_file="${REPORT_DIR}/imports_${TIMESTAMP}.json"
    
    # Lire les données JSON
    local bundles_data="{}"
    local deps_data="{}"
    local runtime_data="{}"
    local imports_data="{}"
    
    [ -f "$bundles_file" ] && bundles_data=$(cat "$bundles_file")
    [ -f "$deps_file" ] && deps_data=$(cat "$deps_file")
    [ -f "$runtime_file" ] && runtime_data=$(cat "$runtime_file")
    [ -f "$imports_file" ] && imports_data=$(cat "$imports_file")
    
    # Générer le rapport JSON
    cat > "$REPORT_FILE" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "date": "$(date -Iseconds)",
  "bundles": $bundles_data,
  "dependencies": $deps_data,
  "runtime": $runtime_data,
  "imports": $imports_data,
  "recommendations": []
}
EOF
    
    echo -e "${GREEN}✅ Rapport généré: $REPORT_FILE${NC}"
}

# Fonction pour analyser les fichiers volumineux
analyze_large_files() {
    echo -e "${BLUE}📁 Analyse des fichiers volumineux...${NC}"
    
    cd "${FRONTEND_DIR}"
    
    # Trouver les plus gros fichiers TypeScript/TSX
    echo "Top 10 des plus gros fichiers source:"
    find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec wc -l {} + 2>/dev/null | \
        sort -rn | head -10 | \
        awk '{printf "  • %s: %d lignes\n", $2, $1}' || echo "  Aucun fichier trouvé"
    
    echo ""
}

# Fonction pour afficher les recommandations
show_recommendations() {
    echo ""
    echo -e "${YELLOW}================================================================"
    echo "💡 RECOMMANDATIONS D'OPTIMISATION"
    echo "========================================================${NC}"
    echo ""
    echo -e "${GREEN}Objectif: Réduire la mémoire de 1073MB à ~500MB (50%)${NC}"
    echo ""
    echo "1. Code Splitting (Gain estimé: 200-300MB):"
    echo "   • Utiliser React.lazy() pour les composants lourds"
    echo "   • Implémenter le lazy loading des routes (analytics, statistics)"
    echo "   • Séparer les vendors dans des chunks distincts"
    echo ""
    echo "2. Optimisation des imports (Gain estimé: 100-150MB):"
    echo "   • Importer uniquement les icônes nécessaires de lucide-react"
    echo "   • Utiliser tree-shaking pour recharts"
    echo "   • Éviter les imports globaux"
    echo ""
    echo "3. Mémoire (Gain estimé: 100-150MB):"
    echo "   • Implémenter la virtualisation pour les longues listes"
    echo "   • Nettoyer les event listeners et timers"
    echo "   • Utiliser useMemo et useCallback pour éviter les re-renders"
    echo "   • Paginer les données au lieu de tout charger"
    echo ""
    echo "4. Build (Gain estimé: 50-100MB):"
    echo "   • Activer la compression Brotli"
    echo "   • Optimiser les images (WebP, AVIF)"
    echo "   • Minifier le CSS et JS"
    echo "   • Désactiver les source maps en production"
    echo ""
    echo "5. Monitoring:"
    echo "   • Utiliser React DevTools Profiler"
    echo "   • Surveiller les memory leaks"
    echo "   • Analyser les bundles avec: make analyze-bundle-frontend"
    echo ""
    echo -e "${BLUE}📖 Documentation complète: frontend/PERFORMANCE_OPTIMIZATION.md${NC}"
    echo ""
}

# Exécution des tests
main() {
    echo "Démarrage des tests de performance..."
    echo ""
    
    analyze_bundles
    echo ""
    
    analyze_dependencies
    echo ""
    
    analyze_imports
    echo ""
    
    analyze_large_files
    echo ""
    
    # Demander confirmation pour le test runtime (peut prendre du temps)
    echo -e "${YELLOW}⚠️  Le test de mémoire runtime peut démarrer le serveur dev.${NC}"
    echo -e "${YELLOW}   Cela peut prendre ~40 secondes. Continuer ? (o/N)${NC}"
    read -r response || response="N"
    if [[ "$response" =~ ^[Oo]$ ]]; then
        test_runtime_memory
        echo ""
    else
        echo "Test runtime ignoré."
        echo "{\"initial_mb\": 0, \"after_30s_mb\": 0, \"growth_mb\": 0}" > "${REPORT_DIR}/runtime_${TIMESTAMP}.json"
    fi
    
    generate_report
    show_recommendations
    
    echo ""
    echo -e "${GREEN}✅ Tests de performance terminés !${NC}"
    echo -e "${BLUE}📁 Rapports disponibles dans: ${REPORT_DIR}${NC}"
}

main "$@"

