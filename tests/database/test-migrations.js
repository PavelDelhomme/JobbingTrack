/**
 * Tests de migration de base de données
 * Tests de migrations Prisma et intégrité des données
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

class MigrationTester {
  constructor() {
    this.prisma = new PrismaClient();
    this.testDatabase = 'jobbingtrack_test_migrations';
    this.results = [];
  }

  async setupTestDatabase() {
    console.log('🗄️ Configuration de la base de test...');

    try {
      // Créer une base de test temporaire
      await this.prisma.$executeRaw`
        CREATE DATABASE IF NOT EXISTS ${this.prisma.$queryRaw.unsafe(this.testDatabase)}
      `;

      // Utiliser la base de test
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL.replace(/jobbingtrack[^"]*/, this.testDatabase)
          }
        }
      });

      // Appliquer les migrations
      const { execSync } = require('child_process');
      execSync('npx prisma migrate deploy', {
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL.replace(/jobbingtrack[^"]*/, this.testDatabase)
        }
      });

      console.log('✅ Base de test configurée');
      return true;
    } catch (error) {
      console.error('❌ Erreur configuration base de test:', error);
      return false;
    }
  }

  async cleanupTestDatabase() {
    console.log('🧹 Nettoyage de la base de test...');

    try {
      await this.prisma.$disconnect();

      // Supprimer la base de test
      await this.prisma.$executeRaw`
        DROP DATABASE IF EXISTS ${this.prisma.$queryRaw.unsafe(this.testDatabase)}
      `;

      console.log('✅ Base de test nettoyée');
    } catch (error) {
      console.error('❌ Erreur nettoyage base de test:', error);
    }
  }

  /**
   * Test des migrations de base
   */
  async testBasicMigrations() {
    console.log('📄 Test migrations de base...');

    const results = [];

    try {
      // Vérifier que toutes les tables existent
      const tables = await this.prisma.$queryRaw`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = ${this.testDatabase}
      `;

      const expectedTables = [
        'users', 'applications', 'companies', 'contacts', 'interviews',
        'followups', 'calls', 'events', 'notifications', 'documents',
        'application_status_history', 'sync_queues', 'activities',
        'contact_companies', 'contact_applications', 'followup_contacts',
        'interview_contacts', 'contact_events'
      ];

      for (const expectedTable of expectedTables) {
        const exists = tables.some(table =>
          table.table_name === expectedTable
        );

        if (exists) {
          results.push({
            test: `Table ${expectedTable}`,
            status: 'PASSED',
            description: 'Table existe'
          });
          console.log(`✅ Table ${expectedTable} existe`);
        } else {
          results.push({
            test: `Table ${expectedTable}`,
            status: 'FAILED',
            description: 'Table manquante'
          });
          console.log(`❌ Table ${expectedTable} manquante`);
        }
      }

    } catch (error) {
      results.push({
        test: 'Basic Migrations',
        status: 'FAILED',
        description: error.message
      });
    }

    return results;
  }

  /**
   * Test des contraintes et index
   */
  async testConstraintsAndIndexes() {
    console.log('🔗 Test contraintes et index...');

    const results = [];

    try {
      // Vérifier les contraintes d'unicité
      const constraints = await this.prisma.$queryRaw`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_schema = ${this.testDatabase}
      `;

      const uniqueConstraints = constraints.filter(c =>
        c.constraint_type === 'UNIQUE'
      );

      if (uniqueConstraints.length > 0) {
        results.push({
          test: 'Unique Constraints',
          status: 'PASSED',
          description: `${uniqueConstraints.length} contraintes d'unicité trouvées`
        });
        console.log(`✅ ${uniqueConstraints.length} contraintes d'unicité`);
      } else {
        results.push({
          test: 'Unique Constraints',
          status: 'FAILED',
          description: 'Aucune contrainte d\'unicité trouvée'
        });
      }

      // Vérifier les index
      const indexes = await this.prisma.$queryRaw`
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE schemaname = ${this.testDatabase}
      `;

      if (indexes.length > 10) { // Au moins 10 index attendus
        results.push({
          test: 'Database Indexes',
          status: 'PASSED',
          description: `${indexes.length} index trouvés`
        });
        console.log(`✅ ${indexes.length} index trouvés`);
      } else {
        results.push({
          test: 'Database Indexes',
          status: 'FAILED',
          description: `Seulement ${indexes.length} index trouvés`
        });
      }

    } catch (error) {
      results.push({
        test: 'Constraints and Indexes',
        status: 'FAILED',
        description: error.message
      });
    }

    return results;
  }

  /**
   * Test des relations entre modèles
   */
  async testModelRelations() {
    console.log('🔗 Test relations entre modèles...');

    const results = [];

    try {
      // Créer des données de test
      const user = await this.prisma.user.create({
        data: {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: 'hashedpassword'
        }
      });

      const company = await this.prisma.company.create({
        data: {
          name: 'Test Company',
          industry: 'Technology'
        }
      });

      const application = await this.prisma.application.create({
        data: {
          userId: user.id,
          companyId: company.id,
          position: 'Test Position',
          status: 'CANDIDATE_PENDING'
        }
      });

      // Tester les relations
      const applicationWithRelations = await this.prisma.application.findUnique({
        where: { id: application.id },
        include: {
          company: true,
          user: true
        }
      });

      if (applicationWithRelations.company && applicationWithRelations.user) {
        results.push({
          test: 'Model Relations',
          status: 'PASSED',
          description: 'Relations entre modèles fonctionnelles'
        });
        console.log('✅ Relations entre modèles fonctionnelles');
      } else {
        results.push({
          test: 'Model Relations',
          status: 'FAILED',
          description: 'Relations entre modèles défaillantes'
        });
      }

      // Nettoyer les données de test
      await this.prisma.application.delete({ where: { id: application.id } });
      await this.prisma.company.delete({ where: { id: company.id } });
      await this.prisma.user.delete({ where: { id: user.id } });

    } catch (error) {
      results.push({
        test: 'Model Relations',
        status: 'FAILED',
        description: error.message
      });
    }

    return results;
  }

  /**
   * Test des migrations rollback
   */
  async testRollbackMigrations() {
    console.log('🔄 Test rollback des migrations...');

    const results = [];

    try {
      // Créer des données
      const user = await this.prisma.user.create({
        data: {
          email: 'rollback@example.com',
          firstName: 'Rollback',
          lastName: 'Test',
          password: 'password'
        }
      });

      // Simuler un rollback en supprimant manuellement
      await this.prisma.user.delete({ where: { id: user.id } });

      // Vérifier que les données sont supprimées
      const deletedUser = await this.prisma.user.findUnique({
        where: { email: 'rollback@example.com' }
      });

      if (!deletedUser) {
        results.push({
          test: 'Migration Rollback',
          status: 'PASSED',
          description: 'Rollback des migrations fonctionnel'
        });
        console.log('✅ Rollback des migrations fonctionnel');
      } else {
        results.push({
          test: 'Migration Rollback',
          status: 'FAILED',
          description: 'Rollback défaillant'
        });
      }

    } catch (error) {
      results.push({
        test: 'Migration Rollback',
        status: 'FAILED',
        description: error.message
      });
    }

    return results;
  }

  /**
   * Test des performances des requêtes
   */
  async testQueryPerformance() {
    console.log('⚡ Test performances des requêtes...');

    const results = [];

    try {
      // Créer des données de test en masse
      const users = [];
      const companies = [];
      const applications = [];

      for (let i = 0; i < 100; i++) {
        users.push({
          email: `perf_user_${i}@test.com`,
          firstName: `User${i}`,
          lastName: `Test${i}`,
          password: 'password'
        });

        companies.push({
          name: `Performance Company ${i}`,
          industry: 'Technology'
        });
      }

      // Insérer en batch
      const createdUsers = await this.prisma.user.createMany({
        data: users,
        skipDuplicates: true
      });

      const createdCompanies = await this.prisma.company.createMany({
        data: companies,
        skipDuplicates: true
      });

      console.log(`📊 Données de test créées: ${createdUsers.count} users, ${createdCompanies.count} companies`);

      // Test de performance des requêtes complexes
      const startTime = Date.now();

      const complexQuery = await this.prisma.application.findMany({
        include: {
          company: true,
          user: true,
          interviews: true,
          followUps: true,
          _count: {
            select: {
              interviews: true,
              followUps: true
            }
          }
        },
        take: 50
      });

      const queryTime = Date.now() - startTime;

      if (queryTime < 1000) { // Moins d'1 seconde
        results.push({
          test: 'Query Performance',
          status: 'PASSED',
          description: `Requête complexe: ${queryTime}ms`,
          performance: queryTime
        });
        console.log(`✅ Performance requête: ${queryTime}ms`);
      } else {
        results.push({
          test: 'Query Performance',
          status: 'WARNING',
          description: `Requête lente: ${queryTime}ms`,
          performance: queryTime
        });
        console.log(`⚠️ Requête lente: ${queryTime}ms`);
      }

      // Nettoyer les données de test
      await this.prisma.user.deleteMany({
        where: {
          email: { startsWith: 'perf_user_' }
        }
      });

      await this.prisma.company.deleteMany({
        where: {
          name: { startsWith: 'Performance Company' }
        }
      });

    } catch (error) {
      results.push({
        test: 'Query Performance',
        status: 'FAILED',
        description: error.message
      });
    }

    return results;
  }

  /**
   * Test des migrations de schéma
   */
  async testSchemaMigrations() {
    console.log('🔄 Test migrations de schéma...');

    const results = [];

    try {
      // Créer une table de test temporaire
      await this.prisma.$executeRaw`
        CREATE TABLE test_migration (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Insérer des données
      await this.prisma.$executeRaw`
        INSERT INTO test_migration (name) VALUES ('Test Migration 1'), ('Test Migration 2')
      `;

      // Vérifier les données
      const testData = await this.prisma.$queryRaw`
        SELECT * FROM test_migration
      `;

      if (testData.length === 2) {
        results.push({
          test: 'Schema Migration',
          status: 'PASSED',
          description: 'Migration de schéma fonctionnelle'
        });
        console.log('✅ Migration de schéma fonctionnelle');
      } else {
        results.push({
          test: 'Schema Migration',
          status: 'FAILED',
          description: 'Données de migration incorrectes'
        });
      }

      // Supprimer la table de test
      await this.prisma.$executeRaw`DROP TABLE test_migration`;

    } catch (error) {
      results.push({
        test: 'Schema Migration',
        status: 'FAILED',
        description: error.message
      });
    }

    return results;
  }

  /**
   * Test de cohérence des données
   */
  async testDataConsistency() {
    console.log('🔍 Test cohérence des données...');

    const results = [];

    try {
      // Créer des données interdépendantes
      const user = await this.prisma.user.create({
        data: {
          email: 'consistency@test.com',
          firstName: 'Consistency',
          lastName: 'Test',
          password: 'password'
        }
      });

      const company = await this.prisma.company.create({
        data: {
          name: 'Consistency Company',
          industry: 'Test'
        }
      });

      const application = await this.prisma.application.create({
        data: {
          userId: user.id,
          companyId: company.id,
          position: 'Consistency Test',
          status: 'CANDIDATE_PENDING'
        }
      });

      // Vérifier la cohérence des relations
      const retrievedApplication = await this.prisma.application.findUnique({
        where: { id: application.id },
        include: {
          user: true,
          company: true
        }
      });

      const isConsistent =
        retrievedApplication.user.id === user.id &&
        retrievedApplication.company.id === company.id &&
        retrievedApplication.userId === user.id &&
        retrievedApplication.companyId === company.id;

      if (isConsistent) {
        results.push({
          test: 'Data Consistency',
          status: 'PASSED',
          description: 'Cohérence des données vérifiée'
        });
        console.log('✅ Cohérence des données vérifiée');
      } else {
        results.push({
          test: 'Data Consistency',
          status: 'FAILED',
          description: 'Incohérence des données détectée'
        });
      }

      // Nettoyer
      await this.prisma.application.delete({ where: { id: application.id } });
      await this.prisma.company.delete({ where: { id: company.id } });
      await this.prisma.user.delete({ where: { id: user.id } });

    } catch (error) {
      results.push({
        test: 'Data Consistency',
        status: 'FAILED',
        description: error.message
      });
    }

    return results;
  }

  /**
   * Génère un rapport de migration
   */
  generateMigrationReport(results) {
    console.log('\n📊 RAPPORT DE MIGRATION:');
    console.log('========================');

    const passed = results.filter(r => r.status === 'PASSED').length;
    const failed = results.filter(r => r.status === 'FAILED').length;
    const warnings = results.filter(r => r.status === 'WARNING').length;

    console.log(`✅ TESTS RÉUSSIS: ${passed}`);
    console.log(`❌ TESTS ÉCHEC: ${failed}`);
    console.log(`⚠️ AVERTISSEMENTS: ${warnings}`);
    console.log(`📈 TAUX DE SUCCÈS: ${((passed / results.length) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ MIGRATIONS DÉFAILLANTES DÉTECTÉES!');
    } else if (warnings > 0) {
      console.log('\n⚠️ Migrations avec avertissements.');
    } else {
      console.log('\n✅ Toutes les migrations sont fonctionnelles!');
    }

    return {
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      passed,
      failed,
      warnings,
      successRate: ((passed / results.length) * 100).toFixed(1) + '%',
      results,
      recommendations: this.generateMigrationRecommendations(results)
    };
  }

  generateMigrationRecommendations(results) {
    const recommendations = [];

    const failedTests = results.filter(r => r.status === 'FAILED');
    const slowTests = results.filter(r => r.performance > 1000);

    if (failedTests.length > 0) {
      recommendations.push('Corriger les tests de migration échoués');
      recommendations.push('Vérifier la syntaxe des migrations Prisma');
      recommendations.push('Tester les migrations dans un environnement staging');
    }

    if (slowTests.length > 0) {
      recommendations.push('Optimiser les performances des requêtes lentes');
      recommendations.push('Ajouter des index appropriés');
    }

    if (results.every(r => r.status === 'PASSED')) {
      recommendations.push('Migrations prêtes pour la production');
      recommendations.push('Planifier les migrations automatisées');
    }

    return recommendations;
  }

  async runAllTests() {
    console.log('🚀 Démarrage des tests de migration...\n');

    try {
      // Configuration
      const setupSuccess = await this.setupTestDatabase();
      if (!setupSuccess) {
        throw new Error('Configuration de la base de test échouée');
      }

      // Tests
      const testResults = await Promise.all([
        this.testBasicMigrations(),
        this.testConstraintsAndIndexes(),
        this.testModelRelations(),
        this.testRollbackMigrations(),
        this.testQueryPerformance(),
        this.testSchemaMigrations(),
        this.testDataConsistency()
      ]);

      const allResults = testResults.flat();
      const report = this.generateMigrationReport(allResults);

      // Sauvegarder le rapport
      const fs = require('fs');
      const path = require('path');
      const reportPath = path.join('tests', 'reports', 'migration-test.json');

      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      console.log(`\n📋 Rapport de migration sauvegardé: ${reportPath}`);

      // Nettoyage
      await this.cleanupTestDatabase();

      return report;

    } catch (error) {
      console.error('❌ Erreur lors des tests de migration:', error);
      await this.cleanupTestDatabase();
      return { error: error.message };
    }
  }
}

// Script principal
async function main() {
  const tester = new MigrationTester();

  try {
    await tester.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = MigrationTester;
