/**
 * Garde-fou : un composant avec hooks importé via le baril `@/components/features`
 * depuis une page RSC doit déclarer `use client` en tête (sinon échec build Next.js).
 * (Jest : environnement jsdom par défaut du projet — `jest.setup.js` fournit `window`.)
 */
import * as fs from "fs";
import * as path from "path";

describe("GlobalSearch — limite App Router", () => {
  it("déclare use client sur la première ligne non vide", () => {
    const file = path.join(__dirname, "GlobalSearch.tsx");
    const raw = fs.readFileSync(file, "utf8");
    const firstNonEmpty =
      raw.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
    expect(firstNonEmpty.trim()).toMatch(/^['"]use client['"]\s*;?$/);
  });
});
