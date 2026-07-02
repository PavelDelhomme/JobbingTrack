#!/usr/bin/env bash
# Vérifie les variables obligatoires avant déploiement Portainer.
set -euo pipefail

ENV_FILE="${1:-deploy/production/.env.example}"
missing=0

require() {
  local key="$1"
  if ! grep -q "^${key}=" "$ENV_FILE"; then
    echo "MANQUANT dans $ENV_FILE : $key"
    missing=1
  fi
}

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Fichier introuvable : $ENV_FILE"
  exit 1
fi

for key in \
  POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD \
  REDIS_PASSWORD JWT_SECRET JWT_REFRESH_SECRET SECURITY_INTERNAL_SECRET METRICS_API_KEY \
  ADMIN_EMAIL ADMIN_PASSWORD \
  SMTP_HOST SMTP_PORT SMTP_USER SMTP_FROM \
  NEXT_PUBLIC_API_URL NEXT_PUBLIC_FRONTEND_URL FRONTEND_URL ALLOWED_ORIGINS \
  MOBILE_ANDROID_LATEST_VERSION MOBILE_ANDROID_LATEST_BUILD; do
  require "$key"
done

if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

echo "OK — clés obligatoires présentes dans $ENV_FILE"
echo "Prochaine étape : coller ces variables dans Portainer > Stacks > jobbingtrack > Environment variables"
