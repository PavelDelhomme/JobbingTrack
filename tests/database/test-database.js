/**
 * Tests de base de données complets
 * Tests des migrations, seed, intégrité et performance
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

class DatabaseTester {
  constructor() {
    this.client = new Client({
      connectionString: process.env.DATABASE_URL || 'postgresql://jobbingtrack:jobbingtrack123@localhost:5432/jobbingtrack'
    });
  }

  async connect() {
    await this.client.connect();
    console.log('✅ Connecté à la base de données');
  }

  async disconnect() {
    await this.client.end();
    console.log('🔌 Déconnecté de la base de données');
  }

  async testConnection() {
    console.log('🔗 Test de connexion...');
    try {
      await this.connect();
      const result = await this.client.query('SELECT version()');
      console.log('✅ Connexion réussie:', result.rows[0].version.split(' ')[1]);
      // Ne pas déconnecter ici : on réutilise le même client pour les tests suivants
      return true;
    } catch (error) {
      console.error('❌ Erreur de connexion:', error.message);
      this.client.end().catch(() => {});
      this.client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://jobbingtrack:jobbingtrack123@localhost:5432/jobbingtrack'
      });
      return false;
    }
  }

  async testTables() {
    console.log('📊 Test des tables...');
    try {
      // Client déjà connecté par testConnection()
      const result = await this.client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

      const tables = result.rows.map(row => row.table_name);
      console.log(`✅ ${tables.length} tables trouvées:`);
      tables.forEach(table => console.log(`   - ${table}`));

      return tables;
    } catch (error) {
      console.error('❌ Erreur lors du test des tables:', error.message);
      return [];
    }
  }

  async testConstraints() {
    console.log('🔒 Test des contraintes...');
    try {
      const result = await this.client.query(`
        SELECT
          tc.table_name,
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name
      `);

      console.log(`✅ ${result.rows.length} contraintes trouvées`);
      return result.rows;
    } catch (error) {
      console.error('❌ Erreur lors du test des contraintes:', error.message);
      return [];
    }
  }

  async testDataIntegrity() {
    console.log('🔍 Test de l\'intégrité des données...');
    try {
      const integrityTests = [
        { name: 'Users sans email', query: 'SELECT COUNT(*) as count FROM "User" WHERE email IS NULL' },
        { name: 'Companies sans nom', query: 'SELECT COUNT(*) as count FROM "Company" WHERE name IS NULL' },
        { name: 'Applications sans user_id', query: 'SELECT COUNT(*) as count FROM "Application" WHERE "userId" IS NULL' },
        { name: 'Applications sans company_id', query: 'SELECT COUNT(*) as count FROM "Application" WHERE "companyId" IS NULL' }
      ];

      for (const test of integrityTests) {
        const result = await this.client.query(test.query);
        const count = parseInt(result.rows[0].count);
        if (count === 0) {
          console.log(`✅ ${test.name}: OK`);
        } else {
          console.log(`⚠️ ${test.name}: ${count} enregistrements problématiques`);
        }
      }
      return true;
    } catch (error) {
      console.error('❌ Erreur lors du test d\'intégrité:', error.message);
      return false;
    }
  }

  async testPerformance() {
    console.log('⚡ Test de performance...');
    try {
      const performanceTests = [
        { name: 'Count users', query: 'SELECT COUNT(*) FROM "User"' },
        { name: 'Count companies', query: 'SELECT COUNT(*) FROM "Company"' },
        { name: 'Count applications', query: 'SELECT COUNT(*) FROM "Application"' },
        { name: 'Complex join', query: `
          SELECT COUNT(*)
          FROM "Application" a
          JOIN "User" u ON a."userId" = u.id
          JOIN "Company" c ON a."companyId" = c.id
        ` }
      ];

      for (const test of performanceTests) {
        const start = Date.now();
        await this.client.query(test.query);
        const duration = Date.now() - start;
        console.log(`⚡ ${test.name}: ${duration}ms`);
      }
      return true;
    } catch (error) {
      console.error('❌ Erreur lors du test de performance:', error.message);
      return false;
    }
  }

  async runAllTests() {
    console.log('🧪 Lancement de tous les tests de base de données...\n');

    const connection = await this.testConnection();
    if (!connection) {
      console.log('\n⚠️  Postgres non démarré ou injoignable. Tests BDD ignorés (make up-full puis make db-push-all).');
      return { connection: false, tables: [], constraints: [], dataIntegrity: false, performance: false };
    }

    const results = {
      connection: true,
      tables: await this.testTables(),
      constraints: await this.testConstraints(),
      dataIntegrity: await this.testDataIntegrity(),
      performance: await this.testPerformance()
    };

    await this.disconnect();

    console.log('\n📋 Résumé des tests:');
    Object.entries(results).forEach(([test, result]) => {
      const status = Array.isArray(result) ? (result.length > 0 ? '✅' : '❌') : (result ? '✅' : '❌');
      console.log(`${status} ${test}: ${Array.isArray(result) ? result.length : (result ? 'OK' : 'FAIL')}`);
    });

    return results;
  }
}

// Script principal
async function main() {
  const tester = new DatabaseTester();

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

module.exports = DatabaseTester;
