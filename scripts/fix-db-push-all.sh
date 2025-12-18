#!/bin/bash
# Script pour corriger le Makefile db-push-all
# Gère les enums déjà existants (schémas partagés)

MAKEFILE="makefiles/database/Makefile"
TEMP_FILE=$(mktemp)

# Créer la version corrigée
sed -e 's|if docker exec -w /app $$CONTAINER npx prisma db push --accept-data-loss; then|# ✅ OPTIMISATION : Ignorer les erreurs d'\''enums déjà existants \
				PUSH_OUTPUT=$$(docker exec -w /app $$CONTAINER npx prisma db push --accept-data-loss --skip-generate 2>\&1); \
				PUSH_EXIT=$$?; \
				if [ $$PUSH_EXIT -eq 0 ] || echo "$$PUSH_OUTPUT" | grep -q "already exists\|in sync\|Done in"; then|g' \
    "$MAKEFILE" > "$TEMP_FILE"

# Ajouter gestion d'erreur améliorée
sed -i 's|echo "  ❌ $$service - Échec de prisma db push";|echo "  ❌ $$service - Échec de prisma db push"; \
					echo "     Erreur: $$PUSH_OUTPUT" | head -3;|g' "$TEMP_FILE"

mv "$TEMP_FILE" "$MAKEFILE"
echo "✅ Makefile corrigé pour gérer les enums partagés"

