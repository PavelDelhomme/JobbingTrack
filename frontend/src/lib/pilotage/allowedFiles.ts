/**
 * Fichiers pilotage exposables via l’API backoffice (whitelist stricte).
 * Aucun autre chemin sous docs/ n’est accessible par ces routes.
 */

export type PilotageFileId =
  | "PILOTAGE"
  | "TODOS"
  | "TODOS_A_TESTER"
  | "TODOS_A_VALIDER"
  | "TODOS_A_VERIFIER"
  | "TODOS_DONE"
  | "GUIDE_VALIDATION_PORTEUR"
  | "SUIVI_ACTIF";

export type PilotageFileMeta = {
  id: PilotageFileId;
  /** Chemin relatif depuis docs/pilotage/ */
  relativePath: string;
  label: string;
  description: string;
  /** Édition autorisée (sinon lecture seule). */
  writable: boolean;
  contentType: "markdown" | "json";
};

export const PILOTAGE_FILES: PilotageFileMeta[] = [
  {
    id: "PILOTAGE",
    relativePath: "PILOTAGE.md",
    label: "PILOTAGE.md",
    description: "Où on en est + process",
    writable: true,
    contentType: "markdown",
  },
  {
    id: "TODOS",
    relativePath: "TODOS.md",
    label: "TODOS.md",
    description: "Source de vérité — à faire",
    writable: true,
    contentType: "markdown",
  },
  {
    id: "TODOS_A_TESTER",
    relativePath: "TODOS_A_TESTER.md",
    label: "TODOS_A_TESTER.md",
    description: "Tests & résultats",
    writable: true,
    contentType: "markdown",
  },
  {
    id: "TODOS_A_VALIDER",
    relativePath: "TODOS_A_VALIDER.md",
    label: "TODOS_A_VALIDER.md",
    description: "Validations porteur (phase active)",
    writable: true,
    contentType: "markdown",
  },
  {
    id: "TODOS_A_VERIFIER",
    relativePath: "TODOS_A_VERIFIER.md",
    label: "TODOS_A_VERIFIER.md",
    description: "Stub → A_TESTER (lecture seule)",
    writable: false,
    contentType: "markdown",
  },
  {
    id: "TODOS_DONE",
    relativePath: "TODOS_DONE.md",
    label: "TODOS_DONE.md",
    description: "Archivage OK",
    writable: true,
    contentType: "markdown",
  },
  {
    id: "GUIDE_VALIDATION_PORTEUR",
    relativePath: "GUIDE_VALIDATION_PORTEUR.md",
    label: "GUIDE_VALIDATION_PORTEUR.md",
    description: "Checklist Samsung courte",
    writable: true,
    contentType: "markdown",
  },
  {
    id: "SUIVI_ACTIF",
    relativePath: "suivi-actif.json",
    label: "suivi-actif.json",
    description: "État compact pour l’UI",
    writable: true,
    contentType: "json",
  },
];

export function getPilotageFileMeta(id: string): PilotageFileMeta | null {
  return PILOTAGE_FILES.find((f) => f.id === id) ?? null;
}
