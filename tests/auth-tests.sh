#!/bin/bash
# Tests authentification avec dumb@example.invalid

API_GATEWAY="http://localhost:3000"
TEST_EMAIL="$1"
TEST_PASSWORD="$2" 
MODE="$3"

# Test inscription
echo "Test inscription: $TEST_EMAIL"
response=$(curl -s -X POST "$API_GATEWAY/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\",
        \"firstName\": \"Test\", 
        \"lastName\": \"User\"
    }")

if echo "$response" | grep -q "success\|token\|message"; then
    echo "✅ Inscription réussie"
elif echo "$response" | grep -q "exists\|already"; then
    echo "⚠️ Utilisateur existe déjà (normal)"
else
    echo "❌ Inscription échouée: $response"
fi

# Test connexion + récupération token
echo "Test connexion: $TEST_EMAIL"
response=$(curl -s -X POST "$API_GATEWAY/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\"
    }")

if command -v jq > /dev/null 2>&1; then
    token=$(echo "$response" | jq -r '.token // empty')
else
    token=$(echo "$response" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
fi

if [ -n "$token" ] && [ "$token" != "null" ]; then
    echo "✅ Connexion réussie"
    if [ "$MODE" = "--get-token" ]; then
        echo "$token"
    fi
    exit 0
else
    echo "❌ Connexion échouée: $response"
    exit 1
fi
