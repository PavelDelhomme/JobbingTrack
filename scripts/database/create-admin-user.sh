#!/bin/bash

# Script pour créer l'utilisateur administrateur super admin
# Usage: ./scripts/create-admin-user.sh [email] [password]

set -e

# Variables par défaut
DEFAULT_EMAIL="${SUPER_ADMIN_EMAIL:-admin@jobbingtrack.com}"
DEFAULT_PASSWORD="${SUPER_ADMIN_PASSWORD:-SuperAdmin123!}"

EMAIL="${1:-$DEFAULT_EMAIL}"
PASSWORD="${2:-$DEFAULT_PASSWORD}"

echo "🔧 Création de l'utilisateur super administrateur..."
echo "📧 Email: $EMAIL"
echo "🔐 Mot de passe: [MASQUÉ]"

# Vérifier que Docker est disponible
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé ou n'est pas dans le PATH"
    exit 1
fi

# Vérifier que PostgreSQL est démarré et accessible
echo "🔍 Vérification de PostgreSQL..."
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if docker-compose exec postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT 1" > /dev/null 2>&1; then
        echo "✅ PostgreSQL est accessible"
        break
    fi

    echo "⏳ PostgreSQL n'est pas encore prêt, tentative $((ATTEMPT + 1))/$MAX_ATTEMPTS..."
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo "❌ PostgreSQL n'est pas accessible après $MAX_ATTEMPTS tentatives"
    exit 1
fi

echo "🗄️ Connexion à la base de données..."

# Créer l'utilisateur admin
docker-compose exec postgres psql -U jobbingtrack -d jobbingtrack -c "
INSERT INTO \"User\" (id, email, password, \"firstName\", \"lastName\", role, \"isActive\", \"createdAt\", \"updatedAt\")
VALUES (
    'admin_$(date +%s)',
    '$EMAIL',
    '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Super',
    'Administrateur',
    'SUPER_ADMIN',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    role = 'SUPER_ADMIN',
    \"isActive\" = true,
    \"updatedAt\" = NOW()
RETURNING id, email, role;
"

if [ $? -eq 0 ]; then
    echo "✅ Utilisateur super administrateur créé avec succès !"
    echo ""
    echo "🔑 Identifiants de connexion:"
    echo "   📧 Email: $EMAIL"
    echo "   🔐 Mot de passe: $PASSWORD"
    echo ""
    echo "🌐 Accédez à l'application:"
    echo "   Frontend: http://localhost:8080"
    echo "   API Gateway: http://localhost:3000"
    echo ""
    echo "💡 Note: Le mot de passe est hashé en base de données pour la sécurité"
else
    echo "❌ Erreur lors de la création de l'utilisateur"
    exit 1
fi
