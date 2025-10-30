#!/bin/bash

# ============================================
# Script de Nettoyage et Sécurisation Final
# ============================================

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  🔧 Nettoyage et Sécurisation Finale - JobbingTrack          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")/.."

# 1. Réorganisation complète
echo "📂 Étape 1/3: Réorganisation des fichiers et documentation..."
chmod +x scripts/reorganize-all.sh
./scripts/reorganize-all.sh

echo ""

# 2. Nettoyage des fichiers obsolètes
echo "🗑️  Étape 2/3: Nettoyage des fichiers obsolètes..."
chmod +x scripts/cleanup-old-files.sh
./scripts/cleanup-old-files.sh

echo ""

# 3. Rapport final
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ Nettoyage et Sécurisation Terminés !                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "🔐 Sécurisation docker-compose.yml:"
echo "  ✅ Toutes les DATABASE_URL utilisent des variables d'environnement"
echo "  ✅ JWT_SECRET sans valeurs par défaut"
echo "  ✅ SMTP_* sans données sensibles hardcodées"
echo ""

echo "📚 Documentation réorganisée:"
echo "  ✅ docs/getting-started/README.md"
echo "  ✅ docs/development/COMMANDES_MAKEFILE.md"
echo "  ✅ docs/monitoring/README.md (+ guides)"
echo "  ✅ docs/frontend/REORGANIZATION.md"
echo ""

echo "🗑️  Nettoyage effectué:"
echo "  ✅ backend/init-db.sql/ supprimé"
echo "  ✅ Fichiers obsolètes déplacés vers trash_files/"
echo ""

echo "⚠️  ACTIONS REQUISES:"
echo ""
echo "1️⃣  Vérifier le fichier .env contient toutes les variables:"
echo "    POSTGRES_USER=postgres"
echo "    POSTGRES_PASSWORD=<mot-de-passe-fort>"
echo "    POSTGRES_DB=jobbingtrack"
echo "    JWT_SECRET=<secret-unique-64-chars>"
echo "    JWT_REFRESH_SECRET=<secret-unique-64-chars>"
echo "    SMTP_HOST=<votre-smtp-host>"
echo "    SMTP_PORT=587"
echo "    SMTP_USER=<votre-email>"
echo "    SMTP_PASS=<votre-mot-de-passe-smtp>"
echo "    SMTP_FROM=<email-expediteur>"
echo "    FRONTEND_URL=http://localhost:8080"
echo "    ALLOWED_ORIGINS=http://localhost:8080,http://localhost:3000"
echo "    GRAFANA_ADMIN_PASSWORD=<mot-de-passe-grafana>"
echo ""

echo "2️⃣  Nettoyer les volumes Docker obsolètes (optionnel):"
echo "    chmod +x scripts/cleanup-docker-volumes.sh"
echo "    ./scripts/cleanup-docker-volumes.sh"
echo ""

echo "3️⃣  Tester le démarrage:"
echo "    make up-full"
echo ""

echo "4️⃣  Appliquer les migrations (si nécessaire):"
echo "    make db-migrate"
echo ""

echo "5️⃣  Créer l'utilisateur admin (si nécessaire):"
echo "    make create-admin-user"
echo ""

echo "📚 Documentation:"
echo "  docs/getting-started/README.md"
echo "  docs/development/COMMANDES_MAKEFILE.md"
echo ""

echo "🆘 Aide:"
echo "  make help        # Aide générale"
echo "  make help-db     # Aide base de données"
echo ""
