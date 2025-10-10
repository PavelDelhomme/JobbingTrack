#!/bin/bash

# Script pour copier le schéma de référence correct vers tous les services

set -e

echo "🔄 Synchronisation complète des schémas Prisma..."
echo "=================================================="

# Se placer dans le dossier backend
cd "$(dirname "$0")"

# Le schéma de référence correct (celui qui a toutes les bonnes relations)
REFERENCE_SCHEMA="call-service/prisma/schema.prisma"

# Services à synchroniser
SERVICES=(
  "auth-service"
  "application-service"
  "company-service"
  "contact-service"
  "dashboard-service"
  "event-service"
  "followup-service"
  "interview-service"
  "notification-service"
  "profile-service"
  "workflow-service"
)

for service in "${SERVICES[@]}"; do
  echo "📝 Synchronisation de $service..."
  
  # Copier le schéma de référence
  cp "$REFERENCE_SCHEMA" "${service}/prisma/schema.prisma"
  
  echo "   ✅ $service synchronisé"
done

echo ""
echo "🎉 Synchronisation terminée !"
echo ""
echo "Tous les services utilisent maintenant le même schéma de référence."

