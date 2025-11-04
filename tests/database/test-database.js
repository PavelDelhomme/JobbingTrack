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
      await this.disconnect();
      return true;
    } catch (error) {
      console.error('❌ Erreur de connexion:', error.message);
      return false;
    }
  }

  async testTables() {
    console.log('📊 Test des tables...');
    try {
      await this.connect();

      const result = await this.client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

      const tables = result.rows.map(row => row.table_name);
      console.log(`✅ ${tables.length} tables trouvées:`);
      tables.forEach(table => console.log(`   - ${table}`));

      await this.disconnect();
      return tables;
    } catch (error) {
      console.error('❌ Erreur lors du test des tables:', error.message);
      return [];
    }
  }

  async testConstraints() {
    console.log('🔒 Test des contraintes...');
    try {
      await this.connect();

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
      await this.disconnect();
      return result.rows;
    } catch (error) {
      console.error('❌ Erreur lors du test des contraintes:', error.message);
      return [];
    }
  }

  async testDataIntegrity() {
    console.log('🔍 Test de l\'intégrité des données...');
    try {
      await this.connect();

      const integrityTests = [
        { name: 'Users sans email', query: 'SELECT COUNT(*) as count FROM users WHERE email IS NULL' },
        { name: 'Companies sans nom', query: 'SELECT COUNT(*) as count FROM companies WHERE name IS NULL' },
        { name: 'Applications sans user_id', query: 'SELECT COUNT(*) as count FROM applications WHERE user_id IS NULL' },
        { name: 'Applications sans company_id', query: 'SELECT COUNT(*) as count FROM applications WHERE company_id IS NULL' }
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

      await this.disconnect();
    } catch (error) {
      console.error('❌ Erreur lors du test d\'intégrité:', error.message);
    }
  }

  async testPerformance() {
    console.log('⚡ Test de performance...');
    try {
      await this.connect();

      const performanceTests = [
        { name: 'Count users', query: 'SELECT COUNT(*) FROM users' },
        { name: 'Count companies', query: 'SELECT COUNT(*) FROM companies' },
        { name: 'Count applications', query: 'SELECT COUNT(*) FROM applications' },
        { name: 'Complex join', query: `
          SELECT COUNT(*)
          FROM applications a
          JOIN users u ON a.user_id = u.id
          JOIN companies c ON a.company_id = c.id
        ` }
      ];

      for (const test of performanceTests) {
        const start = Date.now();
        await this.client.query(test.query);
        const duration = Date.now() - start;
        console.log(`⚡ ${test.name}: ${duration}ms`);
      }

      await this.disconnect();
    } catch (error) {
      console.error('❌ Erreur lors du test de performance:', error.message);
    }
  }

  async runAllTests() {
    console.log('🧪 Lancement de tous les tests de base de données...\n');

    const results = {
      connection: await this.testConnection(),
      tables: await this.testTables(),
      constraints: await this.testConstraints(),
      dataIntegrity: await this.testDataIntegrity(),
      performance: await this.testPerformance()
    };

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
