#!/bin/bash

# ============================================
# Script de Nettoyage des Volumes Docker Obsolètes
# ============================================

set -e

echo "🗑️  Nettoyage des volumes Docker obsolètes..."
echo ""
echo "⚠️  ATTENTION: Cette commande va supprimer les volumes suivants :"
echo "   - cloudity-* (ancien projet)"
echo "   - cms_crm_solutions_* (ancien projet)"
echo "   - taskflow* (ancien projet)"
echo "   - piter-* (ancien projet)"
echo "   - backend_postgres_data (ancien volume)"
echo "   - frontend_nextjs-cache (ancien volume)"
echo "   - init-dbsql_postgres_data (ancien volume)"
echo "   - postgres_data (ancien volume sans préfixe)"
echo "   - monitoring_* (anciens volumes sans préfixe jobbingtrack_)"
echo ""
read -p "Êtes-vous sûr ? (tapez 'oui' pour continmer): " confirm

if [ "$confirm" != "oui" ]; then
    echo "❌ Annulé"
    exit 0
fi

echo ""
echo "🗑️  Suppression des volumes..."

# Compteur
DELETED=0

# Fonction pour supprimer un volume
delete_volume() {
    if docker volume rm "$1" 2>/dev/null; then
        echo "  ✅ $1"
        DELETED=$((DELETED + 1))
    else
        echo "  ⚠️  $1 (n'existe pas ou utilisé)"
    fi
}

# Cloudity (ancien projet)
delete_volume "cloudity-email-node-modules"
delete_volume "cloudity-go-mod-cache-auth"
delete_volume "cloudity-go-mod-cache-gateway"
delete_volume "cloudity-node-modules-cache"
delete_volume "cloudity-postgres-data"
delete_volume "cloudity-python-cache"
delete_volume "cloudity-redis-data"
delete_volume "cloudity_postgres_services_data"
delete_volume "cloudity_redis_services_data"

# CMS CRM (ancien projet)
delete_volume "cms_crm_solutions_postgres_data"
delete_volume "cms_crm_solutions_redis_data"

# TaskFlow (ancien projet)
delete_volume "taskflow-minimal_postgres_data"
delete_volume "taskflow_api_data"
delete_volume "taskflow_db_data"
delete_volume "taskflow_grafana_data"
delete_volume "taskflow_logs"
delete_volume "taskflow_postgres_data"
delete_volume "taskflow_prometheus_data"
delete_volume "taskflow_redis_data"
delete_volume "taskflow_taskflow_data"
delete_volume "taskflow_taskflow_uploads"

# Piter (ancien projet)
delete_volume "piter-api_pgdata"
delete_volume "piter-apivierge_pgdata"
delete_volume "piter-symfony_mysql-data"
delete_volume "piter-symfony_postgres-data"
delete_volume "piter-symfony_rabbitmq_data"

# Anciens volumes JobbingTrack sans préfixe
delete_volume "backend_postgres_data"
delete_volume "frontend_nextjs-cache"
delete_volume "init-dbsql_postgres_data"
delete_volume "postgres_data"

# Anciens volumes monitoring sans préfixe jobbingtrack_
delete_volume "monitoring_alertmanager_data"
delete_volume "monitoring_grafana-data"
delete_volume "monitoring_grafana_data"
delete_volume "monitoring_loki-data"
delete_volume "monitoring_prometheus-data"
delete_volume "monitoring_prometheus_data"

echo ""
echo "✅ Nettoyage terminé !"
echo "📊 $DELETED volumes supprimés"
echo ""
echo "💡 Pour voir les volumes restants:"
echo "   docker volume ls"
echo ""
echo "💡 Pour voir uniquement les volumes JobbingTrack:"
echo "   docker volume ls | grep jobbingtrack"
