/**
 * Tests de synchronisation du schéma Prisma.
 *
 * Le projet n'a pas de migrations Prisma versionnées complètes dans ce dossier ;
 * le flux supporté en dev/CI est donc `prisma db push` depuis le schéma maître.
 */

const { Client } = require('pg');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const PRISMA_DIR = path.join(ROOT, 'backend/prisma');
const BASE_DATABASE_URL = process.env.DATABASE_URL || 'postgresql://jobbingtrack:jobbingtrack123@localhost:5000/jobbingtrack';
const TEST_DATABASE = process.env.TEST_MIGRATION_DATABASE || 'jobbingtrack_test_migrations';

function databaseUrlFor(databaseName) {
  const url = new URL(BASE_DATABASE_URL);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function maintenanceUrl() {
  const url = new URL(BASE_DATABASE_URL);
  url.pathname = '/postgres';
  return url.toString();
}

async function withClient(connectionString, fn) {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function recreateDatabase() {
  console.log(`🗄️ Recréation base temporaire ${TEST_DATABASE}...`);
  await withClient(maintenanceUrl(), async (client) => {
    await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [TEST_DATABASE]);
    await client.query(`DROP DATABASE IF EXISTS "${TEST_DATABASE}"`);
    await client.query(`CREATE DATABASE "${TEST_DATABASE}"`);
  });
}

function pushSchema() {
  console.log('📦 Application du schéma par prisma db push...');
  execFileSync('/usr/bin/npx', ['prisma', 'db', 'push', '--accept-data-loss', '--skip-generate'], {
    cwd: PRISMA_DIR,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrlFor(TEST_DATABASE)
    }
  });
}

async function applyDbPushAllCompatibilityFixes() {
  console.log('🧩 Application des correctifs SQL inclus dans db-push-all...');
  const sqlFiles = [
    'scripts/db/fix-application-isarchived.sql',
    'scripts/db/fix-application-isTestData.sql',
    'scripts/db/fix-application-thankyou-sent.sql',
    'scripts/db/init-key-tables.sql'
  ];

  await withClient(databaseUrlFor(TEST_DATABASE), async (client) => {
    for (const relativePath of sqlFiles) {
      const fullPath = path.join(ROOT, relativePath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Script SQL introuvable: ${relativePath}`);
      }
      await client.query(fs.readFileSync(fullPath, 'utf8'));
      console.log(`✅ ${relativePath}`);
    }
  });
}

async function assertDatabaseShape() {
  const checks = [];
  await withClient(databaseUrlFor(TEST_DATABASE), async (client) => {
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    checks.push(['tables >= 55', tables.rows.length >= 55, `${tables.rows.length} tables`]);

    const criticalTables = [
      'User',
      'Company',
      'Application',
      'ApplicationStatus',
      'InterviewStatus',
      'FollowUpStatus',
      'security_logs',
      'firewall_rules',
      'deployments',
      'system_metrics_snapshots',
      'log_collector_logs'
    ];
    for (const tableName of criticalTables) {
      const exists = await client.query('SELECT to_regclass($1) IS NOT NULL AS exists', [`public."${tableName}"`]);
      checks.push([`table ${tableName}`, exists.rows[0].exists, 'présence table']);
    }

    const criticalColumns = [
      ['Application', 'isTestData'],
      ['Application', 'isArchived'],
      ['Application', 'thankYouEmailSentAt'],
      ['Application', 'deletedAt'],
      ['Company', 'isTestData'],
      ['Company', 'deletedAt']
    ];
    for (const [tableName, columnName] of criticalColumns) {
      const exists = await client.query(`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
        ) AS exists
      `, [tableName, columnName]);
      checks.push([`${tableName}.${columnName}`, exists.rows[0].exists, 'présence colonne']);
    }

    const foreignKeys = await client.query(`
      SELECT COUNT(*)::int AS count
      FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY'
    `);
    checks.push(['foreign keys >= 30', foreignKeys.rows[0].count >= 30, `${foreignKeys.rows[0].count} FK`]);

    const indexes = await client.query(`
      SELECT COUNT(*)::int AS count
      FROM pg_indexes
      WHERE schemaname = 'public'
    `);
    checks.push(['indexes >= 30', indexes.rows[0].count >= 30, `${indexes.rows[0].count} index`]);

    await client.query('BEGIN');
    try {
      const user = await client.query(`
        INSERT INTO "User" ("id", email, "firstName", "lastName", password, role, "emailVerified", "createdAt", "updatedAt")
        VALUES ('test-migration-user', 'migration-test@example.test', 'Migration', 'Test', 'hash', 'USER', true, NOW(), NOW())
        RETURNING id
      `);
      const company = await client.query(`
        INSERT INTO "Company" ("id", "userId", name, industry, "isTestData", "createdAt", "updatedAt")
        VALUES ('test-migration-company', $1, 'Migration Company', 'Test', true, NOW(), NOW())
        RETURNING id
      `, [user.rows[0].id]);
      await client.query(`
        INSERT INTO "ApplicationStatus" ("id", code, name, "order", "isPredefined", "createdAt", "updatedAt")
        VALUES ('test-migration-status', 'TEST_MIGRATION', 'Test migration', 9999, true, NOW(), NOW())
      `);
      const status = await client.query('SELECT id FROM "ApplicationStatus" ORDER BY "order" ASC NULLS LAST LIMIT 1');
      const statusId = status.rows[0]?.id;
      checks.push(['ApplicationStatus seedable/existant', Boolean(statusId), statusId || 'absent']);
      if (statusId) {
        const application = await client.query(`
          INSERT INTO "Application" ("id", "userId", "companyId", position, "statusId", "isTestData", archived, "createdAt", "updatedAt")
          VALUES ('test-migration-application', $1, $2, 'Migration Position', $3, true, false, NOW(), NOW())
          RETURNING id
        `, [user.rows[0].id, company.rows[0].id, statusId]);
        checks.push(['relation User/Company/Application', application.rows[0].id === 'test-migration-application', 'insert relationnel']);
      }
    } finally {
      await client.query('ROLLBACK');
    }
  });

  let failed = 0;
  for (const [name, ok, detail] of checks) {
    if (ok) console.log(`✅ ${name}: ${detail}`);
    else {
      failed += 1;
      console.log(`❌ ${name}: ${detail}`);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} vérification(s) de schéma en échec`);
  }
}

async function cleanup() {
  console.log(`🧹 Suppression base temporaire ${TEST_DATABASE}...`);
  await withClient(maintenanceUrl(), async (client) => {
    await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [TEST_DATABASE]);
    await client.query(`DROP DATABASE IF EXISTS "${TEST_DATABASE}"`);
  });
}

async function main() {
  try {
    await recreateDatabase();
    pushSchema();
    await applyDbPushAllCompatibilityFixes();
    await assertDatabaseShape();
    console.log('\n✅ Synchronisation Prisma/db push validée');
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error('❌ Tests de synchronisation DB échoués:', error.message);
  process.exit(1);
});
