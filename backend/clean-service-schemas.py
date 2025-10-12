#!/usr/bin/env python3
"""
Script pour nettoyer les schémas Prisma des services
Ne garde que les modèles spécifiques à chaque service
"""

import os
import re
from pathlib import Path

# Configuration par service
SERVICE_MODELS = {
    'application-service': [
        'Application', 'Platform', 'Interview', 'FollowUp', 'Call', 'Activity', 'ApplicationDocument', 'ApplicationContact'
    ],
    'auth-service': [
        'User', 'MessageTemplate', 'Document', 'Reminder'
    ],
    'company-service': [
        'Company'
    ],
    'contact-service': [
        'Contact'
    ],
    'interview-service': [
        'Interview'
    ],
    'followup-service': [
        'FollowUp'
    ],
    'call-service': [
        'Call'
    ],
    'notification-service': [
        'Notification'
    ],
    'dashboard-service': [
        'DashboardStats', 'UserStats', 'ApplicationStats'
    ],
    'workflow-service': [
        'Workflow', 'WorkflowRule', 'WorkflowExecution'
    ],
    'profile-service': [
        'UserProfile', 'UserPreference', 'UserSession'
    ],
    'event-service': [
        'Event', 'EventParticipant', 'EventTemplate'
    ]
}

# Modèles partagés qui doivent être dans le schéma principal uniquement
SHARED_MODELS = [
    'User', 'Company', 'Contact', 'Application', 'Interview', 'FollowUp', 'Call',
    'Platform', 'Document', 'ApplicationDocument', 'Activity', 'Reminder', 'MessageTemplate'
]

# Enums partagés
SHARED_ENUMS = [
    'UserRole', 'JobType', 'ApplicationStatus', 'InterviewStatus', 'InterviewType',
    'FollowUpType', 'FollowUpStatus', 'CallType', 'CallStatus', 'DocumentType',
    'ReminderType', 'MessageTemplateType', 'ActivityType'
]

def clean_service_schema(service_name: str, schema_path: str):
    """Nettoie un schéma de service en gardant seulement ses modèles spécifiques"""

    if not os.path.exists(schema_path):
        print(f"⚠️  Schéma non trouvé: {schema_path}")
        return

    with open(schema_path, 'r', encoding='utf-8') as f:
        content = f.read()

    print(f"🧹 Nettoyage du schéma {service_name}...")

    # Garder seulement l'en-tête et les générateurs
    lines = content.split('\n')
    cleaned_lines = []
    in_generator = False
    in_datasource = False

    for line in lines:
        # Garder les générateurs et datasource
        if line.strip().startswith('generator ') or line.strip().startswith('datasource '):
            if 'generator' in line:
                in_generator = True
            elif 'datasource' in line:
                in_datasource = True
            cleaned_lines.append(line)
        elif in_generator and line.strip().startswith('}'):
            in_generator = False
            cleaned_lines.append(line)
        elif in_datasource and line.strip().startswith('}'):
            in_datasource = False
            cleaned_lines.append(line)
        # Ignorer les modèles partagés et enums partagés
        elif (line.strip().startswith('model ') and any(model in line for model in SHARED_MODELS)) or \
             (line.strip().startswith('enum ') and any(enum in line for enum in SHARED_ENUMS)):
            # Ignorer ces lignes (modèles et enums partagés)
            pass
        # Garder les modèles spécifiques au service
        elif line.strip().startswith('model ') and any(model in line for model in SERVICE_MODELS.get(service_name, [])):
            # Garder ce modèle et tous ses champs jusqu'à la prochaine déclaration
            cleaned_lines.append(line)
            # Continuer jusqu'à trouver le prochain modèle ou la fin du fichier
            continue
        # Garder les enums spécifiques (s'il y en a)
        elif line.strip().startswith('enum ') and service_name in ['application-service', 'interview-service', 'followup-service', 'call-service']:
            # Garder les enums pour ces services
            cleaned_lines.append(line)
            continue
        # Garder les lignes vides et commentaires
        elif line.strip() == '' or line.strip().startswith('//'):
            cleaned_lines.append(line)
        # Ignorer tout le reste (relations vers modèles partagés, etc.)
        else:
            pass

    # Réécrire le fichier nettoyé
    with open(schema_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(cleaned_lines))

    print(f"✅ Schéma {service_name} nettoyé")

def main():
    """Fonction principale"""
    backend_dir = Path(__file__).parent

    for service_name in SERVICE_MODELS.keys():
        schema_path = backend_dir / service_name / 'prisma' / 'schema.prisma'
        if schema_path.exists():
            clean_service_schema(service_name, str(schema_path))

    print("\n🎉 Nettoyage des schémas terminé!")

if __name__ == '__main__':
    main()
