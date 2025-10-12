#!/bin/bash

# Script de synchronisation des schémas Prisma
# Ajoute les modèles Call et ApplicationContact à tous les services

set -e

echo "🔄 Synchronisation des schémas Prisma..."
echo "==========================================="

# Liste des services à mettre à jour (call-service déjà fait)
SERVICES=(
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

# Modèle Call à ajouter
CALL_MODEL='
// ✅ NOUVEAU - Modèle Appel Téléphonique
model Call {
  id              String    @id @default(cuid())
  applicationId   String    // ⚠️ OBLIGATOIRE - Lié à une candidature
  contactId       String?   // Optionnel - Contact appelé
  type            CallType  @default(OUTGOING)
  scheduledDate   DateTime?
  callDate        DateTime?
  duration        Int?      // en secondes
  status          CallStatus @default(SCHEDULED)
  notes           String?
  outcome         String?   // Résultat de l'\''appel
  followUpNeeded  Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime? // 🗑️ Soft delete
  archivedAt      DateTime? // 📦 Archivage
  
  application     Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  contact         Contact?    @relation(fields: [contactId], references: [id], onDelete: SetNull)
}

// ✅ NOUVEAU - Table de liaison Application-Contact
// Permet de lier plusieurs contacts à une candidature
model ApplicationContact {
  id              String    @id @default(cuid())
  applicationId   String
  contactId       String
  role            String?   // Ex: "Recruteur", "Manager", "RH"
  isPrimary       Boolean   @default(false) // Contact principal
  createdAt       DateTime  @default(now())
  
  application     Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  contact         Contact     @relation(fields: [contactId], references: [id], onDelete: Cascade)
  
  @@unique([applicationId, contactId])
}
'

# Enums à ajouter
CALL_ENUMS='
// ✅ NOUVEAUX ENUMS pour les appels
enum CallType {
  OUTGOING      // Appel sortant
  INCOMING      // Appel entrant
  MISSED        // Appel manqué
}

enum CallStatus {
  SCHEDULED     // Planifié
  COMPLETED     // Terminé
  CANCELLED     // Annulé
  NO_ANSWER     // Pas de réponse
  VOICEMAIL     // Message vocal laissé
  RESCHEDULED   // Replanifié
}
'

for SERVICE in "${SERVICES[@]}"; do
  SCHEMA_FILE="${SERVICE}/prisma/schema.prisma"
  
  if [ ! -f "$SCHEMA_FILE" ]; then
    echo "⚠️  Schéma non trouvé pour $SERVICE, skip..."
    continue
  fi
  
  echo "📝 Mise à jour de $SERVICE..."
  
  # Vérifier si Call existe déjà
  if grep -q "model Call" "$SCHEMA_FILE"; then
    echo "   ✅ Modèle Call déjà présent"
  else
    # Ajouter Call et ApplicationContact avant le modèle Document
    sed -i '/^\/\/ Modèle Document$/i\'"$CALL_MODEL" "$SCHEMA_FILE"
    echo "   ✅ Modèle Call ajouté"
  fi
  
  # Vérifier si les enums existent déjà
  if grep -q "enum CallType" "$SCHEMA_FILE"; then
    echo "   ✅ Enums Call déjà présents"
  else
    # Ajouter les enums à la fin
    echo "$CALL_ENUMS" >> "$SCHEMA_FILE"
    echo "   ✅ Enums Call ajoutés"
  fi
  
  echo "   ✅ $SERVICE synchronisé"
done

echo ""
echo "🎉 Synchronisation terminée !"
echo ""
echo "⚠️  N'oubliez pas d'exécuter les migrations Prisma :"
echo "   cd backend"
echo "   make migrate"

