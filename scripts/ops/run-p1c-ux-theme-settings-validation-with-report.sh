#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RESULTS_ROOT="${TESTS_RESULTS_DIR:-${ROOT_DIR}/tests/results}"
OUT_DIR="${RESULTS_ROOT}/p1c-ux-theme-settings/${TIMESTAMP}"
mkdir -p "${OUT_DIR}"

cd "${ROOT_DIR}"

SUMMARY_JSON="${OUT_DIR}/summary.json"
SUMMARY_TXT="${OUT_DIR}/summary.txt"

run_step() {
  local name="$1"
  local output_file="$2"
  shift 2

  set +e
  "$@" > "${output_file}" 2>&1
  local exit_code=$?
  set -e

  printf '%s|%s|%s\n' "${name}" "${exit_code}" "${output_file}" >> "${OUT_DIR}/steps.tsv"
  return "${exit_code}"
}

touch "${OUT_DIR}/steps.tsv"

THEME_JEST_EXIT=0
POPUP_JEST_EXIT=0
LAYOUT_EXIT=0
PAGE_EXIT=0

run_step "theme_persistence_jest" "${OUT_DIR}/theme-persistence-jest.txt" \
  bash -lc \
    'cd frontend && ./node_modules/.bin/jest --runTestsByPath src/lib/hooks/__tests__/theme.test.ts src/lib/ui/preferences/__tests__/apply.test.ts --runInBand --silent' || THEME_JEST_EXIT=$?

run_step "settings_popup_jest" "${OUT_DIR}/settings-popup-jest.txt" \
  bash -lc \
    'cd frontend && ./node_modules/.bin/jest --runTestsByPath src/components/features/SettingsPopup.test.tsx --runInBand --silent' || POPUP_JEST_EXIT=$?

run_step "layout_theme_init_script" "${OUT_DIR}/layout-theme-init-script.txt" \
  python3 - "${ROOT_DIR}" <<'PY' || LAYOUT_EXIT=$?
import sys
from pathlib import Path

root = Path(sys.argv[1])
layout = (root / "frontend/src/app/layout.tsx").read_text()
theme_init = (root / "frontend/public/theme-init.js").read_text()
if 'src="/theme-init.js"' not in layout or "beforeInteractive" not in layout:
    raise SystemExit("layout.tsx doit référencer /theme-init.js avec strategy beforeInteractive")
checks = [
    'localStorage.getItem("theme")',
    'd.classList.add("dark")',
    'd.classList.remove("dark")',
]
missing = [item for item in checks if item not in theme_init]
if missing:
    raise SystemExit(f"theme-init.js incomplet: {', '.join(missing)}")
print("layout theme-init.js OK:", ", ".join(checks))
PY

run_step "backoffice_pages_smoke" "${OUT_DIR}/backoffice-pages-smoke.txt" \
  python3 - <<'PY' || PAGE_EXIT=$?
import urllib.request

for url in [
    "http://localhost:5003/login",
    "http://localhost:5003/b4ck0ff1ce",
]:
    with urllib.request.urlopen(url, timeout=20) as response:
        body = response.read(8000).decode("utf-8", errors="ignore")
        if 'src="/theme-init.js"' not in body and "theme-init.js" not in body:
            raise RuntimeError(f"Script init thème absent dans {url}")
        print(url, response.status, "theme-init-script=present")
PY

node - "${OUT_DIR}" "${SUMMARY_JSON}" "${SUMMARY_TXT}" <<'NODE'
const fs = require('fs');
const path = require('path');

const [, , outDir, summaryJsonPath, summaryTxtPath] = process.argv;
const steps = fs
  .readFileSync(path.join(outDir, 'steps.tsv'), 'utf8')
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [name, exitCode, outputFile] = line.split('|');
    return { name, exitCode: Number(exitCode), outputFile };
  });

const summary = {
  category: 'p1c-ux-theme-settings',
  timestamp: new Date().toISOString(),
  exitCode: steps.some((step) => step.exitCode !== 0) ? 1 : 0,
  totals: {
    steps: steps.length,
    passed: steps.filter((step) => step.exitCode === 0).length,
    failed: steps.filter((step) => step.exitCode !== 0).length,
  },
  validations: {
    darkModePersistence: 'setStoredTheme synchronise theme + ui-preferences-v1 + customization-settings',
    settingsPopupClose: 'Escape, backdrop mousedown et bouton fermer appellent onClose ; clic dialogue stoppé',
  },
  steps,
};

fs.writeFileSync(summaryJsonPath, JSON.stringify(summary, null, 2));
fs.writeFileSync(
  summaryTxtPath,
  [
    'JobbingTrack — validation P1C mode sombre + popup paramètres',
    `timestamp: ${summary.timestamp}`,
    `exit: ${summary.exitCode}`,
    `steps: ${summary.totals.steps} | passed: ${summary.totals.passed} | failed: ${summary.totals.failed}`,
  ].join('\n') + '\n',
);
NODE

EXIT_CODE=0
if [[ "${THEME_JEST_EXIT}" -ne 0 || "${POPUP_JEST_EXIT}" -ne 0 || "${LAYOUT_EXIT}" -ne 0 || "${PAGE_EXIT}" -ne 0 ]]; then
  EXIT_CODE=1
fi

echo "Rapport p1c-ux-theme-settings : ${OUT_DIR}"
exit "${EXIT_CODE}"
