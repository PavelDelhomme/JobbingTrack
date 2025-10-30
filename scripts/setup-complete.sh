#!/bin/bash

# ============================================
# Script de Configuration Complète - JobbingTrack
# ============================================

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  🔧 Configuration Complète de JobbingTrack                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")/.."

# 1. Nettoyage des fichiers obsolètes
echo "📂 Étape 1/4: Nettoyage des fichiers obsolètes..."
chmod +x scripts/cleanup-old-files.sh
./scripts/cleanup-old-files.sh

echo ""

# 2. Nettoyage des volumes Docker obsolètes
echo "🐳 Étape 2/4: Nettoyage des volumes Docker..."
chmod +x scripts/cleanup-docker-volumes.sh
./scripts/cleanup-docker-volumes.sh

echo ""

# 3. Réorganisation de la documentation
echo "📚 Étape 3/4: Réorganisation de la documentation..."
chmod +x scripts/reorganize-docs.sh
./scripts/reorganize-docs.sh

echo ""

# 4. Affichage du résumé
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ Configuration Terminée !                                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🎯 Prochaines Étapes:"
echo ""
echo "1️⃣  Vérifier le fichier .env et ajuster les valeurs sensibles:"
echo "    - POSTGRES_PASSWORD"
echo "    - JWT_SECRET et JWT_REFRESH_SECRET"
echo "    - GRAFANA_ADMIN_PASSWORD"
echo "    - ADMIN_PASSWORD (si nécessaire)"
echo ""
echo "2️⃣  Démarrer l'application:"
echo "    make up-full"
echo ""
echo "3️⃣  Appliquer les migrations (si nécessaire):"
echo "    make db-migrate"
echo ""
echo "4️⃣  Créer l'utilisateur admin (si nécessaire):"
echo "    make create-admin-user"
echo ""
echo "5️⃣  Accéder à l'application:"
echo "    http://localhost:8080"
echo ""
echo "🔑 Identifiants Admin par défaut:"
echo "    📧 Email:    admin@jobbingtrack.com"
echo "    🔑 Password: password123"
echo ""
echo "📚 Documentation:"
echo "    docs/GETTING_STARTED.md"
echo ""
echo "🆘 Aide:"
echo "    make help        # Aide générale"
echo "    make help-db     # Aide base de données"
echo ""
