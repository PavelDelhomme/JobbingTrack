#!/usr/bin/env bash
# Met à jour .env avec les ports cohérents (5000-5019 microservices, 5098-5109 observabilité)
# Usage: ./scripts/setup/setup-ports.sh

set -e
ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$ROOT_DIR"

ENV_FILE="${ROOT_DIR}/.env"
ENV_EXAMPLE="${ROOT_DIR}/.env.example"

update_env_var() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    if [[ "$(uname)" == "Darwin" ]]; then
      sed -i '' "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    else
      sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    fi
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

echo "🔧 Mise à jour des ports dans .env"
echo ""

if [[ ! -f "$ENV_FILE" ]]; then
  echo "📄 .env absent : copie depuis .env.example"
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  echo "✅ .env créé. Vérifiez les valeurs sensibles (JWT, SMTP, etc.)."
  exit 0
fi

update_env_var "POSTGRES_PORT" "5000"
update_env_var "REDIS_PORT" "5001"
update_env_var "API_GATEWAY_PORT" "5002"
update_env_var "FRONTEND_PORT" "5003"
update_env_var "METRICS_AGGREGATOR_PORT" "5004"
update_env_var "AUTH_SERVICE_PORT" "5005"
update_env_var "APPLICATION_SERVICE_PORT" "5006"
update_env_var "COMPANY_SERVICE_PORT" "5007"
update_env_var "CONTACT_SERVICE_PORT" "5008"
update_env_var "INTERVIEW_SERVICE_PORT" "5009"
update_env_var "CALL_SERVICE_PORT" "5010"
update_env_var "EVENT_SERVICE_PORT" "5011"
update_env_var "FOLLOWUP_SERVICE_PORT" "5012"
update_env_var "PROFILE_SERVICE_PORT" "5013"
update_env_var "NOTIFICATION_SERVICE_PORT" "5014"
update_env_var "DASHBOARD_SERVICE_PORT" "5015"
update_env_var "WORKFLOW_SERVICE_PORT" "5016"
update_env_var "SECURITY_SERVICE_PORT" "5017"
update_env_var "DEPLOYMENT_SERVICE_PORT" "5018"
update_env_var "FLUTTER_MOBILE_PORT" "5019"
update_env_var "MONITORING_C_PORT" "5098"
update_env_var "MONITORING_RS_PORT" "5100"
update_env_var "LOG_COLLECTOR_C_LEGACY_PORT" "5109"
update_env_var "LOG_COLLECTOR_C_PORT" "5109"
update_env_var "LOG_COLLECTOR_C_INTERNAL_PORT" "3019"
update_env_var "LOG_COLLECTOR_RS_PORT" "5099"

update_env_var "NEXT_PUBLIC_API_URL" "http://localhost:5002"
update_env_var "NEXT_PUBLIC_AUTH_SERVICE_URL" "http://localhost:5005"
update_env_var "NEXT_PUBLIC_METRICS_URL" "http://localhost:5004"
update_env_var "NEXT_PUBLIC_METRICS_AGGREGATOR_URL" "http://localhost:5004"
update_env_var "NEXT_PUBLIC_FRONTEND_URL" "http://localhost:5003"

update_env_var "FRONTEND_URL" "http://localhost:5003"
update_env_var "BACKEND_URL" "http://localhost:5002"
update_env_var "ALLOWED_ORIGINS" "http://localhost:5003,http://localhost:5002,http://localhost:5173"

if grep -q "^DATABASE_URL=" "$ENV_FILE"; then
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' 's|@localhost:[0-9]*/|@localhost:5000/|' "$ENV_FILE"
  else
    sed -i 's|@localhost:[0-9]*/|@localhost:5000/|' "$ENV_FILE"
  fi
fi
update_env_var "REDIS_URL" "redis://localhost:5001"

echo "✅ Ports mis à jour dans .env"
echo "   Backoffice : http://localhost:5003"
echo "   API Gateway : http://localhost:5002"
echo "   Metrics Aggregator : http://localhost:5004"
echo ""
echo "💡 Pour appliquer les ports : make restart-full (conserve la base de données)"
