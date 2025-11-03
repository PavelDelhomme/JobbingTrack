#!/bin/bash

# ============================================
# Script de Vérification du fichier .env
# ============================================

set -e

echo "🔍 Vérification du fichier .env..."
echo ""

cd "$(dirname "$0")/.."

# Vérifier si .env existe
if [ ! -f ".env" ]; then
    echo "❌ Le fichier .env n'existe pas !"
    echo "💡 Copiez .env.example vers .env:"
    echo "   cp .env.example .env"
    exit 1
fi

# Variables requises
REQUIRED_VARS=(
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "POSTGRES_DB"
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
    "FRONTEND_URL"
)

# Variables optionnelles (peuvent être vides)
OPTIONAL_VARS=(
    "SMTP_HOST"
    "SMTP_PORT"
    "SMTP_USER"
    "SMTP_PASS"
    "SMTP_FROM"
    "ALLOWED_ORIGINS"
    "GRAFANA_ADMIN_PASSWORD"
)

echo "🔍 Vérification des variables requises..."
MISSING=()
for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" .env 2>/dev/null; then
        echo "  ❌ $var - Manquante"
        MISSING+=("$var")
    elif grep -q "^${var}=$" .env 2>/dev/null || grep -q "^${var}=\s*$" .env 2>/dev/null; then
        echo "  ⚠️  $var - Présente mais vide"
        MISSING+=("$var")
    else
        echo "  ✅ $var"
    fi
done

echo ""
echo "🔍 Vérification des variables optionnelles..."
for var in "${OPTIONAL_VARS[@]}"; do
    if ! grep -q "^${var}=" .env 2>/dev/null; then
        echo "  ⚠️  $var - Manquante (optionnelle)"
        # Ajouter la variable vide
        echo "$var=" >> .env
        echo "  ➕ $var ajoutée (vide)"
    else
        echo "  ✅ $var"
    fi
done

echo ""
if [ ${#MISSING[@]} -eq 0 ]; then
    echo "✅ Toutes les variables requises sont définies !"
else
    echo "❌ Variables requises manquantes ou vides:"
    for var in "${MISSING[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "💡 Modifiez le fichier .env et ajoutez ces variables"
    exit 1
fi

echo ""
echo "📋 Résumé:"
echo "  ✅ Fichier .env valide"
echo "  ✅ Variables requises OK"
echo "  ✅ Variables optionnelles vérifiées"
echo ""
