#!/usr/bin/env python3
"""
Script pour synchroniser tous les schémas Prisma avec les nouveaux états et modèles
"""

import os
import re
from pathlib import Path

# Liste des services à traiter
SERVICES = [
    'application-service',
    'auth-service',
    'call-service',
    'company-service',
    'contact-service',
    'dashboard-service',
    'event-service',
    'followup-service',
    'interview-service',
    'notification-service',
    'profile-service',
    'workflow-service'
]

def update_schema_file(schema_path):
    """Met à jour un fichier de schéma Prisma"""
    print(f"Traitement de {schema_path}")

    with open(schema_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Mettre à jour ApplicationStatus
    content = re.sub(
        r'enum ApplicationStatus\s*\{[^}]*\}',
        '''enum ApplicationStatus {
  CANDIDATE_PENDING    // "Candidaté et en attente"
  NO_RESPONSE          // "Aucune réponse"
  NO_RESPONSE_AFTER_FIRST_FOLLOWUP  // "Aucune réponse après 1 relance"
  NO_RESPONSE_AFTER_SECOND_FOLLOWUP // "Aucune réponse après 2 relance"
  FIRST_INTERVIEW_PENDING           // "1er entretien en attente"
  OTHER_INTERVIEW_PENDING           // "Autre entretien en attente"
  ACCEPTED_AFTER_INTERVIEW         // "Retenue après entretien"
  REJECTED_WITHOUT_INTERVIEW       // "Non retenue sans entretien"
  REJECTED_AFTER_INTERVIEW         // "Non retenue après entretien"
}''',
        content,
        flags=re.DOTALL
    )

    # 2. Mettre à jour InterviewStatus
    content = re.sub(
        r'enum InterviewStatus\s*\{[^}]*\}',
        '''enum InterviewStatus {
  UPCOMING_ARRIVAL     // "Entretien arrivé"
  COMPLETED            // "Entretien passé"
  FEEDBACK_PENDING     // "Retour prévu d'ici (plage de retour)"
  PENDING              // "Entretien en attente"
}''',
        content,
        flags=re.DOTALL
    )

    # 3. Ajouter FollowUpStatus après FollowUpType
    content = re.sub(
        r'(enum FollowUpType\s*\{[^}]*\})',
        r'\1\n\nenum FollowUpStatus {\n  PENDING_FOLLOWUP     // "Relance et en attente"\n  POSITIVE_RESPONSE    // "Retour positif reçu"\n  NEGATIVE_RESPONSE    // "Retour négatif reçu"\n  NO_RESPONSE          // "Aucun retour"\n  SCHEDULED_FOLLOWUP   // "Relance prévisionnel"\n}',
        content,
        flags=re.DOTALL
    )

    # 4. Ajouter le modèle Platform après Company
    company_pattern = r'(model Company\s*\{[^}]*applications[^}]*\})'
    platform_model = '''// Modèle Plateforme de Candidature
model Platform {
  id          String   @id @default(cuid())
  name        String   @unique
  website     String?
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  applications Application[]
}'''

    # Insérer Platform après Company
    def insert_platform(match):
        company_model = match.group(1)
        return company_model + '\n\n' + platform_model

    content = re.sub(company_pattern, insert_platform, content, flags=re.DOTALL)

    # 5. Mettre à jour le modèle Application
    application_pattern = r'(model Application\s*\{[^}]*\})'
    new_application_model = '''model Application {
  id              String            @id @default(cuid())
  userId          String
  companyId       String
  platformId      String?           // Plateforme de candidature utilisée
  position        String
  description     String?
  location        String?
  type            JobType           @default(FULL_TIME)
  salary          String?
  status          ApplicationStatus @default(CANDIDATE_PENDING)
  applicationDate DateTime          @default(now()) // Date et heure d'envoi
  jobUrl          String?
  notes           String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  user                User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  company             Company               @relation(fields: [companyId], references: [id])
  platform            Platform?             @relation(fields: [platformId], references: [id])
  interviews          Interview[]
  followUps           FollowUp[]
  applicationDocuments ApplicationDocument[]
  activities          Activity[]
  applicationContacts ApplicationContact[] // ✅ NOUVEAU - Liaison avec contacts
  calls               Call[]
}'''

    content = re.sub(application_pattern, new_application_model, content, flags=re.DOTALL)

    # 6. Mettre à jour le modèle Interview
    interview_pattern = r'(model Interview\s*\{[^}]*\})'
    new_interview_model = '''model Interview {
  id            String          @id @default(cuid())
  applicationId String
  type          InterviewType
  scheduledAt   DateTime        // Date et heure programmée
  duration      Int?            // en minutes
  location      String?
  meetingUrl    String?
  interviewer   String?
  notes         String?
  status        InterviewStatus @default(PENDING)
  feedback      String?
  completedAt   DateTime?       // Date et heure de fin
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
}'''

    content = re.sub(interview_pattern, new_interview_model, content, flags=re.DOTALL)

    # 7. Mettre à jour le modèle FollowUp
    followup_pattern = r'(model FollowUp\s*\{[^}]*\})'
    new_followup_model = '''model FollowUp {
  id             String        @id @default(cuid())
  applicationId  String        // ⚠️ OBLIGATOIRE - Lié à une candidature
  contactId      String?       // Optionnel - Contact à relancer
  type           FollowUpType
  scheduledDate  DateTime      // Date et heure programmée
  completed      Boolean       @default(false)
  completedDate  DateTime?     // Date et heure de fin
  sentDate       DateTime?     // Date et heure d'envoi effectif
  subject        String
  message        String?
  response       String?
  responseDate   DateTime?     // Date et heure de réponse
  status         FollowUpStatus @default(PENDING_FOLLOWUP)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  deletedBy      String?       // ID de l\'admin qui a supprimé
  adminDeletedAt DateTime?     // Date de suppression admin
  canRestore     Boolean       @default(true) // Peut être restauré

  application Application   @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  contact     Contact?      @relation(fields: [contactId], references: [id], onDelete: SetNull)
}'''

    content = re.sub(followup_pattern, new_followup_model, content, flags=re.DOTALL)

    # Écrire le fichier modifié
    with open(schema_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"✅ {schema_path} mis à jour")

def main():
    """Fonction principale"""
    backend_dir = Path(__file__).parent

    for service in SERVICES:
        schema_path = backend_dir / service / 'prisma' / 'schema.prisma'
        if schema_path.exists():
            update_schema_file(schema_path)
        else:
            print(f"⚠️  Schéma non trouvé: {schema_path}")

    print("\n🎉 Tous les schémas ont été synchronisés!")

if __name__ == '__main__':
    main()