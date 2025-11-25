#!/bin/bash

# Script pour afficher tous les ports externes Docker utilisés par JobbingTrack

set -e

COMPOSE_FILE="docker-compose.yml"

echo "🔌 PORTS EXTERNES DOCKER - JobbingTrack"
echo "=========================================="
echo ""

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Fichier $COMPOSE_FILE non trouvé"
    exit 1
fi

echo "📋 Ports définis dans docker-compose.yml:"
echo ""

# Services essentiels (sans profiles ou avec profiles mais toujours démarrés)
ESSENTIAL_SERVICES=("postgres" "redis" "api-gateway" "frontend" "jobbingtrack-metrics-aggregator" "mailhog")

echo "🟢 SERVICES ESSENTIELS (toujours démarrés):"
for service in "${ESSENTIAL_SERVICES[@]}"; do
    # Extraire les ports pour ce service
    ports=$(awk -v svc="$service" '
        /^  [a-zA-Z0-9_-]+:/ {
            current_service = $1
            gsub(/:/, "", current_service)
            in_service = (current_service == svc)
            in_ports = 0
        }
        in_service && /ports:/ {
            in_ports = 1
            next
        }
        in_service && in_ports && /^      - "/ {
            gsub(/"/, "", $0)
            gsub(/^      - /, "", $0)
            split($0, p, ":")
            print p[1] " -> " p[2]
        }
        in_service && /^    [a-zA-Z]/ && !/ports:/ {
            in_ports = 0
        }
    ' "$COMPOSE_FILE")
    
    if [ -n "$ports" ]; then
        while IFS= read -r port; do
            printf "  %-35s %s\n" "$service" "$port"
        done <<< "$ports"
    fi
done

echo ""
echo "🔵 SERVICES OPTIONNELS (avec profiles):"

# Extraire tous les autres services avec ports (exclure les essentiels)
awk -v essential_list="postgres redis api-gateway frontend jobbingtrack-metrics-aggregator mailhog" '
    BEGIN {
        split(essential_list, essential_array, " ")
        for (i in essential_array) {
            essential[essential_array[i]] = 1
        }
    }
    /^  [a-zA-Z0-9_-]+:/ {
        service = $1
        gsub(/:/, "", service)
        current_service = service
        is_essential = (essential[service] == 1)
        in_service = !is_essential
        in_ports = 0
        next
    }
    in_service && /ports:/ {
        in_ports = 1
        next
    }
    in_service && in_ports && /^      - "/ {
        gsub(/"/, "", $0)
        gsub(/^      - /, "", $0)
        # Extraire le commentaire si présent
        comment = ""
        if (match($0, /#.*$/)) {
            comment = substr($0, RSTART)
            $0 = substr($0, 1, RSTART-1)
            gsub(/^[ \t]+|[ \t]+$/, "", $0)
        }
        split($0, p, ":")
        if (comment) {
            printf "  %-35s %s -> %s  %s\n", current_service, p[1], p[2], comment
        } else {
            printf "  %-35s %s -> %s\n", current_service, p[1], p[2]
        }
    }
    in_service && /^    [a-zA-Z]/ && !/ports:/ {
        in_ports = 0
    }
' "$COMPOSE_FILE" | grep -v "^$" | sort -u

echo ""
echo "📊 RÉSUMÉ DES PORTS EXTERNES:"
ports_list=$(grep -E '^\s+- "[0-9]+:[0-9]+' "$COMPOSE_FILE" | sed 's/.*"\([0-9]*\):\([0-9]*\)".*/\1/' | sort -n | uniq)
ports_array=($ports_list)
ports_count=${#ports_array[@]}

if [ $ports_count -gt 0 ]; then
    echo "  Ports externes utilisés: ${ports_array[*]}"
    echo "  Total: $ports_count ports uniques"
else
    echo "  Aucun port trouvé"
fi

echo ""
echo "🌐 Ports actuellement exposés par les conteneurs Docker:"
if command -v docker &> /dev/null && docker ps &> /dev/null; then
    docker ps --filter "name=jobbingtrack" --format "table {{.Names}}\t{{.Ports}}" 2>/dev/null | head -30 || echo "  Aucun conteneur démarré"
else
    echo "  Docker non disponible"
fi

echo ""
echo "💡 Note: Les ports sont au format HÔTE:CONTENEUR"
echo "   Exemple: 3000:3000 signifie port 3000 sur l'hôte -> port 3000 dans le conteneur"
echo ""
echo "📝 Ports par service:"
echo ""
echo "   Services Essentiels:"
echo "   - postgres:              5432 -> 5432"
echo "   - redis:                 6379 -> 6379"
echo "   - api-gateway:           3000 -> 3000"
echo "   - frontend:              8080 -> 3000"
echo "   - metrics-aggregator:    8014 -> 3014"
echo "   - mailhog (SMTP):        2525 -> 1025"
echo "   - mailhog (Web):         8025 -> 8025"
echo ""
echo "   Services Optionnels:"
echo "   - auth-service:          8001 -> 3001"
echo "   - application-service:   8002 -> 3002"
echo "   - company-service:       8003 -> 3003"
echo "   - contact-service:       8004 -> 3004"
echo "   - interview-service:     8005 -> 3005"
echo "   - call-service:          8006 -> 3006"
echo "   - event-service:         8007 -> 3007"
echo "   - followup-service:      8008 -> 3008"
echo "   - profile-service:       8009 -> 3009"
echo "   - notification-service:  8010 -> 3010"
echo "   - workflow-service:      8011 -> 3011"
echo "   - dashboard-service:     8012 -> 3000"
echo "   - security-service:      8017 -> 3017"
echo "   - deployment-service:    8016 -> 3016"
echo "   - flutter-mobile:        8090 -> 8080"

