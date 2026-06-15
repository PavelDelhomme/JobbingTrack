import fs from "fs";
import path from "path";

/**
 * Force profils temporaires et binaires Playwright hors de /tmp (saturé sur certaines machines).
 * Sans cela, Chromium peut crasher avec SIGTRAP lors de l'écriture des profils navigateur.
 */
export function applyPlaywrightRuntimeEnv(frontendRoot: string): {
  tmpDir: string;
  browsersPath: string;
} {
  const tmpDir =
    process.env.PLAYWRIGHT_TMPDIR || path.join(frontendRoot, ".tmp-playwright");
  fs.mkdirSync(tmpDir, { recursive: true });
  if (!process.env.TMPDIR) {
    process.env.TMPDIR = tmpDir;
  }

  const browsersPath =
    process.env.PLAYWRIGHT_BROWSERS_PATH ||
    path.join(frontendRoot, ".cache-playwright");
  fs.mkdirSync(browsersPath, { recursive: true });
  process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;

  return { tmpDir, browsersPath };
}
