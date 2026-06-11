#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RESULTS_ROOT="${TESTS_RESULTS_DIR:-${ROOT_DIR}/tests/results}"
OUT_DIR="${RESULTS_ROOT}/controlled-offensive/${TIMESTAMP}"
mkdir -p "${OUT_DIR}"

cd "${ROOT_DIR}"

JEST_BIN="${ROOT_DIR}/tests/node_modules/jest/bin/jest.js"
if [[ ! -f "${JEST_BIN}" ]]; then
  echo "Jest introuvable: ${JEST_BIN} (installer les deps dans tests/)" >&2
  exit 1
fi

TARGET="${SECURITY_TEST_TARGET:-http://localhost:5002}"
ENVIRONMENT="${SECURITY_TEST_ENV:-local}"

JEST_JSON="${OUT_DIR}/jest-results.json"
SCOPE_JSON="${OUT_DIR}/lab-scope.json"
SUMMARY_JSON="${OUT_DIR}/summary.json"
SUMMARY_TXT="${OUT_DIR}/summary.txt"

set +e
/usr/bin/node "${JEST_BIN}" \
  --config tests/jest.config.js \
  tests/security/controlled-offensive-preflight.test.js \
  tests/security/controlled-offensive-lab-scope.test.js \
  --runInBand \
  --json \
  --outputFile="${JEST_JSON}" \
  > "${OUT_DIR}/jest-stdout.txt" 2> "${OUT_DIR}/jest-stderr.txt"
JEST_EXIT=$?

/usr/bin/node scripts/security/controlled-offensive-lab-scope.cjs \
  --target="${TARGET}" \
  --environment="${ENVIRONMENT}" \
  --json > "${SCOPE_JSON}" 2> "${OUT_DIR}/scope-stderr.txt"
SCOPE_EXIT=$?
set -e

node - "${JEST_EXIT}" "${SCOPE_EXIT}" "${JEST_JSON}" "${SCOPE_JSON}" "${SUMMARY_JSON}" "${SUMMARY_TXT}" "${TARGET}" "${ENVIRONMENT}" <<'NODE'
const fs = require('fs');
const [, , jestExit, scopeExit, jestPath, scopePath, summaryJsonPath, summaryTxtPath, target, environment] =
  process.argv;

let jest = { numTotalTests: 0, numPassedTests: 0, numFailedTests: 0, numPendingTests: 0, success: false };
if (fs.existsSync(jestPath)) {
  jest = JSON.parse(fs.readFileSync(jestPath, 'utf8'));
}

let scope = { status: 'unknown', checkCount: 0, preflightStatus: 'unknown' };
if (fs.existsSync(scopePath)) {
  scope = JSON.parse(fs.readFileSync(scopePath, 'utf8'));
}

const exitCode = Number(jestExit) !== 0 || Number(scopeExit) !== 0 ? 1 : 0;

const summary = {
  category: 'controlled-offensive',
  timestamp: new Date().toISOString(),
  exitCode,
  target,
  environment,
  labScope: {
    status: scope.status,
    preflightStatus: scope.preflightStatus,
    checkCount: scope.checkCount || 0,
    dryRun: scope.dryRun !== false,
    willRunPayload: false,
  },
  totals: {
    tests: jest.numTotalTests || 0,
    passed: jest.numPassedTests || 0,
    failed: jest.numFailedTests || 0,
    skipped: jest.numPendingTests || 0,
  },
  suites: [
    'tests/security/controlled-offensive-preflight.test.js',
    'tests/security/controlled-offensive-lab-scope.test.js',
  ],
};

fs.writeFileSync(summaryJsonPath, JSON.stringify(summary, null, 2));
fs.writeFileSync(
  summaryTxtPath,
  [
    'JobbingTrack — rapport tests offensifs contrôlés (plan-only)',
    `timestamp: ${summary.timestamp}`,
    `exit: ${summary.exitCode}`,
    `target: ${target}`,
    `environment: ${environment}`,
    `lab scope: ${summary.labScope.status} (preflight ${summary.labScope.preflightStatus}, ${summary.labScope.checkCount} checks)`,
    `tests: ${summary.totals.tests} | passed: ${summary.totals.passed} | failed: ${summary.totals.failed} | skipped: ${summary.totals.skipped}`,
    'mode: dryRun=true, willRunPayload=false',
  ].join('\n') + '\n',
);
NODE

EXIT_CODE=0
if [[ "${JEST_EXIT}" -ne 0 || "${SCOPE_EXIT}" -ne 0 ]]; then
  EXIT_CODE=1
fi

echo "Rapport controlled-offensive : ${OUT_DIR}"
exit "${EXIT_CODE}"
