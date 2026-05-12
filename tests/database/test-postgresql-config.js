/**
 * Test de configuration PostgreSQL.
 *
 * Le dépôt utilise deux formes valides :
 * - docker-compose.yml racine : variables .env obligatoires (${POSTGRES_USER}, etc.)
 * - compose backend historiques : valeurs dev explicites jobbingtrack/jobbingtrack123
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const EXPECTED = {
  user: 'jobbingtrack',
  password: 'jobbingtrack123',
  database: 'jobbingtrack'
};

let failed = 0;

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function pass(message) {
  console.log(`✅ ${message}`);
}

function fail(message) {
  failed += 1;
  console.log(`❌ ${message}`);
}

function assertIncludes(content, patterns, label) {
  const ok = patterns.some((pattern) => (
    pattern instanceof RegExp ? pattern.test(content) : content.includes(pattern)
  ));
  if (ok) pass(label);
  else fail(label);
}

function walkFiles(dir, predicate, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.next', '.next-local', 'dist'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(fullPath, predicate, acc);
    else if (predicate(fullPath)) acc.push(fullPath);
  }
  return acc;
}

async function main() {
  console.log('🗄️ Test de la configuration PostgreSQL...\n');
  console.log(`📋 Valeurs dev attendues: ${EXPECTED.user}/${EXPECTED.database}`);

  const rootCompose = read('docker-compose.yml');
  assertIncludes(rootCompose, ['POSTGRES_USER: ${POSTGRES_USER}', 'POSTGRES_USER: ${POSTGRES_USER:-jobbingtrack}'], 'docker-compose.yml expose POSTGRES_USER via env');
  assertIncludes(rootCompose, ['POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}', 'POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-jobbingtrack123}'], 'docker-compose.yml expose POSTGRES_PASSWORD via env');
  assertIncludes(rootCompose, ['POSTGRES_DB: ${POSTGRES_DB}', 'POSTGRES_DB: ${POSTGRES_DB:-jobbingtrack}'], 'docker-compose.yml expose POSTGRES_DB via env');
  assertIncludes(rootCompose, [/postgresql:\/\/\$\{POSTGRES_USER(?::-jobbingtrack)?\}:\$\{POSTGRES_PASSWORD(?::-jobbingtrack123)?\}@postgres:5432\/\$\{POSTGRES_DB(?::-jobbingtrack)?\}/], 'docker-compose.yml construit DATABASE_URL depuis POSTGRES_*');

  for (const composePath of ['backend/docker-compose.yml', 'backend/docker-compose.prod.yml']) {
    if (!fs.existsSync(path.join(ROOT, composePath))) continue;
    const content = read(composePath);
    assertIncludes(content, [
      `POSTGRES_USER: ${EXPECTED.user}`,
      `POSTGRES_USER: \${POSTGRES_USER:-${EXPECTED.user}}`
    ], `${composePath} configure POSTGRES_USER`);
    assertIncludes(content, [
      `POSTGRES_DB: ${EXPECTED.database}`,
      `POSTGRES_DB: \${POSTGRES_DB:-${EXPECTED.database}}`
    ], `${composePath} configure POSTGRES_DB`);
    assertIncludes(content, [
      `POSTGRES_PASSWORD: ${EXPECTED.password}`,
      `POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-${EXPECTED.password}}`
    ], `${composePath} configure POSTGRES_PASSWORD`);
    assertIncludes(content, [
      `postgresql://${EXPECTED.user}:${EXPECTED.password}@postgres:5432/${EXPECTED.database}`,
      `postgresql://\${POSTGRES_USER:-${EXPECTED.user}}:\${POSTGRES_PASSWORD:-${EXPECTED.password}}@postgres:5432/\${POSTGRES_DB:-${EXPECTED.database}}`
    ], `${composePath} configure DATABASE_URL`);
  }

  const prismaSchemas = walkFiles(path.join(ROOT, 'backend'), (file) => file.endsWith(path.join('prisma', 'schema.prisma')));
  for (const schemaPath of prismaSchemas) {
    const content = fs.readFileSync(schemaPath, 'utf8');
    if (content.includes('url      = env("DATABASE_URL")') || content.includes('url = env("DATABASE_URL")')) {
      pass(`${path.relative(ROOT, schemaPath)} utilise DATABASE_URL`);
    } else {
      fail(`${path.relative(ROOT, schemaPath)} n'utilise pas DATABASE_URL`);
    }
  }

  for (const filePath of ['docker-compose.yml', 'backend/docker-compose.yml', 'backend/docker-compose.prod.yml']) {
    if (!fs.existsSync(path.join(ROOT, filePath))) continue;
    const content = read(filePath);
    if (content.includes('admin:admin123') || content.includes('admin/admin123')) {
      fail(`${filePath} contient encore admin/admin123`);
    } else {
      pass(`${filePath} ne contient pas les anciens identifiants admin/admin123`);
    }
  }

  const docsToCheck = [
    'docs/database/MIGRATIONS_ET_BASES.md',
    'docs/TODOS.md',
    'docs/STATUS.md'
  ];
  for (const docPath of docsToCheck) {
    const fullPath = path.join(ROOT, docPath);
    if (!fs.existsSync(fullPath)) {
      fail(`${docPath} introuvable`);
      continue;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('db-push-all') || content.includes('DATABASE_URL')) {
      pass(`${docPath} documente la BDD`);
    } else {
      fail(`${docPath} ne documente pas la BDD`);
    }
  }

  if (failed > 0) {
    console.log(`\n❌ Configuration PostgreSQL incomplète: ${failed} échec(s)`);
    process.exit(1);
  }

  console.log('\n✅ Configuration PostgreSQL cohérente');
}

main().catch((error) => {
  console.error('❌ Erreur lors des tests:', error);
  process.exit(1);
});
