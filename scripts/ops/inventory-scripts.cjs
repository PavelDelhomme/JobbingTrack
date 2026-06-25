#!/usr/bin/env node
/**
 * Inventorie les scripts et signale ceux qui semblent peu référencés.
 *
 * Le but est informatif : aucune suppression ni modification de fichier.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');
const SKIP_DIRS = new Set([
  '.git',
  '.next',
  '.next-local',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'reports',
  'test-results',
  'tests-results'
]);
const TEXT_EXTENSIONS = new Set([
  '.cjs',
  '.conf',
  '.env',
  '.example',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.py',
  '.sh',
  '.ts',
  '.tsx',
  '.txt',
  '.yml',
  '.yaml',
  ''
]);
const ROOT_SCRIPT_TARGETS = [
  { pattern: /playwright|test|verify-user-journey|test-api|test-enums|test-relations|start-tests/, target: 'scripts/testing/' },
  { pattern: /report|benchmark|performance/, target: 'scripts/reports/ ou scripts/monitoring/' },
  { pattern: /docker|compose/, target: 'scripts/docker/' },
  { pattern: /env/, target: 'scripts/env/' },
  { pattern: /logs|color-logs|status-watch/, target: 'scripts/ops/' },
  { pattern: /prisma|schema|table|migration|seed|backup/, target: 'scripts/db/ ou scripts/database/' },
  { pattern: /setup|install/, target: 'scripts/setup/' },
  { pattern: /security|firewall|waf|jwt|cve|secrets|ports/, target: 'scripts/security/' }
];

function walk(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      continue;
    }
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(fullPath, predicate, out);
    } else if (!predicate || predicate(fullPath)) {
      out.push(fullPath);
    }
  }
  return out;
}

function isScript(filePath) {
  const ext = path.extname(filePath);
  return ['.cjs', '.js', '.mjs', '.py', '.sh'].includes(ext);
}

function isTextFile(filePath) {
  const ext = path.extname(filePath);
  if (!TEXT_EXTENSIONS.has(ext)) return false;
  const rel = path.relative(ROOT, filePath);
  return !rel.startsWith('reports/') && !rel.startsWith('test-results/');
}

function inferCategory(relPath) {
  const parts = relPath.split(path.sep);
  if (parts.length > 2) return parts[1];
  if (relPath.includes('env')) return 'env';
  if (relPath.includes('test') || relPath.includes('playwright')) return 'tests';
  if (relPath.includes('report')) return 'reports';
  return 'racine';
}

function suggestedTarget(relPath) {
  if (inferCategory(relPath) !== 'racine') return '';
  const baseName = path.basename(relPath);
  const match = ROOT_SCRIPT_TARGETS.find(({ pattern }) => pattern.test(baseName));
  return match ? match.target : 'à classer';
}

function readUsedByMarkers(relPath) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) return [];
  const head = fs.readFileSync(fullPath, 'utf8').slice(0, 2500);
  const match = head.match(/@used-by\s+([^\n*]+)/i);
  if (!match) return [];
  return match[1]
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function statusFor(relPath, references) {
  if (relPath.includes('/legacy/')) return 'legacy';
  if (references.some((ref) => ref.startsWith('makefiles/') || ref.startsWith('.github/workflows/'))) {
    return 'actif';
  }
  if (references.some((ref) => ref.startsWith('docs/') || ref === 'scripts/README.md' || ref === 'TODOS.md')) {
    return 'manuel/documente';
  }
  return references.length > 0 ? 'manuel' : 'non-reference';
}

function main() {
  const scripts = walk(SCRIPTS_DIR, isScript).map((filePath) => path.relative(ROOT, filePath)).sort();
  const textFiles = walk(ROOT, isTextFile);
  const contents = textFiles
    .filter((filePath) => !path.relative(ROOT, filePath).startsWith('scripts/ops/inventory-scripts.cjs'))
    .map((filePath) => ({
      rel: path.relative(ROOT, filePath),
      content: fs.readFileSync(filePath, 'utf8')
    }));

  const rows = scripts.map((rel) => {
    const baseName = path.basename(rel);
    const usedBy = readUsedByMarkers(rel);
    const refs = contents
      .filter(({ rel: candidate, content }) => candidate !== rel && (content.includes(rel) || content.includes(baseName)))
      .map(({ rel: candidate }) => candidate)
      .concat(usedBy.length ? ['@used-by'] : [])
      .sort();
    return {
      script: rel,
      category: inferCategory(rel),
      status: statusFor(rel, refs),
      suggestedTarget: suggestedTarget(rel),
      references: refs
    };
  });

  const byStatus = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  const rootRows = rows.filter((row) => row.category === 'racine');
  const rootByTarget = rootRows.reduce((acc, row) => {
    const target = row.suggestedTarget || 'déjà classé';
    acc[target] = (acc[target] || 0) + 1;
    return acc;
  }, {});
  const weakRefs = rows.filter((row) => row.status === 'non-reference').slice(0, 40);

  console.log('══════════════════════════════════════════════════════════');
  console.log('  Inventaire scripts/');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Scripts : ${rows.length}`);
  for (const [status, count] of Object.entries(byStatus).sort()) {
    console.log(`  ${status.padEnd(18)} ${count}`);
  }
  console.log(`  racine             ${rootRows.length}`);
  console.log('');

  if (rootRows.length) {
    console.log('  Scripts encore à la racine (déplacer par lots avec wrapper si nécessaire) :');
    for (const [target, count] of Object.entries(rootByTarget).sort()) {
      console.log(`    - ${target.padEnd(38)} ${count}`);
    }
    console.log('');
  }

  if (weakRefs.length) {
    console.log('  Scripts sans référence détectée (à auditer avant suppression) :');
    for (const row of weakRefs) {
      console.log(`    - ${row.script}`);
    }
    if (rows.filter((row) => row.status === 'non-reference').length > weakRefs.length) {
      console.log('    ... liste tronquée');
    }
  } else {
    console.log('  Aucun script totalement non référencé détecté.');
  }
  console.log('');
  console.log('  Statuts : actif = Make/CI, manuel/documente = docs, legacy = fixes/legacy, non-reference = aucun appel trouvé.');
}

main();
