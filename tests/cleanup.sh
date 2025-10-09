#!/bin/bash
# Nettoyage base de données avec ton email

echo "🧹 Nettoyage base de données test..."

# Supprimer l'utilisateur dumb@example.invalid et ses données
docker compose -f backend/docker-compose.yml exec postgres psql -U jobbingtrack -d jobbingtrack -c "
DELETE FROM applications WHERE user_id IN (SELECT id FROM users WHERE email = 'dumb@example.invalid');
DELETE FROM companies WHERE id NOT IN (SELECT DISTINCT company_id FROM applications WHERE company_id IS NOT NULL);
DELETE FROM users WHERE email = 'dumb@example.invalid';
" 2>/dev/null || true

echo "✅ Nettoyage terminé pour dumb@example.invalid"
