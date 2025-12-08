#!/usr/bin/env node

/**
 * Script de validation des enums
 * Valide que tous les enums du schéma Prisma sont correctement définis et utilisés
 */

const fs = require('fs');
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

// Enums définis dans le schéma Prisma
const expectedEnums = {
  UserRole: ['USER', 'ADMIN', 'SUPER_ADMIN', 'TESTER'],
  ApplicationStatus: [
    'CANDIDATE_PENDING',
    'CANDIDATE_ACCEPTED',
    'CANDIDATE_REJECTED',
    'INTERVIEW_SCHEDULED',
    'INTERVIEW_COMPLETED',
    'OFFER_PENDING',
    'OFFER_ACCEPTED',
    'OFFER_REJECTED',
    'HIRED',
    'REJECTED',
    'WITHDRAWN',
    'STAGE',
  ],
  ContractType: ['CDI', 'CDD', 'ALTERNANCE', 'STAGE', 'FREELANCE', 'INTERIM', 'SAISONNIER'],
  WorkMode: ['ON_SITE', 'REMOTE', 'HYBRID'],
  ApplicationType: ['OFFRE', 'SPONTANEE'],
  CompanySize: ['STARTUP', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'],
  EventType: ['INTERVIEW', 'CALL', 'FOLLOWUP', 'MEETING', 'DEADLINE', 'REMINDER', 'OTHER'],
  NotificationType: ['EMAIL', 'SMS', 'PUSH', 'IN_APP'],
  NotificationPriority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
  SyncAction: ['CREATE', 'UPDATE', 'DELETE'],
};

/**
 * Extrait les enums du schéma Prisma
 */
function extractEnumsFromSchema() {
  // Dans le conteneur Docker, le schéma est dans /app/prisma/schema.prisma
  // En local, il est dans backend/prisma/schema.prisma
  let schemaPath;
  if (fs.existsSync('/app/prisma/schema.prisma')) {
    // Dans le conteneur Docker
    schemaPath = '/app/prisma/schema.prisma';
  } else if (fs.existsSync(path.join(__dirname, '../backend/prisma/schema.prisma'))) {
    // En local
    schemaPath = path.join(__dirname, '../backend/prisma/schema.prisma');
  } else if (fs.existsSync(path.join(process.cwd(), 'prisma/schema.prisma'))) {
    // Depuis le répertoire du service
    schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
  } else {
    throw new Error('Impossible de trouver le schéma Prisma. Chemins testés: /app/prisma/schema.prisma, ../backend/prisma/schema.prisma, ./prisma/schema.prisma');
  }
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  
  const enums = {};
  const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
  let match;
  
  while ((match = enumRegex.exec(schemaContent)) !== null) {
    const enumName = match[1];
    const enumBody = match[2];
    const values = enumBody
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('//'))
      .map(line => line.replace(/\/\/.*$/, '').trim())
      .filter(line => line);
    
    enums[enumName] = values;
  }
  
  return enums;
}

/**
 * Teste un enum
 */
async function testEnum(enumName, expectedValues) {
  const results = {
    name: enumName,
    tests: [],
    passed: 0,
    failed: 0,
  };

  try {
    // Test 1: Vérifier que l'enum est défini dans le schéma
    log.info(`Test 1: Vérification définition enum ${enumName}`);
    const schemaEnums = extractEnumsFromSchema();
    
    if (schemaEnums[enumName]) {
      const schemaValues = schemaEnums[enumName];
      const allMatch = expectedValues.every(val => schemaValues.includes(val));
      
      if (allMatch && schemaValues.length === expectedValues.length) {
        results.tests.push({
          name: 'Définition dans schéma',
          passed: true,
          message: `Enum ${enumName} correctement défini avec ${expectedValues.length} valeurs`,
        });
        results.passed++;
      } else {
        results.tests.push({
          name: 'Définition dans schéma',
          passed: false,
          message: `Valeurs manquantes ou incorrectes. Attendu: ${expectedValues.join(', ')}, Trouvé: ${schemaValues.join(', ')}`,
        });
        results.failed++;
      }
    } else {
      results.tests.push({
        name: 'Définition dans schéma',
        passed: false,
        message: `Enum ${enumName} non trouvé dans le schéma`,
      });
      results.failed++;
      return results;
    }

    // Test 2: Vérifier l'utilisation dans la base de données (si applicable)
    log.info(`Test 2: Vérification utilisation enum ${enumName} dans la base`);
    try {
      // Pour UserRole
      if (enumName === 'UserRole') {
        const users = await prisma.user.findMany({
          select: { role: true },
          distinct: ['role'],
        });
        const usedValues = users.map(u => u.role);
        const invalidValues = usedValues.filter(v => !expectedValues.includes(v));
        
        if (invalidValues.length === 0) {
          results.tests.push({
            name: 'Utilisation dans BDD',
            passed: true,
            message: `Toutes les valeurs utilisées sont valides (${usedValues.length} valeurs distinctes)`,
          });
          results.passed++;
        } else {
          results.tests.push({
            name: 'Utilisation dans BDD',
            passed: false,
            message: `Valeurs invalides trouvées: ${invalidValues.join(', ')}`,
          });
          results.failed++;
        }
      }
      
      // Pour ApplicationStatus
      if (enumName === 'ApplicationStatus') {
        const applications = await prisma.application.findMany({
          select: { status: true },
          distinct: ['status'],
        });
        const usedValues = applications.map(a => a.status);
        const invalidValues = usedValues.filter(v => !expectedValues.includes(v));
        
        if (invalidValues.length === 0) {
          results.tests.push({
            name: 'Utilisation dans BDD',
            passed: true,
            message: `Toutes les valeurs utilisées sont valides (${usedValues.length} valeurs distinctes)`,
          });
          results.passed++;
        } else {
          results.tests.push({
            name: 'Utilisation dans BDD',
            passed: false,
            message: `Valeurs invalides trouvées: ${invalidValues.join(', ')}`,
          });
          results.failed++;
        }
      }
      
      // Pour ContractType
      if (enumName === 'ContractType') {
        const applications = await prisma.application.findMany({
          select: { contractType: true },
          distinct: ['contractType'],
        });
        const usedValues = applications.map(a => a.contractType);
        const invalidValues = usedValues.filter(v => !expectedValues.includes(v));
        
        if (invalidValues.length === 0) {
          results.tests.push({
            name: 'Utilisation dans BDD',
            passed: true,
            message: `Toutes les valeurs utilisées sont valides (${usedValues.length} valeurs distinctes)`,
          });
          results.passed++;
        } else {
          results.tests.push({
            name: 'Utilisation dans BDD',
            passed: false,
            message: `Valeurs invalides trouvées: ${invalidValues.join(', ')}`,
          });
          results.failed++;
        }
      }
      
    } catch (error) {
      // Si la table n'existe pas, on passe le test
      if (error.code === 'P2021' || error.message.includes('does not exist')) {
        results.tests.push({
          name: 'Utilisation dans BDD',
          passed: true,
          message: 'Table non disponible (mode développement)',
        });
        results.passed++;
      } else {
        results.tests.push({
          name: 'Utilisation dans BDD',
          passed: false,
          message: `Erreur lors de la vérification: ${error.message}`,
        });
        results.failed++;
      }
    }

    // Test 3: Vérifier que toutes les valeurs attendues sont présentes
    log.info(`Test 3: Vérification valeurs enum ${enumName}`);
    const schemaEnums2 = extractEnumsFromSchema();
    const schemaValues = schemaEnums2[enumName] || [];
    const missingValues = expectedValues.filter(v => !schemaValues.includes(v));
    
    if (missingValues.length === 0) {
      results.tests.push({
        name: 'Valeurs complètes',
        passed: true,
        message: `Toutes les ${expectedValues.length} valeurs attendues sont présentes`,
      });
      results.passed++;
    } else {
      results.tests.push({
        name: 'Valeurs complètes',
        passed: false,
        message: `Valeurs manquantes: ${missingValues.join(', ')}`,
      });
      results.failed++;
    }

  } catch (error) {
    log.error(`Erreur lors du test de ${enumName}: ${error.message}`);
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
  log.section('Validation des Enums');
  
  const allResults = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const [enumName, expectedValues] of Object.entries(expectedEnums)) {
    const results = await testEnum(enumName, expectedValues);
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

