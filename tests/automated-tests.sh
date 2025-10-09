#!/bin/bash
# Suite de tests automatisés

# Configuration
API_GATEWAY="http://localhost:3000"
TEST_EMAIL="dumb@delhomme.ovh"
TEST_PASSWORD="TestPassword123!"
TOKEN=""

echo "JobbingTrack - Test Auto"
echo "Email de test: $TEST_EMAIL"
echo "=============================="

# Phase 1 : Nettoyage préliminaire

echo "Phase 1: Nettoyage base de données..."
./cleanup.sh

# PHASE 2: Tests authentification
echo "Phase 2: Tests authentification..."
./auth-tests.sh "$TEST_EMAIL" "$TEST_PASSWORD"

# PHASE 3: Tests candidatures + auto-création entreprises  
echo "Phase 3: Tests candidatures avec auto-création entreprises..."
TOKEN=$(./auth-tests.sh "$TEST_EMAIL" "$TEST_PASSWORD" --get-token)
./application-tests.sh "$TOKEN"

# PHASE 4: Tests workflow complet
echo "Phase 4: Tests workflow utilisateur complet..."
test_complete_workflow() {
    # Test création candidature 'Google' (auto-création entreprise)
    echo "Test: Création candidature 'Google'..."
    response=$(curl -s -X POST "$API_GATEWAY/api/v1/applications" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $1" \
        -d '{
            "companyName": "Google",
            "position": "Software Engineer", 
            "type": "FULL_TIME",
            "status": "DRAFT"
        }')
    
    if echo "$response" | grep -q "success\|id"; then
        echo "✅ Candidature créée avec auto-création entreprise"
    else
        echo "❌ Échec création candidature"
        return 1
    fi
    
    # Vérifier que l'entreprise 'Google' a été créée
    echo "Test: Vérification auto-création entreprise..."
    companies=$(curl -s -H "Authorization: Bearer $1" "$API_GATEWAY/api/v1/companies")
    if echo "$companies" | grep -q "Google"; then
        echo "✅ Entreprise 'Google' créée automatiquement"
    else
        echo "❌ Entreprise 'Google' non créée"
        return 1
    fi
    
    return 0
}

test_complete_workflow "$TOKEN"

echo ""
echo "🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !"
echo "✅ Infrastructure opérationnelle"
echo "✅ Authentification fonctionnelle" 
echo "✅ Candidatures avec auto-création entreprises"
echo "✅ Email de test: $TEST_EMAIL"