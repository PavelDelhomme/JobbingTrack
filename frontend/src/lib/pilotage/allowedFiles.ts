/**
 * Fichiers exposables via l’API backoffice (whitelist stricte).
 * Auth ADMIN+ obligatoire — jamais servi en static public.
 */

export type PilotageFileId =
  | "PILOTAGE"
  | "TODOS"
  | "TODOS_A_TESTER"
  | "TODOS_A_VALIDER"
  | "TODOS_A_VERIFIER"
  | "TODOS_DONE"
  | "GUIDE_VALIDATION_PORTEUR"
  | "SUIVI_ACTIF"
  | "VALIDATION_BOARD"
  | "STATUS"
  | "PLAN"
  | "BACKLOG"
  | "ERRORS"
  | "RESOLUTIONS";

export type PilotageFileMeta = {
  id: PilotageFileId;
  /**
   * Chemin relatif depuis la sandbox :
   * - docsRoot "pilotage" → docs/pilotage/<relativePath>
   * - docsRoot "docs" → docs/<relativePath>
   */
  relativePath: string;
  docsRoot: "pilotage" | "docs";
  label: string;
  description: string;
  writable: boolean;
  contentType: "markdown" | "json";
  /** Ne jamais exposer hors API auth (pas de copie public/). */
  sensitive?: boolean;
};

export const PILOTAGE_FILES: PilotageFileMeta[] = [
  {
    id: "PILOTAGE",
    relativePath: "PILOTAGE.md",
    docsRoot: "pilotage",
    label: "PILOTAGE.md",
    description: "Où on en est + process Kanban",
    writable: true,
    contentType: "markdown",
  },
  {
    id: "TODOS",
    relativePath: "TODOS.md",
    docsRoot: "pilotage",
    label: "TODOS.md",
    description: "Source de vérité — à faire",
    writable: true,
    contentType: "markdown",
  },
  {
    id: "TODOS_A_TESTER",
    relativePath: "TODOS_A_TESTER.md",
    docsRoot: "pilotage",
    label: "TODOS_A_TESTER.md",
    description: "Tests & résultats",
    writable: true,
    contentType: "markdown",
  },
  {
    id: "TODOS_A_VALIDER",
    relativePath: "TODOS_A_VALIDER.md",
    docsRoot: "pilotage",
    label: "TODOS_A_VALIDER.md",
    description: "Validations porteur (phase active)",
    writable: true,
    contentType: "markdown",
  },
  {
    id: "TODOS_A_VERIFIER",
    relativePath: "TODOS_A_VERIFIER.md",
    docsRoot: "pilotage",
    label: "TODOS_A_VERIFIER.md",
    description: "Stub → A_TESTER (lecture seule)",
    writable: false,
    contentType: "markdown",
  },
  {
    id: "TODOS_DONE",
    relativePath: "TODOS_DONE.md",
    docsRoot: "pilotage",
    label: "TODOS_DONE.md",
    description: "Archivage OK",
    writable: true,
    contentType: "markdown",
  },
  {
    id: "GUIDE_VALIDATION_PORTEUR",
    relativePath: "GUIDE_VALIDATION_PORTEUR.md",
    docsRoot: "pilotage",
    label: "GUIDE_VALIDATION_PORTEUR.md",
    description: "Checklist Samsung courte",
    writable: true,
    contentType: "markdown",
  },
  {
    id: "SUIVI_ACTIF",
    relativePath: "suivi-actif.json",
    docsRoot: "pilotage",
    label: "suivi-actif.json",
    description: "État compact UI (snapshot)",
    writable: true,
    contentType: "json",
  },
  {
    id: "VALIDATION_BOARD",
    relativePath: "validation-board.json",
    docsRoot: "pilotage",
    label: "validation-board.json",
    description: "Kanban / focus / checklists — ADMIN only, jamais public",
    writable: true,
    contentType: "json",
    sensitive: true,
  },
  {
    id: "STATUS",
    relativePath: "STATUS.md",
    docsRoot: "docs",
    label: "STATUS.md",
    description: "État projet global",
    writable: true,
    contentType: "markdown",
  },
  {
    id: "PLAN",
    relativePath: "project/PLAN.md",
    docsRoot: "docs",
    label: "PLAN.md",
    description: "Plan lots / vision",
    writable: true,
    contentType: "markdown",
  },
  {
    id: "BACKLOG",
    relativePath: "project/BACKLOG.md",
    docsRoot: "docs",
    label: "BACKLOG.md",
    description: "Backlog large",
    writable: true,
    contentType: "markdown",
  },
  {
    id: "ERRORS",
    relativePath: "troubleshooting/ERRORS.md",
    docsRoot: "docs",
    label: "ERRORS.md",
    description: "Erreurs connues / pièges",
    writable: true,
    contentType: "markdown",
  },
  {
    id: "RESOLUTIONS",
    relativePath: "project/RESOLUTIONS.md",
    docsRoot: "docs",
    label: "RESOLUTIONS.md",
    description: "Décisions closes",
    writable: true,
    contentType: "markdown",
  },
];

export function getPilotageFileMeta(id: string): PilotageFileMeta | null {
  return PILOTAGE_FILES.find((f) => f.id === id) ?? null;
}

/** Chemin d’affichage relatif repo (safe client + server). */
export function displayDocsPath(meta: PilotageFileMeta): string {
  if (meta.docsRoot === "docs") return `docs/${meta.relativePath}`;
  return `docs/pilotage/${meta.relativePath}`;
}
