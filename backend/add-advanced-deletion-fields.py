#!/usr/bin/env python3
"""
Script pour ajouter les champs avancés de suppression
Ajoute deletedBy, adminDeletedAt, canRestore à tous les modèles principaux
"""

import re
import os
from pathlib import Path

# Services à mettre à jour
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

# Modèles à mettre à jour
MODELS_TO_UPDATE = [
    "Application",
    "Interview",
    "Contact",
    "FollowUp",
    "Call",
    "Company",
    "User"
]

def add_advanced_deletion_fields(service):
    """Ajoute les champs avancés de suppression à un service"""
    schema_path = Path(f"{service}/prisma/schema.prisma")
    
    if not schema_path.exists():
        print(f"⚠️  Schéma non trouvé pour {service}, skip...")
        return
    
    print(f"📝 Mise à jour de {service}...")
    
    with open(schema_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = False
    
    for model_name in MODELS_TO_UPDATE:
        # Vérifier si le modèle existe
        if f'model {model_name}' not in content:
            continue
        
        # Vérifier si deletedBy existe déjà dans ce modèle
        model_pattern = rf'model {model_name} \{{.*?(?=model |\Z)'
        model_match = re.search(model_pattern, content, re.DOTALL)
        
        if model_match and 'deletedBy' not in model_match.group(0):
            # Ajouter les champs après deletedAt et archivedAt
            pattern = rf'(model {model_name}.*?archivedAt      DateTime\?\s*(?://[^\n]*)?\n)'
            replacement = r'\1  deletedBy       String?   // ID de l\'admin qui a supprimé\n  adminDeletedAt  DateTime? // Date de suppression admin\n  canRestore      Boolean   @default(true) // Peut être restauré\n'
            
            content = re.sub(pattern, replacement, content, flags=re.DOTALL, count=1)
            modified = True
            print(f"   ✅ Ajouté champs avancés de suppression dans {model_name}")
    
    if modified:
        # Écrire le fichier mis à jour
        with open(schema_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"   ✅ {service} mis à jour avec succès")
    else:
        print(f"   ℹ️  {service} déjà à jour")

def main():
    """Fonction principale"""
    print("🔄 Ajout des champs avancés de suppression...")
    print("=" * 50)
    
    for service in SERVICES:
        try:
            add_advanced_deletion_fields(service)
        except Exception as e:
            print(f"❌ Erreur lors de la mise à jour de {service}: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n🎉 Mise à jour terminée !")
    print("\n⚠️  N'oubliez pas d'exécuter les migrations Prisma :")
    print("   cd backend")
    print("   docker compose down")
    print("   docker compose up -d postgres")
    print("   # Attendre que postgres soit prêt")
    print("   docker compose run --rm auth-service npx prisma migrate dev --name add_advanced_deletion_fields")
    print("   docker compose up -d")

if __name__ == "__main__":
    main()

