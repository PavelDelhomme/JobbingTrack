#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RESULTS_ROOT="${TESTS_RESULTS_DIR:-${ROOT_DIR}/tests/results}"
OUT_DIR="${RESULTS_ROOT}/email-triage/${TIMESTAMP}"
mkdir -p "${OUT_DIR}"

cd "${ROOT_DIR}"

JEST_JSON="${OUT_DIR}/jest-results.json"
SUMMARY_JSON="${OUT_DIR}/summary.json"
SUMMARY_TXT="${OUT_DIR}/summary.txt"

JEST_BIN="${ROOT_DIR}/tests/node_modules/jest/bin/jest.js"
if [[ ! -f "${JEST_BIN}" ]]; then
  echo "Jest introuvable: ${JEST_BIN} (installer les deps dans tests/)" >&2
  exit 1
fi

set +e
/usr/bin/node "${JEST_BIN}" \
  --config tests/jest.config.js \
  tests/email-triage/classification-rules.test.js \
  tests/email-triage/calendar-time-policy.test.js \
  tests/email-triage/digest-schedule-policy.test.js \
  tests/email-triage/digest-identity-policy.test.js \
  tests/email-triage/agent-access-policy.test.js \
  tests/email-triage/digest-renderer.test.js \
  tests/email-triage/mail-connection-policy.test.js \
  tests/email-triage/mail-connection.integration.test.js \
  --runInBand \
  --json \
  --outputFile="${JEST_JSON}" \
  > "${OUT_DIR}/jest-stdout.txt" 2> "${OUT_DIR}/jest-stderr.txt"
JEST_EXIT=$?
set -e

node - "${JEST_EXIT}" "${JEST_JSON}" "${SUMMARY_JSON}" "${SUMMARY_TXT}" <<'NODE'
const fs = require('fs');
const [, , exitCode, jestPath, summaryJsonPath, summaryTxtPath] = process.argv;

let jest = { numTotalTests: 0, numPassedTests: 0, numFailedTests: 0, numPendingTests: 0, success: false };
if (fs.existsSync(jestPath)) {
  jest = JSON.parse(fs.readFileSync(jestPath, 'utf8'));
}

const summary = {
  category: 'email-triage',
  timestamp: new Date().toISOString(),
  exitCode: Number(exitCode),
  totals: {
    tests: jest.numTotalTests || 0,
    passed: jest.numPassedTests || 0,
    failed: jest.numFailedTests || 0,
    skipped: jest.numPendingTests || 0,
  },
  suites: [
    'tests/email-triage/classification-rules.test.js',
    'tests/email-triage/calendar-time-policy.test.js',
    'tests/email-triage/digest-schedule-policy.test.js',
    'tests/email-triage/digest-identity-policy.test.js',
    'tests/email-triage/agent-access-policy.test.js',
    'tests/email-triage/digest-renderer.test.js',
    'tests/email-triage/mail-connection-policy.test.js',
    'tests/email-triage/mail-connection.integration.test.js',
  ],
};

fs.writeFileSync(summaryJsonPath, JSON.stringify(summary, null, 2));
fs.writeFileSync(
  summaryTxtPath,
  [
    'JobbingTrack — rapport tests agent email',
    `timestamp: ${summary.timestamp}`,
    `exit: ${summary.exitCode}`,
    `tests: ${summary.totals.tests} | passed: ${summary.totals.passed} | failed: ${summary.totals.failed} | skipped: ${summary.totals.skipped}`,
    `scope: ${summary.suites.join(', ')}`,
  ].join('\n') + '\n'
);
NODE

echo "Rapport email-triage : ${OUT_DIR}"
exit "${JEST_EXIT}"
