#!/bin/bash

# Script pour nettoyer TOUT : PostgreSQL + instructions pour le cache frontend

set -e

echo "🧹 Nettoyage complet des métriques (PostgreSQL + Cache Frontend)..."
echo ""

# 1. Nettoyer PostgreSQL
echo "1️⃣  Nettoyage de PostgreSQL..."
./scripts/db/clean-metrics.sh
echo ""

# 2. Instructions pour le cache frontend
echo "2️⃣  Nettoyage du cache frontend..."
./scripts/db/clean-metrics-cache.sh
echo ""

echo "✅ Nettoyage complet terminé !"
echo ""
echo "💡 Actions requises :"
echo "   1. PostgreSQL a été nettoyé automatiquement"
echo "   2. Vous devez nettoyer le sessionStorage du navigateur (voir instructions ci-dessus)"
echo "   3. Rechargez la page (F5) pour voir les changements"
echo ""
