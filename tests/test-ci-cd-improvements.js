#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 Test des améliorations CI/CD');
console.log('===============================');

let allTestsPassed = true;

// Test 1: Vérifier que le flag --silent a été retiré
function testSilentFlagRemoved() {
    console.log('\n📋 Test 1: Vérification suppression du flag --silent');
    const workflowContent = fs.readFileSync('.github/workflows/ci-cd.yml', 'utf8');
    
    if (workflowContent.includes('--silent')) {
        console.log('❌ ÉCHEC: Flag --silent encore présent dans le workflow');
        return false;
    } else {
        console.log('✅ RÉUSSI: Flag --silent supprimé de toutes les installations npm ci');
        return true;
    }
}

// Test 2: Vérifier que les vérifications d'erreur sont en place
function testErrorChecking() {
    console.log('\n📋 Test 2: Vérification des blocs de vérification d\'erreur');
    const workflowContent = fs.readFileSync('.github/workflows/ci-cd.yml', 'utf8');
    
    const errorChecks = (workflowContent.match(/if npm ci.*then[\s\S]*?else[\s\S]*?ERREUR/g) || []).length;
    
    if (errorChecks >= 7) {
        console.log(`✅ RÉUSSI: ${errorChecks} blocs de vérification d'erreur trouvés`);
        return true;
    } else {
        console.log(`❌ ÉCHEC: Seulement ${errorChecks} blocs de vérification trouvés (attendu >= 7)`);
        return false;
    }
}

// Test 3: Vérifier la configuration PostgreSQL
function testPostgresConfig() {
    console.log('\n📋 Test 3: Vérification de la configuration PostgreSQL');
    const workflowContent = fs.readFileSync('.github/workflows/ci-cd.yml', 'utf8');
    
    const postgresUserCount = (workflowContent.match(/POSTGRES_USER: postgres/g) || []).length;
    const jobbingtrackUserCount = (workflowContent.match(/POSTGRES_USER: jobbingtrack/g) || []).length;
    
    if (postgresUserCount >= 3 && jobbingtrackUserCount === 0) {
        console.log(`✅ RÉUSSI: Configuration PostgreSQL corrigée (${postgresUserCount} occurrences de postgres)`);
        return true;
    } else {
        console.log(`❌ ÉCHEC: Configuration PostgreSQL incorrecte (${postgresUserCount} postgres, ${jobbingtrackUserCount} jobbingtrack)`);
        return false;
    }
}

// Test 4: Vérifier les conditions de tests
function testTestConditions() {
    console.log('\n📋 Test 4: Vérification des conditions de tests');
    const workflowContent = fs.readFileSync('.github/workflows/ci-cd.yml', 'utf8');
    
    // Tests E2E conditionnels
    const e2eConditions = (workflowContent.match(/if: github\.ref.*main.*develop/g) || []).length;
    
    // Tests performance conditionnels
    const perfConditions = (workflowContent.match(/if: github\.ref.*main.*develop.*release/g) || []).length;
    
    if (e2eConditions >= 2 && perfConditions >= 1) {
        console.log(`✅ RÉUSSI: Conditions de tests configurées (${e2eConditions} E2E, ${perfConditions} performance)`);
        return true;
    } else {
        console.log(`❌ ÉCHEC: Conditions de tests incomplètes (${e2eConditions} E2E, ${perfConditions} performance)`);
        return false;
    }
}

// Test 5: Vérifier le résumé coloré
function testColoredSummary() {
    console.log('\n📋 Test 5: Vérification du résumé coloré');
    const workflowContent = fs.readFileSync('.github/workflows/ci-cd.yml', 'utf8');
    
    const summarySection = workflowContent.includes('RÉSUMÉ COMPLET DE LA PIPELINE CI/CD');
    const categories = ['ANALYSES OBLIGATOIRES', 'TESTS OBLIGATOIRES', 'TESTS OPTIONNELS', 'TESTS E2E', 'TESTS SPÉCIALISÉS'].every(cat => 
        workflowContent.includes(cat)
    );
    
    if (summarySection && categories) {
        console.log('✅ RÉUSSI: Résumé coloré par catégories implémenté');
        return true;
    } else {
        console.log('❌ ÉCHEC: Résumé coloré incomplet');
        return false;
    }
}

// Test 6: Vérifier le filtrage des logs npm
function testNpmLogFiltering() {
    console.log('\n📋 Test 6: Vérification du filtrage des logs npm');
    const workflowContent = fs.readFileSync('.github/workflows/ci-cd.yml', 'utf8');
    
    const loglevelError = (workflowContent.match(/--loglevel=error/g) || []).length;
    const noVerbose = !workflowContent.includes('--verbose');
    
    if (loglevelError >= 7 && noVerbose) {
        console.log(`✅ RÉUSSI: Logs npm filtrés (${loglevelError} occurrences de --loglevel=error)`);
        return true;
    } else {
        console.log(`❌ ÉCHEC: Filtrage logs npm incomplet (${loglevelError} loglevel, verbose: ${!noVerbose})`);
        return false;
    }
}

// Exécuter tous les tests
const tests = [
    testSilentFlagRemoved,
    testErrorChecking,
    testPostgresConfig,
    testTestConditions,
    testColoredSummary,
    testNpmLogFiltering
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
    console.log('✅ Toutes les améliorations CI/CD sont correctement implémentées');
    process.exit(0);
} else {
    console.log('❌ CERTAINS TESTS ONT ÉCHOUÉ');
    console.log('🔧 Vérifiez les détails ci-dessus et corrigez les problèmes');
    process.exit(1);
}
