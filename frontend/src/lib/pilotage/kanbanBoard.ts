import type {
  KanbanColumnId,
  ValidationBoardFile,
  ValidationTask,
} from "@/lib/pilotage/validationBoardTypes";
import {
  KANBAN_COLUMNS,
  columnFromStatus,
  type KanbanColumnDef,
} from "@/lib/pilotage/kanbanColumns";

export type KanbanCard = ValidationTask & {
  resolvedColumn: KanbanColumnId;
  depth: number;
  childrenIds: string[];
};

export type KanbanColumnView = KanbanColumnDef & {
  cards: KanbanCard[];
  overWip: boolean;
};

export type FeedbackInboxItem = {
  id: string;
  kind: "feedback" | "error";
  label: string;
  description: string;
  at?: string;
  sourceRef: string;
};

function resolveColumn(
  task: ValidationTask,
  focusId: string | null | undefined,
): KanbanColumnId {
  if (task.column) return task.column;
  return columnFromStatus(task.status, {
    isFocus: focusId === task.id,
  });
}

function depthOf(
  task: ValidationTask,
  byId: Record<string, ValidationTask>,
  seen = new Set<string>(),
): number {
  if (!task.parentId || seen.has(task.id)) return 0;
  seen.add(task.id);
  const parent = byId[task.parentId];
  if (!parent) return 0;
  return 1 + depthOf(parent, byId, seen);
}

/**
 * Construit les colonnes Kanban à partir du board + inbox feedback/erreurs.
 * Règle ADHD : au plus 1 carte dans « doing » (focusTaskId prioritaire).
 */
export function buildKanbanColumns(
  board: ValidationBoardFile,
  inbox: FeedbackInboxItem[] = [],
): {
  columns: KanbanColumnView[];
  focus: KanbanCard | null;
  focusId: string | null;
} {
  const focusId = board.focusTaskId || null;
  const byId = board.tasks;

  const cards: KanbanCard[] = Object.values(byId).map((task) => {
    const childrenIds = Object.values(byId)
      .filter((t) => t.parentId === task.id)
      .map((t) => t.id);
    return {
      ...task,
      kind: task.kind || "task",
      resolvedColumn: resolveColumn(task, focusId),
      depth: depthOf(task, byId),
      childrenIds,
    };
  });

  // Inbox → cartes éphémères (sauf déjà promu dans le board)
  const promotedRefs = new Set(
    Object.values(byId)
      .map((t) => t.sourceRef)
      .filter((r): r is string => !!r),
  );
  const promotedIds = new Set(Object.keys(byId));
  for (const item of inbox) {
    if (promotedIds.has(item.id) || promotedRefs.has(item.sourceRef)) {
      continue;
    }
    const col: KanbanColumnId =
      item.kind === "feedback" ? "inbox_feedback" : "inbox_errors";
    cards.push({
      id: item.id,
      kind: item.kind === "feedback" ? "feedback" : "error",
      section: col,
      label: item.label,
      description: item.description,
      expected: "Promouvoir vers À faire / En cours pour traiter",
      status: "open",
      order: 0,
      checklist: [],
      porteurNote: "",
      history: [],
      sourceRef: item.sourceRef,
      resolvedColumn: col,
      depth: 0,
      childrenIds: [],
    });
  }

  // Enforce WIP=1 : si plusieurs doing, seul focus (ou le 1er par order) reste
  const doing = cards
    .filter((c) => c.resolvedColumn === "doing")
    .sort((a, b) => a.order - b.order);
  if (doing.length > 1) {
    const keep = focusId
      ? doing.find((c) => c.id === focusId) || doing[0]
      : doing[0];
    for (const c of doing) {
      if (c.id !== keep.id) {
        c.resolvedColumn = "backlog";
        c.column = "backlog";
      }
    }
  }

  const columns: KanbanColumnView[] = KANBAN_COLUMNS.map((def) => {
    const list = cards
      .filter((c) => c.resolvedColumn === def.id)
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    return {
      ...def,
      cards: list,
      overWip: def.wip != null && list.length > def.wip,
    };
  });

  const focus =
    columns.find((c) => c.id === "doing")?.cards[0] ??
    (focusId ? cards.find((c) => c.id === focusId) ?? null : null);

  return {
    columns,
    focus: focus ?? null,
    focusId: focus?.id ?? null,
  };
}
