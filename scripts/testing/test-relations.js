#!/usr/bin/env node

/**
 * Script de test des relations Many-to-Many
 * Valide l'intégrité des relations many-to-many dans la base de données
 */

const path = require('path');

// Utiliser Prisma depuis auth-service
let PrismaClient, prisma;
try {
  // Dans le conteneur Docker, le répertoire de travail est /app
  // Prisma est installé dans /app/node_modules
  PrismaClient = require('@prisma/client').PrismaClient;
  prisma = new PrismaClient();
} catch (e) {
  console.error('❌ Impossible de charger Prisma Client:', e.message);
  console.error('💡 Assurez-vous que les services sont démarrés et que Prisma est installé');
  console.error('💡 Répertoire actuel:', process.cwd());
  process.exit(1);
}

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}📋 ${msg}${colors.reset}\n`),
};

// Relations Many-to-Many à tester
// D'après docs/database/schema/README.md et le schéma Prisma actuel
const relationsToTest = [
  {
    name: 'Contact ↔ Company',
    junctionTable: 'ContactCompany',
    leftTable: 'Contact',
    rightTable: 'Company',
    leftField: 'contactId',
    rightField: 'companyId',
  },
  {
    name: 'Contact ↔ Application',
    junctionTable: 'ContactApplication',
    leftTable: 'Contact',
    rightTable: 'Application',
    leftField: 'contactId',
    rightField: 'applicationId',
  },
  {
    name: 'FollowUp ↔ Contact',
    junctionTable: 'FollowUpContact',
    leftTable: 'FollowUp',
    rightTable: 'Contact',
    leftField: 'followUpId',
    rightField: 'contactId',
  },
  {
    name: 'Interview ↔ Contact',
    junctionTable: 'InterviewContact',
    leftTable: 'Interview',
    rightTable: 'Contact',
    leftField: 'interviewId',
    rightField: 'contactId',
  },
  // Note: ContactEvent mentionné dans la doc mais non trouvé dans le schéma Prisma
  // ApplicationTag, ContactTag, UserApplication n'existent pas et ne sont pas prévus
];

/**
 * Teste une relation many-to-many
 */
async function testRelation(relation) {
  const results = {
    name: relation.name,
    junctionTable: relation.junctionTable,
    tests: [],
    passed: 0,
    failed: 0,
  };

  try {
    // Test 1: Vérifier que la table de jonction existe
    log.info(`Test 1: Vérification existence table ${relation.junctionTable}`);
    try {
      const count = await prisma[relation.junctionTable].count();
      results.tests.push({
        name: 'Table existe',
        passed: true,
        message: `Table ${relation.junctionTable} existe (${count} enregistrements)`,
      });
      results.passed++;
    } catch (error) {
      results.tests.push({
        name: 'Table existe',
        passed: false,
        message: `Table ${relation.junctionTable} n'existe pas: ${error.message}`,
      });
      results.failed++;
      return results;
    }

    // Test 2: Vérifier les contraintes d'unicité
    log.info(`Test 2: Vérification contraintes d'unicité`);
    try {
      const duplicates = await prisma.$queryRawUnsafe(`
        SELECT "${relation.leftField}", "${relation.rightField}", COUNT(*) as count
        FROM "${relation.junctionTable}"
        GROUP BY "${relation.leftField}", "${relation.rightField}"
        HAVING COUNT(*) > 1
      `);
      
      if (duplicates.length === 0) {
        results.tests.push({
          name: 'Contraintes d\'unicité',
          passed: true,
          message: 'Aucun doublon détecté',
        });
        results.passed++;
      } else {
        results.tests.push({
          name: 'Contraintes d\'unicité',
          passed: false,
          message: `${duplicates.length} doublons détectés`,
        });
        results.failed++;
      }
    } catch (error) {
      results.tests.push({
        name: 'Contraintes d\'unicité',
        passed: false,
        message: `Erreur lors de la vérification: ${error.message}`,
      });
      results.failed++;
    }

    // Test 3: Vérifier l'intégrité référentielle (foreign keys)
    log.info(`Test 3: Vérification intégrité référentielle`);
    try {
      const orphaned = await prisma.$queryRawUnsafe(`
        SELECT j.*
        FROM "${relation.junctionTable}" j
        LEFT JOIN "${relation.leftTable}" l ON j."${relation.leftField}" = l.id
        LEFT JOIN "${relation.rightTable}" r ON j."${relation.rightField}" = r.id
        WHERE l.id IS NULL OR r.id IS NULL
      `);
      
      if (orphaned.length === 0) {
        results.tests.push({
          name: 'Intégrité référentielle',
          passed: true,
          message: 'Aucun enregistrement orphelin détecté',
        });
        results.passed++;
      } else {
        results.tests.push({
          name: 'Intégrité référentielle',
          passed: false,
          message: `${orphaned.length} enregistrements orphelins détectés`,
        });
        results.failed++;
      }
    } catch (error) {
      results.tests.push({
        name: 'Intégrité référentielle',
        passed: false,
        message: `Erreur lors de la vérification: ${error.message}`,
      });
      results.failed++;
    }

    // Test 4: Vérifier les index
    log.info(`Test 4: Vérification index`);
    try {
      const indexes = await prisma.$queryRawUnsafe(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = '${relation.junctionTable}'
      `);
      
      const hasLeftIndex = indexes.some(idx => idx.indexdef.includes(relation.leftField));
      const hasRightIndex = indexes.some(idx => idx.indexdef.includes(relation.rightField));
      
      if (hasLeftIndex && hasRightIndex) {
        results.tests.push({
          name: 'Index',
          passed: true,
          message: 'Index sur les deux champs de relation présents',
        });
        results.passed++;
      } else {
        results.tests.push({
          name: 'Index',
          passed: false,
          message: `Index manquants: left=${hasLeftIndex}, right=${hasRightIndex}`,
        });
        results.failed++;
      }
    } catch (error) {
      results.tests.push({
        name: 'Index',
        passed: false,
        message: `Erreur lors de la vérification: ${error.message}`,
      });
      results.failed++;
    }

  } catch (error) {
    log.error(`Erreur lors du test de ${relation.name}: ${error.message}`);
    results.tests.push({
      name: 'Test général',
      passed: false,
      message: error.message,
    });
    results.failed++;
  }

  return results;
}

/**
 * Affiche les résultats des tests
 */
function displayResults(results) {
  log.section(`Résultats pour ${results.name}`);
  
  results.tests.forEach((test) => {
    if (test.passed) {
      log.success(`${test.name}: ${test.message}`);
    } else {
      log.error(`${test.name}: ${test.message}`);
    }
  });
  
  console.log(`\n${results.passed} tests réussis, ${results.failed} tests échoués\n`);
}

/**
 * Fonction principale
 */
async function main() {
  log.section('Tests des Relations Many-to-Many');
  
  const allResults = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const relation of relationsToTest) {
    const results = await testRelation(relation);
    allResults.push(results);
    totalPassed += results.passed;
    totalFailed += results.failed;
    displayResults(results);
  }

  // Résumé global
  log.section('Résumé Global');
  console.log(`Total: ${totalPassed + totalFailed} tests`);
  log.success(`${totalPassed} tests réussis`);
  if (totalFailed > 0) {
    log.error(`${totalFailed} tests échoués`);
  } else {
    log.success('Tous les tests sont passés ! 🎉');
  }

  // Code de sortie
  process.exit(totalFailed > 0 ? 1 : 0);
}

// Exécution
main()
  .catch((error) => {
    log.error(`Erreur fatale: ${error.message}`);
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

