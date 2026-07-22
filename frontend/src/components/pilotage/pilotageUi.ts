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
      return "À faire";
    default:
      return status;
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
  type: "decide" | "checklist" | "reorder" | "move" | "note";
  itemId: string;
  decision?: DecisionStamp;
  note?: string;
  checklistItemId?: string;
  done?: boolean;
  direction?: "up" | "down";
  cycleId?: string | null;
};
