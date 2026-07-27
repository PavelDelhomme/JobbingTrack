export type TaskStatus =
  | "open"
  | "partial"
  | "ok"
  | "ko"
  | "deferred"
  | "rework";

export type DecisionStamp =
  | "OK"
  | "KO"
  | "PARTIEL"
  | "PLUS_TARD"
  | "REWORK";

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  note?: string;
};

export type TaskHistoryEntry = {
  at: string;
  action: string;
  note?: string;
};

export type TaskKind = "block" | "cycle" | "task" | "feedback" | "error";

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

export type ValidationTask = {
  id: string;
  cycleId?: string;
  /** Bloc parent (hiérarchie : Phase → Cycle → Tâche). */
  parentId?: string;
  kind?: TaskKind;
  /** Colonne Kanban explicite (sinon dérivée du status + focus). */
  column?: KanbanColumnId;
  section: string;
  label: string;
  description: string;
  expected: string;
  status: TaskStatus;
  order: number;
  checklist: ChecklistItem[];
  porteurNote: string;
  history: TaskHistoryEntry[];
  /** Réf. externe (crash file, user_error id). */
  sourceRef?: string;
};

export type ValidationCycle = {
  id: string;
  label: string;
  description?: string;
  itemIds: string[];
};

export type CycleDerivedStatus =
  | "ok"
  | "rework"
  | "partial"
  | "deferred"
  | "open";

export type ValidationBoardFile = {
  version: 1;
  updatedAt: string;
  cycles: ValidationCycle[];
  tasks: Record<string, ValidationTask>;
  /** Unique focus TDAH — seule carte en « En cours ». */
  focusTaskId?: string | null;
};

export type CycleView = ValidationCycle & {
  status: CycleDerivedStatus;
  okCount: number;
  total: number;
  progressLabel: string;
};
