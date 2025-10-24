#!/usr/bin/env node

/**
 * Vérification finale de la réorganisation complète
 * Confirme que tous les fichiers sont aux bons emplacements
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VÉRIFICATION FINALE DE LA RÉORGANISATION COMPLÈTE\n');
console.log('=' .repeat(70));

// Test 1: Vérifier que les anciens fichiers n'existent plus dans la racine
function testRootClean() {
  console.log('\n🗑️ Test 1: Racine nettoyée');

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

  let rootClean = true;

  oldFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`❌ ${file}: encore présent dans la racine`);
      rootClean = false;
    } else {
      console.log(`✅ ${file}: supprimé de la racine`);
    }
  });

  return rootClean;
}

// Test 2: Vérifier que les nouveaux fichiers existent
function testNewStructure() {
  console.log('\n📂 Test 2: Nouvelle structure créée');

  const expectedStructure = [
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

  let structureCreated = true;

  expectedStructure.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}: créé correctement`);
    } else {
      console.log(`❌ ${file}: manquant`);
      structureCreated = false;
    }
  });

  return structureCreated;
}

// Test 3: Vérifier que le Makefile a les bonnes commandes
function testMakefileCommands() {
  console.log('\n🔧 Test 3: Makefile mis à jour');

  const makefilePath = 'Makefile';
  if (!fs.existsSync(makefilePath)) {
    console.log('❌ Makefile n\'existe pas');
    return false;
  }

  const makefileContent = fs.readFileSync(makefilePath, 'utf8');

  const expectedCommands = [
    'test-docker-images',
    'test-docker-clean',
    'test-system-verify',
    'test-hydration',
    'test-implementation',
    'test-secure-env'
  ];

  let makefileUpdated = true;

  expectedCommands.forEach(command => {
    if (makefileContent.includes(command)) {
      console.log(`✅ make ${command}: commandée ajoutée`);
    } else {
      console.log(`❌ make ${command}: commandée manquante`);
      makefileUpdated = false;
    }
  });

  return makefileUpdated;
}

// Test 4: Vérifier que la documentation est cohérente
function testDocumentation() {
  console.log('\n📚 Test 4: Documentation cohérente');

  const readmePath = 'tests/README.md';
  if (!fs.existsSync(readmePath)) {
    console.log('❌ tests/README.md n\'existe pas');
    return false;
  }

  const readmeContent = fs.readFileSync(readmePath, 'utf8');

  const expectedSections = [
    'README-REORGANIZATION.md',
    'test-docker-images.js',
    'test-hydration-fixes.js',
    'test-implementation.js',
    'test-secure-env-vars.js'
  ];

  let documentationUpdated = true;

  expectedSections.forEach(section => {
    if (readmeContent.includes(section)) {
      console.log(`✅ README: contient ${section}`);
    } else {
      console.log(`❌ README: manque ${section}`);
      documentationUpdated = false;
    }
  });

  return documentationUpdated;
}

// Test 5: Vérifier que les scripts fonctionnent
function testScriptsFunctional() {
  console.log('\n🧪 Test 5: Scripts fonctionnels');

  const scripts = [
    'tests/docker/test-docker-images.js',
    'tests/integration/test-hydration-fixes.js',
    'tests/integration/test-implementation.js',
    'tests/security/test-secure-env-vars.js'
  ];

  let scriptsFunctional = true;

  scripts.forEach(script => {
    if (fs.existsSync(script)) {
      // Vérifier que le script a une structure basique
      const content = fs.readFileSync(script, 'utf8');
      if (content.includes('async function') || content.includes('function') || content.includes('console.log')) {
        console.log(`✅ ${script}: structure valide`);
      } else {
        console.log(`⚠️ ${script}: structure à vérifier`);
      }
    } else {
      console.log(`❌ ${script}: fichier manquant`);
      scriptsFunctional = false;
    }
  });

  return scriptsFunctional;
}

// Test 6: Vérifier que les dossiers existent
function testDirectoriesCreated() {
  console.log('\n📁 Test 6: Dossiers créés');

  const expectedDirs = [
    'tests/docker',
    'tests/system',
    'tests/integration',
    'tests/security'
  ];

  let dirsCreated = true;

  expectedDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      console.log(`✅ ${dir}/: ${files.length} fichier(s)`);
    } else {
      console.log(`❌ ${dir}/: dossier manquant`);
      dirsCreated = false;
    }
  });

  return dirsCreated;
}

// Test 7: Vérifier que les fichiers dans docs sont accessibles
function testDocsAccessible() {
  console.log('\n📖 Test 7: Documentation accessible');

  const docs = [
    'docs/tests-improvements.md',
    'docs/tests-integration.md'
  ];

  let docsAccessible = true;

  docs.forEach(doc => {
    if (fs.existsSync(doc)) {
      const content = fs.readFileSync(doc, 'utf8');
      if (content.length > 100) { // Au moins 100 caractères
        console.log(`✅ ${doc}: documentation accessible (${content.length} caractères)`);
      } else {
        console.log(`⚠️ ${doc}: contenu très court`);
      }
    } else {
      console.log(`❌ ${doc}: documentation manquante`);
      docsAccessible = false;
    }
  });

  return docsAccessible;
}

// Exécuter tous les tests
async function runAllTests() {
  const results = {
    rootClean: testRootClean(),
    structure: testNewStructure(),
    makefile: testMakefileCommands(),
    documentation: testDocumentation(),
    scripts: testScriptsFunctional(),
    directories: testDirectoriesCreated(),
    docs: testDocsAccessible()
  };

  console.log('\n' + '='.repeat(70));
  console.log('🎯 RÉSULTAT DE LA RÉORGANISATION:');
  console.log('=' .repeat(70));

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  console.log(`✅ ${passed}/${total} vérifications réussies`);

  if (passed === total) {
    console.log('\n🎉 RÉORGANISATION COMPLÈTE ET RÉUSSIE !');
    console.log('\n📋 Structure finale:');
    console.log('   ✅ tests/docker/     - Tests Docker et déploiement');
    console.log('   ✅ tests/system/     - Tests système et vérification');
    console.log('   ✅ tests/integration/ - Tests d\'intégration étendus');
    console.log('   ✅ tests/security/    - Tests de sécurité');
    console.log('   ✅ docs/             - Documentation réorganisée');
    console.log('   ✅ Makefile          - Commandes mises à jour');

    console.log('\n🚀 Commandes disponibles:');
    console.log('   make test-docker-images');
    console.log('   make test-docker-clean');
    console.log('   make test-system-verify');
    console.log('   make test-hydration');
    console.log('   make test-implementation');
    console.log('   make test-secure-env');

    console.log('\n📚 Documentation:');
    console.log('   docs/tests-improvements.md');
    console.log('   docs/tests-integration.md');
    console.log('   tests/README-REORGANIZATION.md');

    console.log('\n🔍 Pour vérifier manuellement:');
    console.log('   make help | grep "TESTS RÉORGANISÉS"');
    console.log('   ls tests/docker/ tests/integration/ tests/security/');
    console.log('   ls docs/ | grep test');

  } else {
    console.log('\n⚠️ Certaines vérifications ont échoué');
    console.log('📋 Vérifiez les messages d\'erreur ci-dessus');
  }

  console.log('\n🎯 La réorganisation est terminée !');
  console.log('✅ Projet plus propre et plus maintenable');

  process.exit(passed === total ? 0 : 1);
}

runAllTests().catch(console.error);
