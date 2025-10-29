#!/bin/bash
set -e

cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack

echo "🚀 Déploiement Rapide Metrics"
echo "============================="

# Nettoyage
echo "1. Nettoyage..."
rm -f scripts/test-metrics-*.sh scripts/fix-metrics-*.sh scripts/cleanup-*.sh scripts/deploy-metrics-*.sh scripts/rebuild-metrics-final.sh fix-*.sh DEPLOY_FINAL.sh 2>/dev/null
rm -rf backend/docker-stats-service 2>/dev/null
mkdir -p tests/e2e
mv fix_makefile.sh scripts/ 2>/dev/null || true
mv setup-backend-tests.sh scripts/ 2>/dev/null || true
mv test-playwright-*.js tests/e2e/ 2>/dev/null || true
mv test-user-creation.js tests/e2e/ 2>/dev/null || true

# Setup
echo "2. Setup /tmp..."
mkdir -p /tmp/jobbingtrack-metrics
chmod 777 /tmp/jobbingtrack-metrics

# Stop
echo "3. Stop conteneur..."
docker stop jobbingtrack-metrics-aggregator 2>/dev/null || true
docker rm jobbingtrack-metrics-aggregator 2>/dev/null || true
docker rmi jobbingtrack-metrics-aggregator 2>/dev/null || true

# Build
echo "4. Build..."
docker build -t jobbingtrack-metrics-aggregator backend/metrics-aggregator-service/ -q

# Start
echo "5. Start..."
docker-compose up -d jobbingtrack-metrics-aggregator >/dev/null 2>&1

# Wait
echo "6. Wait 20s..."
for i in {1..20}; do
    echo -n "."
    sleep 1
done
echo ""

# Check
echo "7. Check..."
if docker ps | grep -q jobbingtrack-metrics-aggregator; then
    echo "✅ Conteneur actif"
    
    # Test API
    echo ""
    echo "Test API:"
    RESPONSE=$(curl -s -H "X-API-Key: jobbingtrack-metrics-secret-key" http://localhost:3014/api/v1/metrics 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "✅ API répond"
        echo "$RESPONSE" | jq '{containers: (.containers | length), cpu: .system.containersAggregate.cpu.percent}' 2>/dev/null || true
    else
        echo "⚠️  API pas prête (attendre encore)"
    fi
    
    # Check export
    echo ""
    echo "Export:"
    if [ -f /tmp/jobbingtrack-metrics/latest.json ]; then
        echo "✅ /tmp/jobbingtrack-metrics/latest.json"
    else
        echo "⚠️  Pas encore créé"
    fi
else
    echo "❌ Erreur:"
    docker logs jobbingtrack-metrics-aggregator 2>&1 | tail -20
    exit 1
fi

# Cleanup self
rm -f quick-deploy.sh

echo ""
echo "✅ TERMINÉ"
echo "API: http://localhost:3014/api/v1/metrics (header: X-API-Key: jobbingtrack-metrics-secret-key)"
echo "Export: /tmp/jobbingtrack-metrics/latest.json"
