import fs from "fs";
import path from "path";
import {
  getPilotageFileMeta,
  type PilotageFileMeta,
} from "@/lib/pilotage/allowedFiles";

/** Racines possibles (dev host, conteneur frontend, workspace monté). */
export function resolveProjectRoot(): string {
  const candidates = [
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd()),
    "/workspace",
    path.resolve(process.cwd(), "../.."),
  ];
  for (const root of candidates) {
    const probe = path.join(root, "docs", "pilotage", "TODOS.md");
    if (fs.existsSync(probe)) return root;
  }
  return path.resolve(process.cwd(), "..");
}

export function resolvePilotageAbsolutePath(
  meta: PilotageFileMeta,
): { ok: true; absPath: string; root: string } | { ok: false; error: string } {
  const root = resolveProjectRoot();
  const pilotageDir = path.resolve(root, "docs", "pilotage");
  const absPath = path.resolve(pilotageDir, meta.relativePath);
  if (!absPath.startsWith(pilotageDir + path.sep) && absPath !== pilotageDir) {
    return { ok: false, error: "Chemin hors sandbox pilotage" };
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
