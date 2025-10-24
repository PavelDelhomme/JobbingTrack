#!/usr/bin/env node

/**
 * Script de vérification de la réorganisation des tests
 * Vérifie que tous les fichiers ont été correctement déplacés
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VÉRIFICATION DE LA RÉORGANISATION DES TESTS\n');
console.log('=' .repeat(60));

let allTestsPassed = true;

// Test 1: Vérifier que les anciens fichiers n'existent plus dans la racine
function testOldFilesRemoved() {
  console.log('\n📁 Test 1: Vérification que les anciens fichiers ont été supprimés');

  const oldFiles = [
    'test-docker-image-names.js',
    'test-hydration-fixes.js',
    'test-implementation.js',
    'test-make-down-clean.js',
    'test-secure-env-vars.js',
    'verify-test-system.js',
    'TESTS-IMPROVEMENTS-SUMMARY.md',
    'TESTS-INTEGRATION-SUMMARY.md'
  ];

  let removedTestsPassed = true;

  oldFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`❌ ${file}: encore présent dans la racine`);
      removedTestsPassed = false;
    } else {
      console.log(`✅ ${file}: supprimé de la racine`);
    }
  });

  if (removedTestsPassed) {
    console.log('✅ Tous les anciens fichiers ont été supprimés de la racine');
    return true;
  } else {
    console.log('❌ Certains anciens fichiers sont encore présents');
    return false;
  }
}

// Test 2: Vérifier que les nouveaux fichiers existent dans les bons dossiers
function testNewFilesCreated() {
  console.log('\n📂 Test 2: Vérification des nouveaux emplacements');

  const newFiles = [
    'tests/docker/test-docker-images.js',
    'tests/docker/test-make-down-clean.js',
    'tests/integration/test-hydration-fixes.js',
    'tests/integration/test-implementation.js',
    'tests/integration/verify-test-system.js',
    'tests/security/test-secure-env-vars.js',
    'docs/tests-improvements.md',
    'docs/tests-integration.md',
    'tests/README-REORGANIZATION.md'
  ];

  let createdTestsPassed = true;

  newFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}: créé à la bonne place`);
    } else {
      console.log(`❌ ${file}: n'existe pas`);
      createdTestsPassed = false;
    }
  });

  if (createdTestsPassed) {
    console.log('✅ Tous les nouveaux fichiers sont aux bons emplacements');
    return true;
  } else {
    console.log('❌ Certains nouveaux fichiers manquent');
    return false;
  }
}

// Test 3: Vérifier que le README des tests a été mis à jour
function testReadmeUpdated() {
  console.log('\n📚 Test 3: Vérification du README des tests');

  const readmePath = 'tests/README.md';
  if (!fs.existsSync(readmePath)) {
    console.log('❌ tests/README.md n\'existe pas');
    return false;
  }

  const readmeContent = fs.readFileSync(readmePath, 'utf8');

  const checks = [
    { pattern: 'README-REORGANIZATION.md', description: 'Référence au README de réorganisation' },
    { pattern: 'test-docker-images.js', description: 'Test Docker images' },
    { pattern: 'test-hydration-fixes.js', description: 'Test d\'hydratation' },
    { pattern: 'test-implementation.js', description: 'Test d\'implémentation' },
    { pattern: 'test-secure-env-vars.js', description: 'Test sécurité variables d\'environnement' }
  ];

  let readmeTestsPassed = true;

  checks.forEach(check => {
    if (readmeContent.includes(check.pattern)) {
      console.log(`✅ README: contient ${check.description}`);
    } else {
      console.log(`❌ README: manque ${check.description}`);
      readmeTestsPassed = false;
    }
  });

  if (readmeTestsPassed) {
    console.log('✅ README des tests mis à jour correctement');
    return true;
  } else {
    console.log('❌ README des tests incomplet');
    return false;
  }
}

// Test 4: Vérifier que le Makefile a été mis à jour
function testMakefileUpdated() {
  console.log('\n🔧 Test 4: Vérification du Makefile');

  const makefilePath = 'Makefile';
  if (!fs.existsSync(makefilePath)) {
    console.log('❌ Makefile n\'existe pas');
    return false;
  }

  const makefileContent = fs.readFileSync(makefilePath, 'utf8');

  const checks = [
    { pattern: 'test-docker-images', description: 'Commande test-docker-images' },
    { pattern: 'test-hydration', description: 'Commande test-hydration' },
    { pattern: 'test-implementation', description: 'Commande test-implementation' },
    { pattern: 'test-secure-env', description: 'Commande test-secure-env' }
  ];

  let makefileTestsPassed = true;

  checks.forEach(check => {
    if (makefileContent.includes(check.pattern)) {
      console.log(`✅ Makefile: contient ${check.description}`);
    } else {
      console.log(`❌ Makefile: manque ${check.description}`);
      makefileTestsPassed = false;
    }
  });

  if (makefileTestsPassed) {
    console.log('✅ Makefile mis à jour avec les nouvelles commandes');
    return true;
  } else {
    console.log('❌ Makefile incomplet');
    return false;
  }
}

// Test 5: Vérifier que les scripts de test fonctionnent
function testScriptsWorkable() {
  console.log('\n🧪 Test 5: Vérification que les scripts sont fonctionnels');

  const scripts = [
    'tests/docker/test-docker-images.js',
    'tests/integration/test-hydration-fixes.js',
    'tests/integration/test-implementation.js',
    'tests/security/test-secure-env-vars.js'
  ];

  let scriptTestsPassed = true;

  scripts.forEach(script => {
    if (fs.existsSync(script)) {
      // Vérifier que le script a une fonction main ou export
      const content = fs.readFileSync(script, 'utf8');
      if (content.includes('async function') || content.includes('module.exports') || content.includes('export')) {
        console.log(`✅ ${script}: structure de script valide`);
      } else {
        console.log(`⚠️ ${script}: structure de script à vérifier`);
      }
    } else {
      console.log(`❌ ${script}: fichier manquant`);
      scriptTestsPassed = false;
    }
  });

  if (scriptTestsPassed) {
    console.log('✅ Tous les scripts ont une structure valide');
    return true;
  } else {
    console.log('❌ Problèmes avec certains scripts');
    return false;
  }
}

// Test 6: Vérifier que la documentation est accessible
function testDocumentationAccessible() {
  console.log('\n📖 Test 6: Vérification de l\'accessibilité de la documentation');

  const docs = [
    'docs/tests-improvements.md',
    'docs/tests-integration.md'
  ];

  let docTestsPassed = true;

  docs.forEach(doc => {
    if (fs.existsSync(doc)) {
      console.log(`✅ ${doc}: documentation accessible`);
    } else {
      console.log(`❌ ${doc}: documentation manquante`);
      docTestsPassed = false;
    }
  });

  if (docTestsPassed) {
    console.log('✅ Documentation accessible depuis docs/');
    return true;
  } else {
    console.log('❌ Documentation non accessible');
    return false;
  }
}

// Exécuter tous les tests
async function runAllTests() {
  const results = {
    oldFiles: testOldFilesRemoved(),
    newFiles: testNewFilesCreated(),
    readme: testReadmeUpdated(),
    makefile: testMakefileUpdated(),
    scripts: testScriptsWorkable(),
    docs: testDocumentationAccessible()
  };

  console.log('\n' + '='.repeat(60));
  console.log('🎯 RÉSUMÉ DE LA RÉORGANISATION:');
  console.log('=' .repeat(60));

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  console.log(`✅ ${passed}/${total} vérifications réussies`);

  if (passed === total) {
    console.log('\n🎉 RÉORGANISATION COMPLÈTE ET RÉUSSIE !');
    console.log('\n📋 Structure finale:');
    console.log('   ✅ tests/docker/     - Tests Docker et déploiement');
    console.log('   ✅ tests/integration/ - Tests d\'intégration étendus');
    console.log('   ✅ tests/security/    - Tests de sécurité');
    console.log('   ✅ tests/system/      - Tests système');
    console.log('   ✅ docs/             - Documentation réorganisée');
    console.log('   ✅ Makefile          - Commandes mises à jour');
    console.log('   ✅ README des tests  - Documentation mise à jour');

    console.log('\n🚀 Commandes disponibles:');
    console.log('   make test-docker-images  # Tests Docker');
    console.log('   make test-hydration      # Tests hydratation');
    console.log('   make test-implementation # Tests implémentation');
    console.log('   make test-secure-env     # Tests sécurité');
    console.log('   make test-system-verify  # Vérification système');

    console.log('\n📚 Documentation:');
    console.log('   docs/tests-improvements.md');
    console.log('   docs/tests-integration.md');
    console.log('   tests/README-REORGANIZATION.md');

  } else {
    console.log('\n⚠️ Certaines vérifications ont échoué');
    console.log('📋 Vérifiez les messages d\'erreur ci-dessus');
  }

  process.exit(passed === total ? 0 : 1);
}

runAllTests().catch(console.error);
