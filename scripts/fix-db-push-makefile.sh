#!/bin/bash
# Script pour corriger le Makefile db-push-all
# Gère les enums déjà existants (schémas partagés)

MAKEFILE="makefiles/database/Makefile"
BACKUP="${MAKEFILE}.backup"

# Créer une sauvegarde
cp "$MAKEFILE" "$BACKUP"
echo "✅ Sauvegarde créée: $BACKUP"

# Créer un fichier temporaire avec la correction
cat > /tmp/db_push_fix.txt << 'EOF'
			if docker exec $$CONTAINER test -f /app/prisma/schema.prisma 2>/dev/null; then \
				echo "  📦 Prisma db push sur $$service..."; \
				# ✅ OPTIMISATION : Ignorer les erreurs d'enums déjà existants (schémas partagés) \
				PUSH_OUTPUT=$$(docker exec -w /app $$CONTAINER npx prisma db push --accept-data-loss --skip-generate 2>&1); \
				PUSH_EXIT=$$?; \
				if [ $$PUSH_EXIT -eq 0 ] || echo "$$PUSH_OUTPUT" | grep -q "already exists\|in sync\|Done in"; then \
					echo "  ✅ $$service - Schéma synchronisé"; \
					PUSHED=$$((PUSHED + 1)); \
				else \
					echo "  ❌ $$service - Échec de prisma db push"; \
					echo "     Erreur: $$PUSH_OUTPUT" | head -3; \
					SKIPPED=$$((SKIPPED + 1)); \
				fi; \
EOF

# Utiliser Python pour faire le remplacement de manière fiable
python3 << 'PYTHON_SCRIPT'
import re

makefile_path = "makefiles/database/Makefile"
backup_path = f"{makefile_path}.backup2"

# Lire le fichier
with open(makefile_path, 'r') as f:
    content = f.read()

# Pattern à remplacer
old_pattern = r'(\s+if docker exec \$\$CONTAINER test -f /app/prisma/schema\.prisma 2>/dev/null; then \\\n\s+echo "  📦 Prisma db push sur \$\$service\.\.\."; \\\n\s+if docker exec -w /app \$\$CONTAINER npx prisma db push --accept-data-loss; then\n\s+echo "  ✅ \$\$service - Schéma synchronisé"; \\\n\s+PUSHED=\$\$\(\(PUSHED \+ 1\)\); \\\n\s+else\n\s+echo "  ❌ \$\$service - Échec de prisma db push"; \\\n\s+SKIPPED=\$\$\(\(SKIPPED \+ 1\)\); \\\n\s+fi; \\)'

new_text = '''			if docker exec $$CONTAINER test -f /app/prisma/schema.prisma 2>/dev/null; then \\
				echo "  📦 Prisma db push sur $$service..."; \\
				# ✅ OPTIMISATION : Ignorer les erreurs d'enums déjà existants (schémas partagés) \\
				PUSH_OUTPUT=$$(docker exec -w /app $$CONTAINER npx prisma db push --accept-data-loss --skip-generate 2>&1); \\
				PUSH_EXIT=$$?; \\
				if [ $$PUSH_EXIT -eq 0 ] || echo "$$PUSH_OUTPUT" | grep -q "already exists\\|in sync\\|Done in"; then \\
					echo "  ✅ $$service - Schéma synchronisé"; \\
					PUSHED=$$((PUSHED + 1)); \\
				else \\
					echo "  ❌ $$service - Échec de prisma db push"; \\
					echo "     Erreur: $$PUSH_OUTPUT" | head -3; \\
					SKIPPED=$$((SKIPPED + 1)); \\
				fi; \\'''

# Remplacer
if re.search(old_pattern, content):
    content = re.sub(old_pattern, new_text, content)
    with open(makefile_path, 'w') as f:
        f.write(content)
    print("✅ Makefile corrigé avec succès")
else:
    print("⚠️  Pattern non trouvé, vérification manuelle nécessaire")
PYTHON_SCRIPT

echo "✅ Correction appliquée"

