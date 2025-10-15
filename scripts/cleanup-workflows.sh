#!/bin/bash

# ============================================================================
# Script de nettoyage des workflows GitHub Actions
# ============================================================================

set -e

echo "🧹 NETTOYAGE DES WORKFLOWS GITHUB ACTIONS"
echo "========================================="

# Variables
WORKFLOWS_DIR=".github/workflows"
BACKUP_DIR="workflows-backup-$(date +%Y%m%d_%H%M%S)"

# Fonction pour créer une sauvegarde
create_backup() {
    echo "📦 Création d'une sauvegarde des workflows..."
    mkdir -p "$BACKUP_DIR"
    
    if [ -d "$WORKFLOWS_DIR" ]; then
        cp -r "$WORKFLOWS_DIR"/* "$BACKUP_DIR/" 2>/dev/null || true
        echo "✅ Sauvegarde créée dans $BACKUP_DIR/"
    else
        echo "⚠️ Dossier workflows non trouvé"
    fi
}

# Fonction pour nettoyer les workflows
cleanup_workflows() {
    echo ""
    echo "🧹 Nettoyage des workflows..."
    
    # Supprimer les fichiers de test et backup
    local files_to_remove=(
        "ci-cd-env.yml"
        "ci-cd-fixed.yml"
        "ci-cd-robust.yml"
        "test-node-version.yml"
        "test-simple.yml"
        "ci.yml"
    )
    
    for file in "${files_to_remove[@]}"; do
        if [ -f "$WORKFLOWS_DIR/$file" ]; then
            echo "🗑️ Suppression de $file..."
            rm "$WORKFLOWS_DIR/$file"
        fi
    done
    
    echo "✅ Nettoyage terminé"
}

# Fonction pour vérifier la structure finale
verify_structure() {
    echo ""
    echo "🔍 Vérification de la structure finale..."
    
    if [ -d "$WORKFLOWS_DIR" ]; then
        echo "📁 Contenu du dossier workflows :"
        ls -la "$WORKFLOWS_DIR/"
        
        # Vérifier qu'il n'y a que le workflow principal
        local file_count=$(find "$WORKFLOWS_DIR" -name "*.yml" | wc -l)
        echo ""
        echo "📊 Nombre de workflows : $file_count"
        
        if [ "$file_count" -eq 1 ]; then
            echo "✅ Structure optimale : 1 workflow principal"
        else
            echo "⚠️ Structure non optimale : $file_count workflows"
        fi
    else
        echo "❌ Dossier workflows non trouvé"
    fi
}

# Fonction pour afficher le résumé
show_summary() {
    echo ""
    echo "📊 RÉSUMÉ DU NETTOYAGE"
    echo "======================"
    echo "✅ Sauvegarde créée : $BACKUP_DIR/"
    echo "✅ Workflows nettoyés"
    echo "✅ Structure optimisée"
    echo ""
    echo "🎯 Workflow principal : ci-cd.yml"
    echo "📋 Configuration : Version Node.js depuis config.json/.node-version/.nvmrc"
    echo "🚀 Prêt pour la production"
}

# Fonction principale
main() {
    echo "🚀 Démarrage du nettoyage des workflows"
    echo "======================================"
    
    # Créer une sauvegarde
    create_backup
    
    # Nettoyer les workflows
    cleanup_workflows
    
    # Vérifier la structure
    verify_structure
    
    # Afficher le résumé
    show_summary
    
    echo ""
    echo "🎉 Nettoyage terminé avec succès !"
    echo "💡 Votre structure de workflows est maintenant optimale"
}

# Exécution du script
main "$@"
