/**
 * Colonnes Kanban pilotage — ADHD : 1 seule carte « En cours » (WIP=1).
 * Contraste forcé : textes foncés sur pastels (mode clair) / textes clairs sur fonds sombres.
 */

export type KanbanColumnId =
  | "inbox_feedback"
  | "inbox_errors"
  | "backlog"
  | "doing"
  | "a_tester"
  | "a_valider"
  | "rework"
  | "later"
  | "done";

export type KanbanColumnDef = {
  id: KanbanColumnId;
  label: string;
  short: string;
  hint: string;
  /** Conteneur colonne */
  tone: string;
  /** Titre + hint colonne (contraste) */
  headerClass: string;
  /** Fond carte interne */
  cardClass: string;
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
    tone: "border-violet-400 bg-violet-100 dark:border-violet-500 dark:bg-violet-950",
    headerClass: "text-violet-950 dark:text-violet-100",
    cardClass:
      "border-violet-200 bg-white text-gray-900 dark:border-violet-800 dark:bg-violet-950/80 dark:text-violet-50",
    wip: null,
    collapsedByDefault: true,
    syncHint: "GET /api/v1/crashes (feedback)",
  },
  {
    id: "inbox_errors",
    label: "Inbox erreurs auto",
    short: "Erreurs",
    hint: "Crashes auto + analytics (pas feedback manuel)",
    tone: "border-rose-400 bg-rose-100 dark:border-rose-500 dark:bg-rose-950",
    headerClass: "text-rose-950 dark:text-rose-100",
    cardClass:
      "border-rose-200 bg-white text-gray-900 dark:border-rose-800 dark:bg-rose-950/80 dark:text-rose-50",
    wip: null,
    collapsedByDefault: true,
    syncHint: "crashes + user_errors",
  },
  {
    id: "backlog",
    label: "À faire",
    short: "À faire",
    hint: "Prêt mais PAS démarré — ≠ En cours",
    tone: "border-slate-400 bg-slate-200 dark:border-slate-500 dark:bg-slate-800",
    headerClass: "text-slate-950 dark:text-slate-100",
    cardClass:
      "border-slate-300 bg-white text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50",
    wip: null,
    syncHint: "TODOS.md + board open",
  },
  {
    id: "doing",
    label: "En cours",
    short: "▶ En cours",
    hint: "UNE seule tâche — focus TDAH",
    tone: "border-amber-500 bg-amber-200 dark:border-amber-400 dark:bg-amber-950",
    headerClass: "text-amber-950 dark:text-amber-50",
    cardClass:
      "border-amber-300 bg-white text-gray-900 dark:border-amber-700 dark:bg-amber-950/90 dark:text-amber-50",
    wip: 1,
    syncHint: "focusTaskId + PILOTAGE Point exact",
  },
  {
    id: "a_tester",
    label: "À tester",
    short: "Tester",
    hint: "Preuves dans TODOS_A_TESTER",
    tone: "border-sky-400 bg-sky-100 dark:border-sky-500 dark:bg-sky-950",
    headerClass: "text-sky-950 dark:text-sky-100",
    cardClass:
      "border-sky-200 bg-white text-gray-900 dark:border-sky-800 dark:bg-sky-950/80 dark:text-sky-50",
    wip: null,
    syncHint: "TODOS_A_TESTER.md",
  },
  {
    id: "a_valider",
    label: "À valider",
    short: "Valider",
    hint: "Gate porteur — OK/KO UI",
    tone: "border-indigo-400 bg-indigo-100 dark:border-indigo-500 dark:bg-indigo-950",
    headerClass: "text-indigo-950 dark:text-indigo-100",
    cardClass:
      "border-indigo-200 bg-white text-gray-900 dark:border-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-50",
    wip: null,
    syncHint: "TODOS_A_VALIDER.md",
  },
  {
    id: "rework",
    label: "À reprendre",
    short: "Rework",
    hint: "KO / REWORK / correctif",
    tone: "border-red-400 bg-red-100 dark:border-red-500 dark:bg-red-950",
    headerClass: "text-red-950 dark:text-red-100",
    cardClass:
      "border-red-200 bg-white text-gray-900 dark:border-red-800 dark:bg-red-950/80 dark:text-red-50",
    wip: null,
    syncHint: "board rework + A_VALIDER",
  },
  {
    id: "later",
    label: "Plus tard",
    short: "Plus tard",
    hint: "Reporté — hors focus",
    tone: "border-zinc-400 bg-zinc-200 dark:border-zinc-500 dark:bg-zinc-800",
    headerClass: "text-zinc-950 dark:text-zinc-100",
    cardClass:
      "border-zinc-300 bg-white text-gray-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50",
    wip: null,
    collapsedByDefault: true,
    syncHint: "PLUS_TARD / deferred",
  },
  {
    id: "done",
    label: "Terminées",
    short: "OK",
    hint: "OK concluants — TODOS_DONE",
    tone: "border-emerald-400 bg-emerald-100 dark:border-emerald-500 dark:bg-emerald-950",
    headerClass: "text-emerald-950 dark:text-emerald-100",
    cardClass:
      "border-emerald-200 bg-white text-gray-900 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-50",
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
