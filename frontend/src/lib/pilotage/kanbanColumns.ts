/**
 * Colonnes Kanban pilotage — ADHD : 1 seule carte « En cours » (WIP=1).
 * Contraste via moteur UI (`semantic-kanban.css` + `jtKanban`), pas Tailwind pastel.
 */

import type { KanbanColumnId } from "@/lib/pilotage/validationBoardTypes";

export type { KanbanColumnId };

export type KanbanColumnDef = {
  id: KanbanColumnId;
  label: string;
  short: string;
  hint: string;
  /** WIP max (null = illimité). doing = 1. */
  wip: number | null;
  collapsedByDefault?: boolean;
  syncHint: string;
};

export const KANBAN_COLUMNS: KanbanColumnDef[] = [
  {
    id: "inbox_feedback",
    label: "Inbox retours",
    short: "Retours",
    hint: "Bugs / suggestions / signalements utilisateurs (app)",
    wip: null,
    collapsedByDefault: true,
    syncHint: "GET /api/v1/crashes (feedback)",
  },
  {
    id: "inbox_errors",
    label: "Inbox erreurs auto",
    short: "Erreurs",
    hint: "Crashes auto + analytics (pas feedback manuel)",
    wip: null,
    collapsedByDefault: true,
    syncHint: "crashes + user_errors",
  },
  {
    id: "backlog",
    label: "À faire",
    short: "À faire",
    hint: "Prêt mais PAS démarré — ≠ En cours",
    wip: null,
    syncHint: "TODOS.md + board open",
  },
  {
    id: "doing",
    label: "En cours",
    short: "▶ En cours",
    hint: "UNE seule tâche — focus TDAH",
    wip: 1,
    syncHint: "focusTaskId + PILOTAGE Point exact",
  },
  {
    id: "a_tester",
    label: "À tester",
    short: "Tester",
    hint: "Preuves dans TODOS_A_TESTER",
    wip: null,
    syncHint: "TODOS_A_TESTER.md",
  },
  {
    id: "a_valider",
    label: "À valider",
    short: "Valider",
    hint: "Gate porteur — OK/KO UI",
    wip: null,
    syncHint: "TODOS_A_VALIDER.md",
  },
  {
    id: "rework",
    label: "À reprendre",
    short: "Rework",
    hint: "KO / REWORK / correctif",
    wip: null,
    syncHint: "board rework + A_VALIDER",
  },
  {
    id: "later",
    label: "Plus tard",
    short: "Plus tard",
    hint: "Reporté — hors focus",
    wip: null,
    collapsedByDefault: true,
    syncHint: "PLUS_TARD / deferred",
  },
  {
    id: "done",
    label: "Terminées",
    short: "OK",
    hint: "OK concluants — TODOS_DONE",
    wip: null,
    collapsedByDefault: true,
    syncHint: "TODOS_DONE.md",
  },
];

export function getKanbanColumn(id: KanbanColumnId): KanbanColumnDef {
  return (
    KANBAN_COLUMNS.find((c) => c.id === id) ??
    KANBAN_COLUMNS.find((c) => c.id === "backlog")!
  );
}

export function columnFromStatus(
  status: string,
  opts?: { isFocus?: boolean; hasEmptyDecision?: boolean },
): KanbanColumnId {
  if (opts?.isFocus) return "doing";
  switch (status) {
    case "ok":
      return "done";
    case "ko":
    case "rework":
      return "rework";
    case "deferred":
      return "later";
    case "partial":
      return "a_tester";
    case "open":
    default:
      if (opts?.hasEmptyDecision) return "a_valider";
      return "backlog";
  }
}
