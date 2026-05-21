import { existsSync, readFileSync } from "fs";
import path from "path";

/** Doit rester aligné sur `config/dev-test-bypass-format.cjs` (gateway + scripts). */
const DEV_TEST_BYPASS_RE = /^jtbypass1-[A-Za-z0-9_-]{32,192}$/;

function parseEnvKey(content: string, key: string): string | null {
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    if (k !== key) continue;
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    return v || null;
  }
  return null;
}

function readKeyFromFile(filePath: string, key: string): string | null {
  if (!existsSync(filePath)) return null;
  try {
    return parseEnvKey(readFileSync(filePath, "utf8"), key);
  } catch {
    return null;
  }
}

function isValidBypassTokenShape(value: string): boolean {
  return DEV_TEST_BYPASS_RE.test(value.trim());
}

/**
 * Jeton aligné sur la gateway : préfixe `jtbypass1-` + suffixe aléatoire (voir
 * `config/dev-test-bypass-format.cjs`). En-tête `X-JobbingTrack-Dev-Test-Token`.
 */
export function resolveDevTestBypassToken(): string | null {
  const fromProc =
    process.env.DEV_TEST_BYPASS_TOKEN ||
    process.env.JOBBINGTRACK_DEV_TEST_BYPASS_TOKEN;
  if (typeof fromProc === "string" && isValidBypassTokenShape(fromProc))
    return fromProc.trim();

  const repoRoot = path.join(__dirname, "../../..");
  const frontendEnv = path.join(__dirname, "../../.env");
  const keys = [
    "DEV_TEST_BYPASS_TOKEN",
    "JOBBINGTRACK_DEV_TEST_BYPASS_TOKEN",
  ] as const;

  for (const key of keys) {
    const fromRoot = readKeyFromFile(path.join(repoRoot, ".env"), key);
    if (fromRoot && isValidBypassTokenShape(fromRoot)) return fromRoot.trim();
    const fromFe = readKeyFromFile(frontendEnv, key);
    if (fromFe && isValidBypassTokenShape(fromFe)) return fromFe.trim();
  }
  return null;
}

export function devBypassExtraHeaders(): Record<string, string> {
  const t = resolveDevTestBypassToken();
  if (!t) return {};
  return { "X-JobbingTrack-Dev-Test-Token": t };
}
