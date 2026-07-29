"use client";

import type {
  CycleView,
  DecisionStamp,
  ValidationTask,
} from "@/lib/pilotage/validationBoardTypes";

export function taskStatusClass(status: ValidationTask["status"]): string {
  switch (status) {
    case "ok":
      return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200";
    case "ko":
    case "rework":
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
    case "partial":
      return "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100";
    case "deferred":
      return "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
    case "open":
      return "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

export function taskStatusLabel(status: ValidationTask["status"]): string {
  switch (status) {
    case "ok":
      return "OK";
    case "ko":
      return "KO";
    case "partial":
      return "Partiel";
    case "deferred":
      return "Plus tard";
    case "rework":
      return "À reprendre";
    case "open":
      return "Ouvert";
    default:
      return status;
  }
}

/**
 * Badge carte Kanban : priorise la **colonne** (sinon confusion « À faire » dans À faire,
 * ou « À reprendre » alors que la carte est En cours).
 */
export function kanbanCardBadge(
  column: string | undefined,
  status: ValidationTask["status"],
): { label: string; className: string } | null {
  switch (column) {
    case "doing":
      return {
        label: "En cours",
        className:
          "bg-amber-600 text-white dark:bg-amber-500 dark:text-amber-950",
      };
    case "backlog":
      // Pas de badge « À faire » redondant dans la colonne À faire
      return null;
    case "rework":
      return {
        label: "À reprendre",
        className: taskStatusClass("rework"),
      };
    case "a_tester":
      return {
        label: "À tester",
        className: taskStatusClass("partial"),
      };
    case "a_valider":
      return {
        label: status === "partial" ? "Partiel" : "À valider",
        className: taskStatusClass(
          status === "partial" ? "partial" : "open",
        ),
      };
    case "later":
      return {
        label: "Plus tard",
        className: taskStatusClass("deferred"),
      };
    case "done":
      return { label: "OK", className: taskStatusClass("ok") };
    case "inbox_feedback":
    case "inbox_errors":
      return null;
    default:
      // Hors colonne connue : retomber sur le statut métier
      if (status === "open") return null;
      return {
        label: taskStatusLabel(status),
        className: taskStatusClass(status),
      };
  }
}

export function cycleStatusClass(status: CycleView["status"]): string {
  switch (status) {
    case "ok":
      return "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30";
    case "rework":
      return "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30";
    case "partial":
      return "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30";
    case "deferred":
      return "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40";
    default:
      return "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900";
  }
}

export type BoardActionPayload = {
  type:
    | "decide"
    | "checklist"
    | "reorder"
    | "move"
    | "note"
    | "setColumn"
    | "focus"
    | "promoteInbox";
  itemId: string;
  decision?: DecisionStamp;
  note?: string;
  checklistItemId?: string;
  done?: boolean;
  direction?: "up" | "down";
  cycleId?: string | null;
  column?: import("@/lib/pilotage/validationBoardTypes").KanbanColumnId;
  /** Promo inbox → carte board */
  label?: string;
  description?: string;
  inboxKind?: "feedback" | "error";
  sourceRef?: string;
};
