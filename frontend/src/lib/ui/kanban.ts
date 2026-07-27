/**
 * Kanban sémantique — tons + helpers (clair/sombre via semantic-kanban.css).
 * Ne pas utiliser bg-*-100 Tailwind dans .backoffice-content pour les colonnes.
 */

import type { KanbanColumnId } from "@/lib/pilotage/validationBoardTypes";

export type KanbanSurfaceTone = KanbanColumnId;

export const jtKanban = {
  col: "jt-kanban-col",
  header: "jt-kanban-col__header",
  title: "jt-kanban-col__title",
  count: "jt-kanban-col__count",
  hint: "jt-kanban-col__hint",
  chevron: "jt-kanban-col__chevron",
  empty: "jt-kanban-col__empty",
  card: "jt-kanban-card",
  cardMeta: "jt-kanban-card__meta",
  cardLabel: "jt-kanban-card__label",
  focus: "jt-kanban-focus",
  focusEyebrow: "jt-kanban-focus__eyebrow",
  focusId: "jt-kanban-focus__id",
  focusTitle: "jt-kanban-focus__title",
  focusBody: "jt-kanban-focus__body",
  focusFoot: "jt-kanban-focus__foot",
  overWip: "is-over-wip",
} as const;

/** Chips actions (boutons compacts cartes Kanban / listes). */
export const uiChip = {
  primary:
    "rounded bg-amber-700 px-1.5 py-0.5 text-[10px] font-bold text-white disabled:opacity-40",
  accent:
    "rounded bg-violet-700 px-1.5 py-0.5 text-[10px] font-bold text-white disabled:opacity-40",
  muted:
    "rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-medium text-inherit dark:bg-white/15 disabled:opacity-40",
  ghost:
    "rounded border border-current/30 px-3 py-1.5 text-sm font-medium text-inherit disabled:opacity-40",
  solid:
    "rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40",
  soft:
    "rounded-lg bg-white/90 px-3 py-1.5 text-sm text-gray-900 dark:bg-gray-900 dark:text-gray-100 disabled:opacity-40",
} as const;
