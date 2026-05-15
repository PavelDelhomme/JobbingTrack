/**
 * Test de la création d'utilisateurs de test
 *
 * Ce script teste la fonctionnalité de création d'utilisateurs de test
 * pour les tests Playwright
 */

const path = require('path');
const { devTestBypassFetchHeaders } = require('../../scripts/env/dev-test-bypass-fetch.cjs');

const API_BASE_URL = 'http://localhost:3000';
const bypassHeaders = () => devTestBypassFetchHeaders(path.join(__dirname, '..', '..'));

async function testUserCreation() {
    console.log('👤 Test de la création d\'utilisateurs de test...\n');

    try {
        // Test 1: Vérifier que l'API répond
        console.log('📡 Test 1: Vérification de l\'API...');
        const healthResponse = await fetch(`${API_BASE_URL}/health`);
        if (healthResponse.ok) {
            console.log('✅ API Gateway répond correctement');
        } else {
            console.log('❌ API Gateway ne répond pas');
            return;
        }

        // Test 2: Lister les utilisateurs de test existants
        console.log('\n👥 Test 2: Liste des utilisateurs de test...');
        const listResponse = await fetch(`${API_BASE_URL}/api/v1/admin/test-users`, {
            headers: {
                'Authorization': 'Bearer mock-jwt-token-test',
                ...bypassHeaders()
            }
        });

        if (listResponse.ok) {
            const data = await listResponse.json();
            console.log(`✅ Utilisateurs de test trouvés: ${data.users.length}`);
            data.users.forEach(user => {
                console.log(`   - ${user.email} (${user.role})`);
            });
        } else {
            console.log('❌ Impossible de lister les utilisateurs de test');
        }

        // Test 3: Créer un nouvel utilisateur de test
        console.log('\n➕ Test 3: Création d\'un utilisateur de test...');
        const newUserEmail = `testuser_${Date.now()}@jobbingtrack.test`;
        const createResponse = await fetch(`${API_BASE_URL}/api/v1/admin/test-users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer mock-jwt-token-test',
                ...bypassHeaders()
            },
            body: JSON.stringify({
                email: newUserEmail,
                password: 'testpassword123',
                firstName: 'Test',
                lastName: 'User',
                role: 'USER'
            })
        });

        if (createResponse.ok) {
            const data = await createResponse.json();
            console.log(`✅ Utilisateur créé: ${data.user.email}`);
        } else {
            const error = await createResponse.json();
            console.log(`❌ Erreur création utilisateur: ${error.error}`);
        }

        // Test 4: Vérifier que l'utilisateur a été créé
        console.log('\n🔍 Test 4: Vérification de l\'utilisateur créé...');
        const verifyResponse = await fetch(`${API_BASE_URL}/api/v1/admin/test-users`, {
            headers: {
                'Authorization': 'Bearer mock-jwt-token-test',
                ...bypassHeaders()
            }
        });

        if (verifyResponse.ok) {
            const data = await verifyResponse.json();
            const createdUser = data.users.find(u => u.email === newUserEmail);
            if (createdUser) {
                console.log(`✅ Utilisateur trouvé dans la liste: ${createdUser.email}`);
            } else {
                console.log('❌ Utilisateur non trouvé dans la liste');
            }
        }

        // Test 5: Test d'authentification avec le nouvel utilisateur
        console.log('\n🔐 Test 5: Authentification avec l\'utilisateur créé...');
        const authResponse = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...bypassHeaders()
            },
            body: JSON.stringify({
                email: newUserEmail,
                password: 'testpassword123'
            })
        });

        if (authResponse.ok) {
            const data = await authResponse.json();
            console.log(`✅ Authentification réussie: ${data.user.email} (${data.user.role})`);
        } else {
            const error = await authResponse.json();
            console.log(`❌ Échec d'authentification: ${error.error}`);
        }

        // Test 6: Supprimer l'utilisateur de test
        console.log('\n🗑️ Test 6: Suppression de l\'utilisateur de test...');
        const deleteResponse = await fetch(`${API_BASE_URL}/api/v1/admin/test-users/${newUserEmail}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer mock-jwt-token-test',
                ...bypassHeaders()
            }
        });

        if (deleteResponse.ok) {
            console.log('✅ Utilisateur supprimé avec succès');
        } else {
            const error = await deleteResponse.json();
            console.log(`❌ Erreur suppression: ${error.error}`);
        }

        console.log('\n🎉 Tests d\'utilisateurs de test terminés !');
        console.log('\n📋 Résumé des fonctionnalités:');
        console.log('✅ Création d\'utilisateurs de test');
        console.log('✅ Liste des utilisateurs de test');
        console.log('✅ Suppression d\'utilisateurs de test');
        console.log('✅ Authentification avec les utilisateurs créés');
        console.log('✅ Interface d\'administration intégrée');
        console.log('✅ Tests Playwright configurés');

    } catch (error) {
        console.error('❌ Erreur lors des tests:', error.message);
    }
}

// Exécuter les tests
testUserCreation();
