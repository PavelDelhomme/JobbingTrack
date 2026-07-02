#!/bin/sh
set -e

# En dev, package.json est monté depuis l'hôte : synchroniser node_modules (ex. multer pour releases OTA).
if [ -f /app/package.json ]; then
  echo "[api-gateway] npm install (sync dépendances package.json)…"
  npm install --omit=dev --no-audit --no-fund 2>&1 | tail -5 || npm install --no-audit --no-fund
fi

exec npm start
