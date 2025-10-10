#!/usr/bin/env python3
"""
Script de synchronisation des schémas Prisma
Ajoute Call, ApplicationContact et les champs de suppression/archivage à tous les services
"""

import re
import os
from pathlib import Path

# Services à synchroniser (call-service, application-service et auth-service déjà faits)
SERVICES = [
    "company-service",
    "contact-service",
    "dashboard-service",
    "event-service",
    "followup-service",
    "interview-service",
    "notification-service",
    "profile-service",
    "workflow-service",
]

# Modèles Call et ApplicationContact à ajouter
CALL_MODEL = """
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
  outcome         String?   // Résultat de l'appel
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
"""

# Enums à ajouter
CALL_ENUMS = """
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
"""

def update_schema(service):
    """Met à jour le schéma Prisma d'un service"""
    schema_path = Path(f"{service}/prisma/schema.prisma")
    
    if not schema_path.exists():
        print(f"⚠️  Schéma non trouvé pour {service}, skip...")
        return
    
    print(f"📝 Mise à jour de {service}...")
    
    with open(schema_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Ajouter calls et contacts dans Application
    if 'calls           Call[]' not in content:
        content = re.sub(
            r'(followUps       FollowUp\[\]\n)',
            r'\1  calls           Call[]    // ✅ NOUVEAU\n',
            content
        )
        print("   ✅ Ajouté relation calls dans Application")
    
    if 'contacts        ApplicationContact[]' not in content:
        content = re.sub(
            r'(activities      Activity\[\]\n)(})',
            r'\1  contacts        ApplicationContact[] // ✅ NOUVEAU - Liaison avec contacts\n\2',
            content
        )
        print("   ✅ Ajouté relation contacts dans Application")
    
    # 2. Ajouter calls et applications dans Contact
    if 'calls           Call[]' not in content and 'model Contact' in content:
        content = re.sub(
            r'(  followUps       FollowUp\[\]\n)(  activities      Activity\[\])',
            r'\1  calls           Call[]    // ✅ NOUVEAU\n\2',
            content
        )
        # Ajouter applications après activities
        content = re.sub(
            r'(  activities      Activity\[\]\n)(})',
            r'\1  applications    ApplicationContact[] // ✅ NOUVEAU - Liaison avec candidatures\n\2',
            content
        )
        print("   ✅ Ajouté relations dans Contact")
    
    # 3. Ajouter deletedAt et archivedAt aux modèles principaux
    # Application
    if 'model Application' in content and 'deletedAt       DateTime?' not in re.search(r'model Application.*?(?=model|\Z)', content, re.DOTALL).group(0):
        content = re.sub(
            r'(model Application.*?updatedAt       DateTime  @updatedAt\n)',
            r'\1  deletedAt       DateTime? // 🗑️ Soft delete (corbeille)\n  archivedAt      DateTime? // 📦 Archivage\n',
            content,
            flags=re.DOTALL
        )
        print("   ✅ Ajouté deletedAt/archivedAt dans Application")
    
    # Interview
    if 'model Interview' in content:
        content = re.sub(
            r'(model Interview.*?updatedAt       DateTime  @updatedAt\n)(  \n  application)',
            r'\1  deletedAt       DateTime? // 🗑️ Soft delete\n  archivedAt      DateTime? // 📦 Archivage\n\2',
            content,
            flags=re.DOTALL,
            count=1
        )
        print("   ✅ Ajouté deletedAt/archivedAt dans Interview")
    
    # Contact
    if 'model Contact' in content and 'deletedAt' not in re.search(r'model Contact.*?(?=model|\Z)', content, re.DOTALL).group(0):
        content = re.sub(
            r'(model Contact.*?updatedAt       DateTime  @updatedAt\n)(  \n  user)',
            r'\1  deletedAt       DateTime? // 🗑️ Soft delete\n  archivedAt      DateTime? // 📦 Archivage\n\2',
            content,
            flags=re.DOTALL,
            count=1
        )
        print("   ✅ Ajouté deletedAt/archivedAt dans Contact")
    
    # FollowUp
    if 'model FollowUp' in content and 'deletedAt' not in re.search(r'model FollowUp.*?(?=model|\Z)', content, re.DOTALL).group(0):
        content = re.sub(
            r'(model FollowUp.*?updatedAt       DateTime  @updatedAt\n)(  \n  application)',
            r'\1  deletedAt       DateTime? // 🗑️ Soft delete\n  archivedAt      DateTime? // 📦 Archivage\n\2',
            content,
            flags=re.DOTALL,
            count=1
        )
        print("   ✅ Ajouté deletedAt/archivedAt dans FollowUp")
    
    # 4. Ajouter SetNull sur les relations company dans Contact
    content = content.replace(
        'company         Company?  @relation(fields: [companyId], references: [id])',
        'company         Company?  @relation(fields: [companyId], references: [id], onDelete: SetNull)'
    )
    content = content.replace(
        'contact         Contact?    @relation(fields: [contactId], references: [id])',
        'contact         Contact?    @relation(fields: [contactId], references: [id], onDelete: SetNull)'
    )
    
    # 5. Ajouter modèles Call et ApplicationContact si pas déjà présent
    if 'model Call {' not in content:
        # Trouver l'endroit où insérer (avant model Document)
        content = content.replace('// Modèle Document\nmodel Document', CALL_MODEL + '\n// Modèle Document\nmodel Document')
        print("   ✅ Ajouté modèle Call et ApplicationContact")
    
    # 6. Ajouter les enums si pas déjà présent
    if 'enum CallType' not in content:
        content += '\n' + CALL_ENUMS
        print("   ✅ Ajouté enums CallType et CallStatus")
    
    # Écrire le fichier mis à jour
    with open(schema_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"   ✅ {service} synchronisé avec succès")

def main():
    """Fonction principale"""
    print("🔄 Synchronisation des schémas Prisma...")
    print("=" * 50)
    
    for service in SERVICES:
        try:
            update_schema(service)
        except Exception as e:
            print(f"❌ Erreur lors de la mise à jour de {service}: {e}")
    
    print("\n🎉 Synchronisation terminée !")
    print("\n⚠️  N'oubliez pas d'exécuter les migrations Prisma :")
    print("   cd backend")
    print("   docker compose restart")

if __name__ == "__main__":
    main()

