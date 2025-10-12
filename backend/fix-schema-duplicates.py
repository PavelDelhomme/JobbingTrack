#!/usr/bin/env python3
"""
Script pour corriger les doublons dans les schémas Prisma
"""

import re
from pathlib import Path

SERVICES = [
    "auth-service",
    "application-service",
    "company-service",
    "contact-service",
    "dashboard-service",
    "event-service",
    "followup-service",
    "interview-service",
    "notification-service",
    "profile-service",
    "call-service",
    "workflow-service",
]

def remove_duplicates(content, field_names):
    """Supprime les champs en double dans les modèles"""
    for field in field_names:
        # Pattern pour détecter les doublons
        pattern = rf'^  {field}\s+.*?\n'
        
        # Trouver toutes les occurrences
        matches = list(re.finditer(pattern, content, re.MULTILINE))
        
        if len(matches) > 1:
            # Garder seulement la première occurrence
            for match in matches[1:]:
                content = content.replace(match.group(0), '', 1)
            print(f"   ✅ Supprimé {len(matches)-1} doublon(s) de '{field}'")
    
    return content

def fix_schema(service):
    """Corrige les doublons dans un schéma"""
    schema_path = Path(f"{service}/prisma/schema.prisma")
    
    if not schema_path.exists():
        return
    
    print(f"📝 Correction de {service}...")
    
    with open(schema_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Champs qui peuvent être dupliqués
    fields_to_check = [
        'deletedAt',
        'archivedAt',
        'deletedBy',
        'adminDeletedAt',
        'canRestore',
        'calls',
        'applications'
    ]
    
    content = remove_duplicates(content, fields_to_check)
    
    with open(schema_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"   ✅ {service} corrigé")

def main():
    print("🔧 Correction des doublons dans les schémas Prisma...")
    print("=" * 50)
    
    for service in SERVICES:
        try:
            fix_schema(service)
        except Exception as e:
            print(f"❌ Erreur pour {service}: {e}")
    
    print("\n🎉 Correction terminée !")

if __name__ == "__main__":
    main()

