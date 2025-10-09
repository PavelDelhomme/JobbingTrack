#!/bin/bash
# Nettoyage base de données avec ton email

echo "🧹 Nettoyage base de données test..."

# Supprimer l'utilisateur dumb@delhomme.ovh et ses données
docker compose -f backend/docker-compose.yml exec postgres psql -U jobbingtrack -d jobbingtrack -c "
DELETE FROM applications WHERE user_id IN (SELECT id FROM users WHERE email = 'dumb@delhomme.ovh');
DELETE FROM companies WHERE id NOT IN (SELECT DISTINCT company_id FROM applications WHERE company_id IS NOT NULL);
DELETE FROM users WHERE email = 'dumb@delhomme.ovh';
" 2>/dev/null || true

echo "✅ Nettoyage terminé pour dumb@delhomme.ovh"
