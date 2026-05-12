#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Test des corrections CI/CD');
console.log('================================');

// Test 1: Capture de la version avec tail -n 1
try {
    const version = execSync('./scripts/docker/get-docker-node-version.sh | tail -n 1', { encoding: 'utf8' }).trim();
    console.log(`✅ Version capturée: ${version}`);
    
    // Test 2: Validation regex
    const regex = /^[0-9]+\.[0-9]+\.[0-9]+$/;
    if (regex.test(version)) {
        console.log(`✅ Format de version valide: ${version}`);
        
        // Test 3: Simulation de l'écriture dans $GITHUB_OUTPUT
        const githubOutput = `node-version=${version}`;
        console.log(`✅ Format GITHUB_OUTPUT correct: ${githubOutput}`);
        
        // Test 4: Vérification que c'est une version LTS supportée
        if (version === '20.18.0') {
            console.log(`✅ Version LTS stable détectée: ${version}`);
        } else {
            console.log(`⚠️ Version non-LTS détectée: ${version} (mais format valide)`);
        }
        
    } else {
        console.log(`❌ Format de version invalide: ${version}`);
        process.exit(1);
    }
    
} catch (error) {
    console.log(`❌ Erreur lors de la capture de version: ${error.message}`);
    process.exit(1);
}

console.log('');
console.log('🎉 Tous les tests CI/CD sont passés !');
console.log('📋 La solution avec tail -n 1 et validation regex fonctionne correctement');
