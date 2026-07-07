#!/bin/sh
set -e

# En dev, package.json est monté depuis l'hôte : synchroniser node_modules (ex. multer pour releases OTA).
# En prod/préprod : deps déjà dans l'image — ne jamais npm install au démarrage (reproductibilité).
skip_npm=
case "${JT_SKIP_ENTRYPOINT_NPM_INSTALL:-}" in
  1|true|TRUE|yes|YES) skip_npm=1 ;;
esac
if [ "${NODE_ENV:-}" = "production" ]; then
  skip_npm=1
fi

if [ -z "$skip_npm" ] && [ -f /app/package.json ]; then
  echo "[api-gateway] npm install (sync dépendances package.json — dev uniquement)…"
  npm install --omit=dev --no-audit --no-fund 2>&1 | tail -5 || npm install --no-audit --no-fund
elif [ -f /app/package.json ]; then
  echo "[api-gateway] skip npm install au démarrage (prod ou JT_SKIP_ENTRYPOINT_NPM_INSTALL)."
fi

exec npm start
