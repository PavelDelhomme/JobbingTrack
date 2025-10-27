#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 Test de la syntaxe du workflow CI/CD');
console.log('=====================================');

let allTestsPassed = true;

// Test 1: Vérifier la syntaxe YAML
function testYamlSyntax() {
    console.log('\n📋 Test 1: Validation de la syntaxe YAML');
    try {
        const { execSync } = require('child_process');
        execSync('python3 -c "import yaml; yaml.safe_load(open(\'.github/workflows/ci-cd.yml\'))"', { stdio: 'pipe' });
        console.log('✅ RÉUSSI: Syntaxe YAML valide');
        return true;
    } catch (e) {
        console.log('❌ ÉCHEC: Erreur de syntaxe YAML');
        console.log('Détails:', e.message);
        return false;
    }
}

// Test 2: Vérifier que la fonction bash a été supprimée
function testFunctionRemoved() {
    console.log('\n📋 Test 2: Vérification suppression de la fonction bash');
    const content = fs.readFileSync('.github/workflows/ci-cd.yml', 'utf8');
    
    if (content.includes('print_status()')) {
        console.log('❌ ÉCHEC: Fonction bash print_status() encore présente');
        return false;
    }
    
    if (content.includes('local job_name')) {
        console.log('❌ ÉCHEC: Variables locales bash encore présentes');
        return false;
    }
    
    console.log('✅ RÉUSSI: Fonction bash supprimée et remplacée par des conditions GitHub Actions');
    return true;
}

// Test 3: Vérifier que les références GitHub Actions sont correctes
function testGitHubReferences() {
    console.log('\n📋 Test 3: Vérification des références GitHub Actions');
    const content = fs.readFileSync('.github/workflows/ci-cd.yml', 'utf8');
    
    const needsReferences = (content.match(/\$\{\{ needs\.[^}]+\.result \}\}/g) || []).length;
    
    if (needsReferences >= 6) {
        console.log(`✅ RÉUSSI: ${needsReferences} références needs.*.result trouvées`);
        return true;
    } else {
        console.log(`❌ ÉCHEC: Seulement ${needsReferences} références needs.*.result trouvées (attendu >= 6)`);
        return false;
    }
}

// Test 4: Vérifier que les conditions de branches sont correctes
function testBranchConditions() {
    console.log('\n📋 Test 4: Vérification des conditions de branches');
    const content = fs.readFileSync('.github/workflows/ci-cd.yml', 'utf8');
    
    const mainConditions = (content.match(/github\.ref.*main/g) || []).length;
    const developConditions = (content.match(/github\.ref.*develop/g) || []).length;
    const releaseConditions = (content.match(/github\.ref.*release/g) || []).length;
    
    if (mainConditions >= 3 && developConditions >= 3 && releaseConditions >= 2) {
        console.log(`✅ RÉUSSI: Conditions de branches correctes (${mainConditions} main, ${developConditions} develop, ${releaseConditions} release)`);
        return true;
    } else {
        console.log(`❌ ÉCHEC: Conditions de branches incomplètes (${mainConditions} main, ${developConditions} develop, ${releaseConditions} release)`);
        return false;
    }
}

// Test 5: Vérifier que les émojis sont conservés dans les messages
function testEmojisPreserved() {
    console.log('\n📋 Test 5: Vérification conservation des émojis');
    const content = fs.readFileSync('.github/workflows/ci-cd.yml', 'utf8');
    
    const emojiCategories = [
        'ANALYSES OBLIGATOIRES',
        'TESTS OBLIGATOIRES', 
        'TESTS OPTIONNELS',
        'TESTS E2E',
        'TESTS SPÉCIALISÉS'
    ].every(cat => content.includes(cat));
    
    const statusEmojis = ['✅', '❌', '⚠️', '⏭️', '❓'].every(emoji => content.includes(emoji));
    
    if (emojiCategories && statusEmojis) {
        console.log('✅ RÉUSSI: Émojis et catégories conservés');
        return true;
    } else {
        console.log('❌ ÉCHEC: Émojis ou catégories manquants');
        return false;
    }
}

// Exécuter tous les tests
const tests = [
    testYamlSyntax,
    testFunctionRemoved,
    testGitHubReferences,
    testBranchConditions,
    testEmojisPreserved
];

tests.forEach((test, index) => {
    if (!test()) {
        allTestsPassed = false;
    }
});

console.log('\n🎯 RÉSULTAT GLOBAL');
console.log('================');
if (allTestsPassed) {
    console.log('🎉 TOUS LES TESTS SONT PASSÉS !');
    console.log('✅ Le workflow CI/CD est maintenant syntaxiquement correct');
    console.log('📋 Prêt pour GitHub Actions');
    process.exit(0);
} else {
    console.log('❌ CERTAINS TESTS ONT ÉCHOUÉ');
    console.log('🔧 Vérifiez les détails ci-dessus');
    process.exit(1);
}
