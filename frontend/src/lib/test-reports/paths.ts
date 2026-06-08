import { join } from "path";

export const IS_DOCKER =
  process.cwd() === "/app" || process.env.DOCKER === "true";

/** Racine projet (contenant tests/, reports/, scripts/). */
export function getProjectRoot(): string {
  const envRoot = process.env.PROJECT_ROOT?.trim();
  if (envRoot) return envRoot;
  if (IS_DOCKER) return "/app";
  return process.cwd().includes("frontend")
    ? join(process.cwd(), "..")
    : process.cwd();
}

/**
 * Répertoire writable des rapports de tests.
 * En Docker : /tmp/tests/results (volume monté) car ./tests est :ro sur /app/tests.
 */
export function getTestsResultsDir(): string {
  const configured = process.env.TESTS_RESULTS_DIR?.trim();
  if (configured) return configured;
  if (IS_DOCKER) return "/tmp/tests/results";
  return join(getProjectRoot(), "tests", "results");
}

export function getSecurityResultsDir(): string {
  return join(getTestsResultsDir(), "security");
}

export function getSecurityReportsDir(): string {
  return join(getProjectRoot(), "reports", "security");
}
