#!/usr/bin/env bash
# Synchronise les schémas Prisma de tous les services (db push).
# Utilisé par: make db-push-all
# DB_PUSH_VERBOSE=1 : laisse passer tous les messages psql (NOTICE « already exists », etc.).
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

set -euo pipefail
ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$ROOT_DIR"

# Réduit le bruit « NOTICE: relation … already exists » (idempotent). DB_PUSH_VERBOSE=1 pour tout voir.
psql_in_postgres() {
  if [ "${DB_PUSH_VERBOSE:-0}" = "1" ]; then
    docker exec -i jobbingtrack-postgres psql "$@"
  else
    docker exec -e "PGOPTIONS=-c client_min_messages=WARNING" -i jobbingtrack-postgres psql "$@"
  fi
}

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

# Nettoyage pré-push : supprimer les types enum résiduels qui entrent en conflit avec les tables
echo "[DB-PUSH-ALL] Nettoyage types enum résiduels (FollowUpStatus)..."
docker exec -i jobbingtrack-postgres psql -U "${POSTGRES_USER:-jobbingtrack}" -d "${POSTGRES_DB:-jobbingtrack}" -c "
  DO \$\$ BEGIN
    DROP TYPE IF EXISTS \"FollowUpStatus\" CASCADE;
  EXCEPTION WHEN OTHERS THEN NULL;
  END \$\$;
" 2>/dev/null && echo "  OK (enum résiduel nettoyé ou absent)" || echo "  (ignoré)"
echo ""
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

# ⚠️ IMPORTANT: Seul auth-service fait le db push car son schéma est le SUPERSET
# de tous les modèles partagés (58 modèles). Pusher depuis d'autres services
# avec --accept-data-loss DÉTRUIRAIT les tables qu'ils ne définissent pas
# (ex: EmailLog, UserSession, SecurityLog, etc. seraient supprimées par
# le push de company-service qui n'a que 27 modèles).
PUSH_SERVICE="auth-service"
PUSH_CONTAINER="jobbingtrack-${PUSH_SERVICE}"

if docker ps --format '{{.Names}}' | grep -q "^${PUSH_CONTAINER}$"; then
  echo "  🔍 Vérification de ${PUSH_SERVICE} (schéma maître, 58 modèles)..."
  if docker exec "${PUSH_CONTAINER}" test -f /app/prisma/schema.prisma 2>/dev/null; then
    echo "  📦 Prisma db push sur ${PUSH_SERVICE} (schéma complet)..."
    PUSH_OUTPUT=$(docker exec -w /app "${PUSH_CONTAINER}" npx prisma db push --accept-data-loss 2>&1) || true
    PUSH_EXIT=$?
    if [ "$PUSH_EXIT" -eq 0 ] || echo "$PUSH_OUTPUT" | grep -q "already exists\|in sync\|Done in"; then
      echo "  ✅ ${PUSH_SERVICE} - Schéma synchronisé (58 modèles)"
      PUSHED=1
    elif echo "$PUSH_OUTPUT" | grep -q "type.*already exists"; then
      echo "  ⚠️  ${PUSH_SERVICE} - Enums déjà existants (ignoré)"
      PUSHED=1
    else
      echo "  ❌ ${PUSH_SERVICE} - Échec de prisma db push"
      echo "$PUSH_OUTPUT" | head -5 | sed 's/^/     /'
      SKIPPED=1
    fi
  else
    echo "  ⏭️  ${PUSH_SERVICE} - Pas de Prisma (ignoré)"
    SKIPPED=1
  fi
else
  echo "  ⚠️  ${PUSH_SERVICE} - Conteneur ${PUSH_CONTAINER} non démarré (ignoré)"
  SKIPPED=1
fi
echo ""

# Alignement colonne Company.isTestData (schéma auth maître vs clients company-service ; idempotent)
if [ -f "${ROOT_DIR}/scripts/db/fix-company-isTestData.sql" ]; then
  echo "[DB-PUSH-ALL] Fix Company.isTestData (schéma métier / auth maître)"
  if psql_in_postgres -U "${POSTGRES_USER:-jobbingtrack}" -d "${POSTGRES_DB:-jobbingtrack}" -f - < "${ROOT_DIR}/scripts/db/fix-company-isTestData.sql"; then
    echo "  ✅ Company.isTestData présente (ou déjà OK)"
  else
    echo "  ⚠️  fix-company-isTestData ignoré (vérifiez Postgres)"
  fi
  echo ""
fi

# Les autres services ne font PAS de push — ils utilisent leur schema local
# uniquement pour générer le client Prisma (fait au docker build).
for service in "${SERVICES[@]}"; do
  if [ "$service" != "$PUSH_SERVICE" ]; then
    echo "  ⏭️  ${service} - Pas de push (schéma partiel, client généré au build)"
  fi
done
echo ""

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

# Fix colonne Application.isArchived (client Prisma attend isArchived, table n'a que archived)
if [ -f "${ROOT_DIR}/scripts/db/fix-application-isarchived.sql" ]; then
  echo "[DB-PUSH-ALL] Fix Application.isArchived (colonne générée pour compatibilité Prisma)"
  docker exec -i jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -f - < "${ROOT_DIR}/scripts/db/fix-application-isarchived.sql" 2>&1 | grep -E "NOTICE|ERROR" || true
  echo ""
fi

# Fix colonne Application.isTestData (nettoyage ciblé données de test)
if [ -f "${ROOT_DIR}/scripts/db/fix-application-isTestData.sql" ]; then
  echo "[DB-PUSH-ALL] Fix Application.isTestData (si absente)"
  docker exec -i jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -f - < "${ROOT_DIR}/scripts/db/fix-application-isTestData.sql" 2>&1 | grep -E "NOTICE|ERROR" || true
  echo ""
fi

# Fix colonne Application.thankYouEmailSentAt (moteur de statut / email remerciement)
if [ -f "${ROOT_DIR}/scripts/db/fix-application-thankyou-sent.sql" ]; then
  echo "[DB-PUSH-ALL] Fix Application.thankYouEmailSentAt (si absente)"
  docker exec -i jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -f - < "${ROOT_DIR}/scripts/db/fix-application-thankyou-sent.sql" 2>&1 | grep -E "NOTICE|ERROR" || true
  echo ""
fi

# Partie 2/3 : system_metrics, container_metrics, service_availability_history
if [ -f "${ROOT_DIR}/scripts/db/init-system-metrics.sql" ]; then
  echo "[DB-PUSH-ALL] Partie 2/3 – Tables monitoring (init-system-metrics.sql)"
  echo "━━━ Partie 2/3 – Tables monitoring (init-system-metrics.sql) ━━━"
  echo "  system_metrics, container_metrics, service_availability_history"
  psql_in_postgres -U jobbingtrack -d jobbingtrack -f - < "${ROOT_DIR}/scripts/db/init-system-metrics.sql" && echo "  ✅ Tables system_metrics / service_availability_history OK" || echo "  ⚠️  init-system-metrics.sql a échoué (on continue ; ensure-metrics-aggregator créera les tables si besoin)"
  echo ""
fi

# Partie 3/3 : security_logs, network_*, firewall_rules, security_alerts, EmailLog, EmailTemplate
if [ -f "${ROOT_DIR}/scripts/db/init-key-tables.sql" ]; then
  echo "[DB-PUSH-ALL] Partie 3/3 – Tables sécurité / monitoring / emails (init-key-tables.sql)"
  echo "━━━ Partie 3/3 – Tables sécurité / monitoring / emails (init-key-tables.sql) ━━━"
  echo "  security_logs, network_*, EmailLog, EmailTemplate, security_alerts, etc."
  PSQL_USER="${POSTGRES_USER:-jobbingtrack}"
  PSQL_DB="${POSTGRES_DB:-jobbingtrack}"
  if psql_in_postgres -U "${PSQL_USER}" -d "${PSQL_DB}" -f - < "${ROOT_DIR}/scripts/db/init-key-tables.sql"; then
    echo "  ✅ Tables security_logs / EmailLog / EmailTemplate / network_* OK"
  else
    echo "  ❌ Erreur init-key-tables (vérifiez les logs ci-dessus)"
    exit 1
  fi
  echo ""
fi

# Seed des templates d'email par défaut (EmailTemplate) - après init-key-tables
if [ -f "${ROOT_DIR}/scripts/db/seed-email-templates.sql" ]; then
  echo "[DB-PUSH-ALL] Seed templates email (EmailTemplate)"
  PSQL_USER="${POSTGRES_USER:-jobbingtrack}"
  PSQL_DB="${POSTGRES_DB:-jobbingtrack}"
  if psql_in_postgres -U "${PSQL_USER}" -d "${PSQL_DB}" -f - < "${ROOT_DIR}/scripts/db/seed-email-templates.sql"; then
    echo "  ✅ Templates email insérés (ou déjà présents)"
  else
    echo "  ⚠️  Seed templates email ignoré (tables peut-être absentes : relancer init-key-tables)"
  fi
  echo ""
fi

# Garantir log_collector_logs (évite ERROR Postgres au démarrage du collecteur Rust)
if [ -f "${ROOT_DIR}/scripts/db/ensure-log-collector-tables.sql" ]; then
  echo "[DB-PUSH-ALL] Ensure – Table log_collector_logs (collecteur Rust)"
  if psql_in_postgres -U jobbingtrack -d jobbingtrack -f - < "${ROOT_DIR}/scripts/db/ensure-log-collector-tables.sql"; then
    echo "  ✅ log_collector_logs OK"
  else
    echo "  ⚠️  ensure-log-collector-tables a échoué (vérifiez Postgres)"
  fi
  echo ""
fi

# Garantir les tables metrics-aggregator (évite « unhealthy » si init-system-metrics / init-key-tables ont échoué partiellement)
if [ -f "${ROOT_DIR}/scripts/db/ensure-metrics-aggregator-tables.sql" ]; then
  echo "[DB-PUSH-ALL] Ensure – Tables metrics-aggregator (system_metrics_snapshots, container_metrics_snapshots, service_availability_history)"
  if psql_in_postgres -U jobbingtrack -d jobbingtrack -f - < "${ROOT_DIR}/scripts/db/ensure-metrics-aggregator-tables.sql"; then
    echo "  ✅ Tables metrics-aggregator OK"
  else
    echo "  ⚠️  ensure-metrics-aggregator-tables a échoué (vérifiez Postgres)"
  fi
  echo ""
fi

# Vérification stricte des tables critiques (évite les faux "db-push-all OK")
echo "[DB-PUSH-ALL] Vérification stricte tables critiques"
MISSING_TABLES="$(
docker exec -i jobbingtrack-postgres psql -U "${POSTGRES_USER:-jobbingtrack}" -d "${POSTGRES_DB:-jobbingtrack}" -t -A <<'SQL'
WITH required(name) AS (
  VALUES
    ('security_logs'),
    ('firewall_rules'),
    ('network_threats'),
    ('network_connections'),
    ('security_alerts'),
    ('security_metrics'),
    ('system_metrics_snapshots'),
    ('container_metrics_snapshots'),
    ('service_availability_history'),
    ('log_collector_logs')
)
SELECT r.name
FROM required r
WHERE to_regclass('public.' || r.name) IS NULL;
SQL
)"
if [ -n "${MISSING_TABLES}" ]; then
  echo "  ❌ Tables manquantes détectées:"
  printf "%s\n" "${MISSING_TABLES}" | sed 's/^/     - /'
  echo "  ❌ db-push-all incomplet (corrigez les scripts SQL ou permissions DB)"
  exit 1
else
  echo "  ✅ Tables critiques présentes (security + firewall + metrics + log collector)"
fi
echo ""

echo "[DB-PUSH-ALL] Fin — $(date '+%Y-%m-%dT%H:%M:%S%z')"
echo "✅ db-push-all terminé"
echo "   📦 Prisma db push : auth-service uniquement (schéma maître, 58 modèles)"
echo "   ⏭️  Autres services : client Prisma généré au build (pas de push destructif)"
# Redémarrer metrics-aggregator pour qu'il recharge le schéma (évite « cached plan must not change result type » et « cache lookup failed for type »)
if docker ps --format '{{.Names}}' | grep -q '^jobbingtrack-metrics-aggregator$'; then
  echo ""
  echo "🔄 Redémarrage de metrics-aggregator pour recharger le schéma BDD..."
  docker restart jobbingtrack-metrics-aggregator > /dev/null 2>&1 && echo "   ✅ metrics-aggregator redémarré" || echo "   ⚠️  Redémarrage ignoré"
fi
