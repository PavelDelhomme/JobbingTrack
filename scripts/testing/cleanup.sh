#!/bin/bash
# Script de nettoyage pour les tests

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

echo "🧹 Nettoyage des tests..."

# Arrêter les services de test
docker-compose -f tests/docker-compose.test.yml down -v

# Nettoyer les volumes
docker volume rm jobbingtrack_postgres_test_data 2>/dev/null || true

# Nettoyer les rapports
rm -rf tests/reports/*
rm -rf tests/coverage/*
rm -rf tests/e2e/results/*
rm -rf tests/temp/*

# Nettoyer les caches
rm -rf tests/node_modules/.cache
rm -rf tests/.nyc_output

echo "✅ Nettoyage terminé"
