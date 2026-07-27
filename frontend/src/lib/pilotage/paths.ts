import fs from "fs";
import path from "path";
import {
  getPilotageFileMeta,
  displayDocsPath,
  type PilotageFileMeta,
} from "@/lib/pilotage/allowedFiles";

export { displayDocsPath };

/** Racines possibles (dev host, conteneur frontend, workspace monté). */
export function resolveProjectRoot(): string {
  const candidates = [
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd()),
    "/workspace",
    path.resolve(process.cwd(), "../.."),
  ];
  const withPilotage: string[] = [];
  for (const root of candidates) {
    const probe = path.join(root, "docs", "pilotage", "TODOS.md");
    if (fs.existsSync(probe)) withPilotage.push(root);
  }
  for (const root of withPilotage) {
    const dir = path.join(root, "docs", "pilotage");
    try {
      fs.accessSync(dir, fs.constants.W_OK);
      return root;
    } catch {
      /* try next */
    }
  }
  if (withPilotage.length) return withPilotage[0];
  return path.resolve(process.cwd(), "..");
}

export function resolvePilotageAbsolutePath(
  meta: PilotageFileMeta,
): { ok: true; absPath: string; root: string } | { ok: false; error: string } {
  const root = resolveProjectRoot();
  const docsDir = path.resolve(root, "docs");
  const sandbox =
    meta.docsRoot === "docs"
      ? docsDir
      : path.resolve(docsDir, "pilotage");
  const absPath = path.resolve(sandbox, meta.relativePath);
  if (!absPath.startsWith(sandbox + path.sep) && absPath !== sandbox) {
    return { ok: false, error: "Chemin hors sandbox docs" };
  }
  // Interdire toute sortie hors docs/
  if (!absPath.startsWith(docsDir + path.sep) && absPath !== docsDir) {
    return { ok: false, error: "Chemin hors docs/" };
  }
  return { ok: true, absPath, root };
}

export function resolvePilotageById(id: string) {
  const meta = getPilotageFileMeta(id);
  if (!meta) return { ok: false as const, error: "Fichier non autorisé" };
  const resolved = resolvePilotageAbsolutePath(meta);
  if (!resolved.ok) return resolved;
  return {
    ok: true as const,
    meta,
    absPath: resolved.absPath,
    root: resolved.root,
  };
}
