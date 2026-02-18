#!/bin/bash
# Script pour générer des menaces de test dans la base de données
# Usage: ./scripts/security/generate-test-threats.sh

set -e

echo "🔍 Génération de menaces de test pour le système de sécurité..."
echo ""

# Vérifier que PostgreSQL est disponible
if ! docker exec jobbingtrack-postgres pg_isready -U jobbingtrack > /dev/null 2>&1; then
    echo "❌ PostgreSQL n'est pas démarré. Lancez 'make up-full' d'abord."
    exit 1
fi

# Vérifier que security-service est démarré
if ! docker ps --format '{{.Names}}' | grep -q "^jobbingtrack-security-service$"; then
    echo "⚠️  security-service n'est pas démarré. Démarrage..."
    docker-compose -f docker-compose.yml up -d security-service
    sleep 5
fi

# Générer des menaces de test via l'API
API_URL="http://localhost:5002"
TOKEN="${1:-}"  # Token optionnel en paramètre

echo "📊 Génération de menaces de test..."

# Types de menaces à générer
THREAT_TYPES=("SYN_FLOOD" "PORT_SCAN" "BRUTE_FORCE" "SQL_INJECTION" "XSS_ATTACK")
SEVERITIES=("LOW" "MEDIUM" "HIGH" "CRITICAL")
IPS=("192.168.1.100" "10.0.0.50" "172.16.0.25" "203.0.113.42" "198.51.100.15")

# Fonction pour créer une menace via l'API
create_threat() {
    local threat_type=$1
    local severity=$2
    local source_ip=$3
    local dest_port=$4
    
    local payload=$(cat <<EOF
{
    "threatType": "${threat_type}",
    "sourceIp": "${source_ip}",
    "destPort": ${dest_port},
    "severity": "${severity}",
    "metadata": {
        "test": true,
        "generatedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
        "description": "Menace de test générée automatiquement"
    }
}
EOF
)
    
    # Essayer avec curl via API Gateway (port 5002)
    local response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "${payload}" \
        "http://localhost:5002/api/v1/security/firewall/threats" 2>/dev/null || echo "000")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo "  ✅ Menace créée: ${threat_type} depuis ${source_ip} (${severity})"
        return 0
    elif [ "$http_code" = "503" ]; then
        # Table n'existe pas, essayer directement en base
        echo "  ⚠️  Table NetworkThreat n'existe pas, création directe en base..."
        docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "
            INSERT INTO \"NetworkThreat\" (id, \"threatType\", \"sourceIp\", \"destPort\", severity, \"detectedAt\", blocked, metadata)
            VALUES (
                gen_random_uuid(),
                '${threat_type}',
                '${source_ip}',
                ${dest_port},
                '${severity}',
                NOW(),
                false,
                '{\"test\": true, \"description\": \"Menace de test générée automatiquement\"}'::jsonb
            ) ON CONFLICT DO NOTHING;
        " 2>/dev/null && echo "  ✅ Menace créée en base: ${threat_type} depuis ${source_ip}" || echo "  ❌ Impossible de créer la menace (exécutez: make db-push-all)"
        return 0
    else
        # Essayer directement vers security-service (port 5017)
        local response2=$(curl -s -w "\n%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -d "${payload}" \
            "http://localhost:5017/api/v1/security/firewall/threats" 2>/dev/null || echo "000")
        
        local http_code2=$(echo "$response2" | tail -n1)
        
        if [ "$http_code2" = "200" ] || [ "$http_code2" = "201" ]; then
            echo "  ✅ Menace créée (via security-service): ${threat_type} depuis ${source_ip} (${severity})"
            return 0
        else
            echo "  ⚠️  Impossible de créer la menace via API (code: ${http_code2})"
            echo "     Assurez-vous que security-service est démarré et que la table NetworkThreat existe"
            return 1
        fi
    fi
}

# Créer plusieurs menaces de test
count=0
for i in {1..10}; do
    threat_type=${THREAT_TYPES[$((RANDOM % ${#THREAT_TYPES[@]}))]}
    severity=${SEVERITIES[$((RANDOM % ${#SEVERITIES[@]}))]}
    source_ip=${IPS[$((RANDOM % ${#IPS[@]}))]}
    dest_port=$((8000 + RANDOM % 1000))
    
    create_threat "$threat_type" "$severity" "$source_ip" "$dest_port"
    count=$((count + 1))
    
    # Petit délai pour éviter la surcharge
    sleep 0.2
done

echo ""
echo "✅ ${count} menaces de test générées !"
echo ""
echo "📋 Pour vérifier les menaces:"
echo "   - Frontend: http://localhost:5003/backoffice/security/threats"
echo "   - API: curl http://localhost:5002/api/v1/security/firewall/threats"
echo ""

