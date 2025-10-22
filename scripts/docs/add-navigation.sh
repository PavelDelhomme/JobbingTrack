#!/usr/bin/env bash

# Ajoute automatiquement la navigation dans tous les docs

DOCS_DIR="docs"

# Header à ajouter en haut de chaque fichier
add_header() {
    local file=$1
    local temp_file="${file}.tmp"
    
    # Vérifier si le header existe déjà
    if ! grep -q "\[← Retour au README principal\]" "$file"; then
        echo "[← Retour au README principal](../README.md) | [📚 Index Documentation](README.md)" > "$temp_file"
        echo "" >> "$temp_file"
        echo "---" >> "$temp_file"
        echo "" >> "$temp_file"
        cat "$file" >> "$temp_file"
        mv "$temp_file" "$file"
        echo "✅ Header ajouté à $(basename $file)"
    fi
}

# Footer à ajouter en bas
add_footer() {
    local file=$1
    
    if ! grep -q "## Navigation" "$file"; then
        echo "" >> "$file"
        echo "---" >> "$file"
        echo "" >> "$file"
        echo "## Navigation" >> "$file"
        echo "" >> "$file"
        echo "- [📚 Index](README.md)" >> "$file"
        echo "- [🏠 Accueil](../README.md)" >> "$file"
        echo "✅ Footer ajouté à $(basename $file)"
    fi
}

# Traiter tous les fichiers .md dans docs/ sauf README.md
for file in "$DOCS_DIR"/*.md; do
    if [ "$(basename $file)" != "README.md" ]; then
        echo "Traitement de $(basename $file)..."
        add_header "$file"
        add_footer "$file"
    fi
done

echo ""
echo "✅ Navigation ajoutée à tous les documents !"
