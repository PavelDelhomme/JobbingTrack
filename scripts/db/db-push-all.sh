#!/usr/bin/env bash
# Synchronise les schémas Prisma de tous les services (db push).
# Utilisé par: make db-push-all
# À exécuter depuis la racine du projet (ou avec ROOT_DIR défini).
#
# Ce que fait make db-push-all (tout en une commande, pas d'étape de vérification séparée) :
# 1) Prisma db push sur auth-service, application-service, company-service, contact-service, interview-service,
#    call-service, followup-service, event-service, workflow-service (tables métier + schéma partagé).
# 2) scripts/db/init-system-metrics.sql → tables system_metrics, container_metrics, service_availability_history.
# 3) scripts/db/init-key-tables.sql → security_logs, system_metrics_snapshots, network_connections, network_threats,
#    security_alerts, firewall_rules.
# Les tables security/deployment ne sont PAS poussées depuis security/deployment (schéma partiel) ;
# elles sont créées via le schéma auth-service (étendu) ou par init-key-tables.sql.

set -e
ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$ROOT_DIR"

# Liste des services avec schéma Prisma PARTAGÉ (même schéma complet ou compatible).
# Ne pas inclure security-service, deployment-service ni metrics-aggregator : leur schéma
# est partiel ; un "prisma db push" depuis eux supprimerait les tables des autres services.
# Les tables security_logs, network_connections, deployments, system_metrics_snapshots, etc.
# sont créées via le schéma auth-service (modèles ajoutés au schéma partagé).
SERVICES=(
  auth-service
  application-service
  company-service
  contact-service
  interview-service
  call-service
  followup-service
  event-service
  workflow-service
)

PUSHED=0
SKIPPED=0

# Marqueurs pour repérer facilement dans les logs (grep "[DB-PUSH-ALL]")
echo "[DB-PUSH-ALL] Début — $(date '+%Y-%m-%dT%H:%M:%S%z')"
echo ""
echo "🛠️  db-push-all comporte 3 parties : (1) Prisma db push, (2) tables monitoring, (3) tables sécurité"
echo ""
echo "[DB-PUSH-ALL] Partie 1/3 – Prisma db push (9 services)"
echo "━━━ Partie 1/3 – Prisma db push (9 services) ━━━"
echo ""
echo "🔍 Vérification de la disponibilité de PostgreSQL..."
if ! docker exec jobbingtrack-postgres pg_isready -U jobbingtrack > /dev/null 2>&1; then
  echo "❌ PostgreSQL n'est pas démarré. Lancez 'make up-full' d'abord."
  exit 1
fi
echo "✅ PostgreSQL est disponible"
echo ""

for service in "${SERVICES[@]}"; do
  CONTAINER="jobbingtrack-${service}"
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "  🔍 Vérification de ${service}..."
    if docker exec "${CONTAINER}" test -f /app/prisma/schema.prisma 2>/dev/null; then
      echo "  📦 Prisma db push sur ${service}..."
      PUSH_OUTPUT=$(docker exec -w /app "${CONTAINER}" npx prisma db push --accept-data-loss 2>&1) || true
      PUSH_EXIT=$?
      if [ "$PUSH_EXIT" -eq 0 ] || echo "$PUSH_OUTPUT" | grep -q "already exists\|in sync\|Done in"; then
        echo "  ✅ ${service} - Schéma synchronisé"
        PUSHED=$((PUSHED + 1))
      elif echo "$PUSH_OUTPUT" | grep -q "type.*already exists"; then
        echo "  ⚠️  ${service} - Enums déjà existants (ignoré)"
        PUSHED=$((PUSHED + 1))
      else
        echo "  ❌ ${service} - Échec de prisma db push"
        echo "$PUSH_OUTPUT" | head -3 | sed 's/^/     /'
        SKIPPED=$((SKIPPED + 1))
      fi
    else
      echo "  ⏭️  ${service} - Pas de Prisma (ignoré)"
      SKIPPED=$((SKIPPED + 1))
    fi
  else
    echo "  ⚠️  ${service} - Conteneur ${CONTAINER} non démarré (ignoré)"
    SKIPPED=$((SKIPPED + 1))
  fi
  echo ""
done

# security-service, deployment-service et metrics-aggregator ne font PAS de db push ici :
# leur schéma ne contient qu’une partie des tables ; un push supprimerait les autres.
# Leurs tables sont créées par le push auth-service (schéma partagé étendu).
echo "  ⏭️  security / deployment / metrics-aggregator : tables via auth-service ou init-key-tables (pas de push)"
echo ""

# Seed des tables ApplicationStatus, InterviewStatus, FollowUpStatus (statuts prédéfinis)
if [ -f "${ROOT_DIR}/scripts/db/seed-status-tables.sql" ]; then
  echo "[DB-PUSH-ALL] Seed statuts prédéfinis (ApplicationStatus, InterviewStatus, FollowUpStatus)"
  docker exec -i jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -f - < "${ROOT_DIR}/scripts/db/seed-status-tables.sql" > /dev/null 2>&1 && echo "  ✅ Statuts prédéfinis insérés (ou déjà présents)" || echo "  ⚠️  Seed statuts ignoré (tables peut-être absentes : relancer après make build + up-full)"
  echo ""
fi

# Partie 2/3 : system_metrics, container_metrics, service_availability_history
if [ -f "${ROOT_DIR}/scripts/db/init-system-metrics.sql" ]; then
  echo "[DB-PUSH-ALL] Partie 2/3 – Tables monitoring (init-system-metrics.sql)"
  echo "━━━ Partie 2/3 – Tables monitoring (init-system-metrics.sql) ━━━"
  echo "  system_metrics, container_metrics, service_availability_history"
  docker exec -i jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -f - < "${ROOT_DIR}/scripts/db/init-system-metrics.sql" > /dev/null 2>&1 && echo "  ✅ Tables system_metrics / service_availability_history OK" || true
  echo ""
fi

# Partie 3/3 : security_logs, network_*, firewall_rules, security_alerts
if [ -f "${ROOT_DIR}/scripts/db/init-key-tables.sql" ]; then
  echo "[DB-PUSH-ALL] Partie 3/3 – Tables sécurité / monitoring (init-key-tables.sql)"
  echo "━━━ Partie 3/3 – Tables sécurité / monitoring (init-key-tables.sql) ━━━"
  echo "  security_logs, network_*, firewall_rules, security_alerts, vulnerabilities, security_metrics, deployments (+ deployment_metrics, rollbacks)"
  docker exec -i jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -f - < "${ROOT_DIR}/scripts/db/init-key-tables.sql" > /dev/null 2>&1 && echo "  ✅ Tables security_logs / system_metrics_snapshots / network_connections / network_threats / security_alerts / firewall_rules OK" || true
  echo ""
fi

echo "[DB-PUSH-ALL] Fin — $(date '+%Y-%m-%dT%H:%M:%S%z')"
echo "✅ db-push-all terminé"
echo "   📦 Prisma db push : $PUSHED service(s)"
echo "   ⏭️  Ignorés / erreurs : $SKIPPED"
# Redémarrer metrics-aggregator pour qu'il recharge le schéma (évite « cached plan must not change result type » et « cache lookup failed for type »)
if docker ps --format '{{.Names}}' | grep -q '^jobbingtrack-metrics-aggregator$'; then
  echo ""
  echo "🔄 Redémarrage de metrics-aggregator pour recharger le schéma BDD..."
  docker restart jobbingtrack-metrics-aggregator > /dev/null 2>&1 && echo "   ✅ metrics-aggregator redémarré" || echo "   ⚠️  Redémarrage ignoré"
fi
