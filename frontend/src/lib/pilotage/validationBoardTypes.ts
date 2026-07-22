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

export type ValidationTask = {
  id: string;
  cycleId?: string;
  section: string;
  label: string;
  description: string;
  expected: string;
  status: TaskStatus;
  order: number;
  checklist: ChecklistItem[];
  porteurNote: string;
  history: TaskHistoryEntry[];
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
};

export type CycleView = ValidationCycle & {
  status: CycleDerivedStatus;
  okCount: number;
  total: number;
  progressLabel: string;
};
