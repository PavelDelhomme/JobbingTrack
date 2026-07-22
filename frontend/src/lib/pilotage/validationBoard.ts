import fs from "fs";
import {
  findRowById,
  parseMarkdownTables,
  replaceTableRow,
  stripMdBold,
} from "@/lib/pilotage/mdTables";
import { resolvePilotageById } from "@/lib/pilotage/paths";
import { buildSeedValidationBoard } from "@/lib/pilotage/validationBoardSeed";
import { prependRecentDoneInTodos } from "@/lib/pilotage/termines";
import type {
  CycleDerivedStatus,
  CycleView,
  DecisionStamp,
  TaskStatus,
  ValidationBoardFile,
  ValidationTask,
} from "@/lib/pilotage/validationBoardTypes";

function todayShort(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function decisionFromStatus(status: TaskStatus): DecisionStamp | null {
  switch (status) {
    case "ok":
      return "OK";
    case "ko":
      return "KO";
    case "partial":
      return "PARTIEL";
    case "deferred":
      return "PLUS_TARD";
    case "rework":
      return "REWORK";
    default:
      return null;
  }
}

export function statusFromMdDecision(decision: string): TaskStatus | null {
  const d = decision.toUpperCase();
  if (!d.trim()) return null;
  if (d.includes("PLUS TARD") || d.includes("PLUS_TARD")) return "deferred";
  if (d.includes("PARTIEL")) return "partial";
  if (d.includes("REWORK")) return "rework";
  if (d.includes("OK")) return "ok";
  if (d.includes("KO")) return "ko";
  return null;
}

export function checklistProgress(task: ValidationTask): {
  done: number;
  total: number;
  allDone: boolean;
  anyDone: boolean;
} {
  const total = task.checklist.length;
  const done = task.checklist.filter((c) => c.done).length;
  return {
    done,
    total,
    allDone: total === 0 || done === total,
    anyDone: done > 0,
  };
}

export function deriveCycleStatus(
  tasks: ValidationTask[],
): CycleDerivedStatus {
  if (tasks.length === 0) return "open";
  if (tasks.every((t) => t.status === "ok")) return "ok";
  if (tasks.some((t) => t.status === "ko" || t.status === "rework")) {
    return "rework";
  }
  if (tasks.every((t) => t.status === "deferred")) return "deferred";
  if (
    tasks.some((t) =>
      ["ok", "partial", "deferred", "open"].includes(t.status),
    ) &&
    !tasks.every((t) => t.status === "open")
  ) {
    return "partial";
  }
  return "open";
}

export function buildCycleViews(board: ValidationBoardFile): CycleView[] {
  return board.cycles.map((cycle) => {
    const tasks = cycle.itemIds
      .map((id) => board.tasks[id])
      .filter(Boolean) as ValidationTask[];
    const okCount = tasks.filter((t) => t.status === "ok").length;
    const status = deriveCycleStatus(tasks);
    return {
      ...cycle,
      status,
      okCount,
      total: tasks.length,
      progressLabel: `${okCount}/${tasks.length} OK`,
    };
  });
}

function colIndex(headers: string[], ...names: string[]): number {
  const lower = headers.map((h) => stripMdBold(h).toLowerCase());
  for (const n of names) {
    const i = lower.findIndex((h) => h.includes(n.toLowerCase()));
    if (i >= 0) return i;
  }
  return 0;
}

function writeJsonSafe(absPath: string, data: ValidationBoardFile): void {
  const text = `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(absPath, text, "utf8");
}

function resolveBoardPath() {
  return resolvePilotageById("VALIDATION_BOARD");
}

/** Merge seed + md decisions into existing file (preserve notes/checklist progress). */
export function mergeWithMdAndSeed(
  existing: ValidationBoardFile | null,
  validerMd: string | null,
): ValidationBoardFile {
  const seed = buildSeedValidationBoard();
  const base: ValidationBoardFile = existing
    ? {
        version: 1,
        updatedAt: existing.updatedAt || seed.updatedAt,
        cycles: existing.cycles?.length ? existing.cycles : seed.cycles,
        tasks: { ...seed.tasks, ...existing.tasks },
      }
    : seed;

  // Ensure all seed tasks exist (fill missing)
  for (const [id, seedTask] of Object.entries(seed.tasks)) {
    if (!base.tasks[id]) {
      base.tasks[id] = seedTask;
    } else {
      const cur = base.tasks[id];
      // Keep richer seed checklist if empty
      if (!cur.checklist?.length && seedTask.checklist.length) {
        cur.checklist = seedTask.checklist;
      }
      if (!cur.description) cur.description = seedTask.description;
      if (!cur.expected) cur.expected = seedTask.expected;
      if (!cur.cycleId) cur.cycleId = seedTask.cycleId;
    }
  }

  if (validerMd) {
    const tables = parseMarkdownTables(validerMd);
    for (const t of tables) {
      const iId = colIndex(t.headers, "id", "point", "#");
      const iDec = colIndex(t.headers, "décision");
      const iNotes = colIndex(t.headers, "notes");
      for (const row of t.rows) {
        const id = stripMdBold(row[iId] || "");
        if (!id || !base.tasks[id]) continue;
        const mdStatus = statusFromMdDecision(stripMdBold(row[iDec] || ""));
        if (mdStatus) {
          // Don't overwrite richer UI partial/deferred if md empty — md wins when set
          base.tasks[id].status = mdStatus;
        }
        const note = stripMdBold(row[iNotes] || "");
        if (note && !base.tasks[id].porteurNote) {
          base.tasks[id].porteurNote = note;
        }
      }
    }
  }

  base.updatedAt = nowIso();
  return base;
}

export function loadValidationBoardFile(): ValidationBoardFile {
  const resolved = resolveBoardPath();
  const valider = resolvePilotageById("TODOS_A_VALIDER");
  const validerMd =
    valider.ok && fs.existsSync(valider.absPath)
      ? fs.readFileSync(valider.absPath, "utf8")
      : null;

  let existing: ValidationBoardFile | null = null;
  if (resolved.ok && fs.existsSync(resolved.absPath)) {
    try {
      existing = JSON.parse(
        fs.readFileSync(resolved.absPath, "utf8"),
      ) as ValidationBoardFile;
    } catch {
      existing = null;
    }
  }

  const merged = mergeWithMdAndSeed(existing, validerMd);

  // Persist bootstrap if missing
  if (resolved.ok && !fs.existsSync(resolved.absPath)) {
    try {
      writeJsonSafe(resolved.absPath, merged);
    } catch {
      /* EROFS — return in-memory */
    }
  }

  return merged;
}

export function saveValidationBoardFile(
  board: ValidationBoardFile,
): { ok: true } | { ok: false; error: string } {
  const resolved = resolveBoardPath();
  if (!resolved.ok) return { ok: false, error: resolved.error };
  board.updatedAt = nowIso();
  try {
    writeJsonSafe(resolved.absPath, board);
    return { ok: true };
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: unknown }).code)
        : "";
    if (code === "EROFS" || code === "EACCES") {
      return {
        ok: false,
        error:
          "Impossible d’écrire validation-board.json (montage lecture seule).",
      };
    }
    throw e;
  }
}

export function syncDecisionToValiderMd(
  itemId: string,
  decision: DecisionStamp,
  note?: string,
): { ok: true } | { ok: false; error: string } {
  const resolved = resolvePilotageById("TODOS_A_VALIDER");
  if (!resolved.ok) return { ok: false, error: resolved.error };
  if (!fs.existsSync(resolved.absPath)) {
    return { ok: false, error: "TODOS_A_VALIDER.md introuvable" };
  }

  let content = fs.readFileSync(resolved.absPath, "utf8");
  const tables = parseMarkdownTables(content);
  let table = null as ReturnType<typeof parseMarkdownTables>[0] | null;
  for (const t of tables) {
    if (findRowById(t, [itemId])) {
      table = t;
      break;
    }
  }
  if (!table) {
    return { ok: false, error: `Item « ${itemId} » introuvable dans A_VALIDER` };
  }
  const found = findRowById(table, [itemId]);
  if (!found) {
    return { ok: false, error: `Ligne « ${itemId} » introuvable` };
  }

  const iId = colIndex(table.headers, "id", "point", "#");
  const iTodo = colIndex(table.headers, "à faire", "item", "action");
  const iDec = colIndex(table.headers, "décision");
  const iNotes = colIndex(table.headers, "notes");
  const cells = [...found.cells];
  while (cells.length < table.headers.length) cells.push("");

  const stampLabel =
    decision === "PLUS_TARD" ? "PLUS TARD" : decision;
  cells[iDec] = `**${stampLabel} ${todayShort()}**`;
  if (note?.trim()) {
    cells[iNotes] = note.trim().replace(/\|/g, "/");
  }
  cells[iId] = found.cells[iId] || cells[iId];
  cells[iTodo] = found.cells[iTodo] || cells[iTodo];

  content = replaceTableRow(content, table, found.rowIndex, cells);
  try {
    fs.writeFileSync(resolved.absPath, content, "utf8");
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: unknown }).code)
        : "";
    if (code === "EROFS" || code === "EACCES") {
      return {
        ok: false,
        error: "Impossible d’écrire TODOS_A_VALIDER.md (montage lecture seule).",
      };
    }
    throw e;
  }
  return { ok: true };
}

function appendTesterNote(itemId: string, action: string, note?: string) {
  const r = resolvePilotageById("TODOS_A_TESTER");
  if (!r.ok || !fs.existsSync(r.absPath)) return;
  const block = `\n### UI Pilotage — ${itemId} (${new Date().toISOString().slice(0, 10)})\n\n| Test | Résultat | Notes |\n|------|----------|-------|\n| Action porteur (UI) | **${action}** | ${(note || "—").replace(/\|/g, "/")} |\n`;
  try {
    fs.appendFileSync(r.absPath, block, "utf8");
  } catch {
    /* ignore */
  }
}

function pushHistory(
  task: ValidationTask,
  action: string,
  note?: string,
): void {
  task.history = [
    { at: nowIso(), action, note },
    ...(task.history || []),
  ].slice(0, 30);
}

export type BoardActionResult =
  | { ok: true; message: string; board: ValidationBoardFile }
  | { ok: false; error: string };

function statusFromDecision(d: DecisionStamp): TaskStatus {
  switch (d) {
    case "OK":
      return "ok";
    case "KO":
      return "ko";
    case "PARTIEL":
      return "partial";
    case "PLUS_TARD":
      return "deferred";
    case "REWORK":
      return "rework";
  }
}

export function applyBoardAction(opts: {
  type: "decide" | "checklist" | "reorder" | "move" | "note";
  itemId: string;
  decision?: DecisionStamp;
  note?: string;
  checklistItemId?: string;
  done?: boolean;
  checklistNote?: string;
  direction?: "up" | "down";
  cycleId?: string | null;
}): BoardActionResult {
  const board = loadValidationBoardFile();
  const task = board.tasks[opts.itemId];
  if (!task) {
    return { ok: false, error: `Tâche « ${opts.itemId} » introuvable` };
  }

  if (opts.type === "decide") {
    if (!opts.decision) {
      return { ok: false, error: "decision requise" };
    }
    let decision = opts.decision;
    if (decision === "OK") {
      const prog = checklistProgress(task);
      if (prog.total > 0 && !prog.allDone) {
        decision = "PARTIEL";
      }
    }
    task.status = statusFromDecision(decision);
    if (opts.note?.trim()) task.porteurNote = opts.note.trim();
    pushHistory(task, decision, opts.note);
    const sync = syncDecisionToValiderMd(
      opts.itemId,
      decision,
      opts.note || task.porteurNote,
    );
    if (!sync.ok) return sync;
    appendTesterNote(opts.itemId, decision, opts.note);
    if (decision === "OK" || decision === "KO") {
      prependRecentDoneInTodos({
        id: opts.itemId,
        label: task.label,
        decision,
      });
    }
  } else if (opts.type === "checklist") {
    const cid = opts.checklistItemId;
    if (!cid) return { ok: false, error: "checklistItemId requis" };
    const item = task.checklist.find((c) => c.id === cid);
    if (!item) return { ok: false, error: "critère introuvable" };
    if (typeof opts.done === "boolean") item.done = opts.done;
    else item.done = !item.done;
    if (opts.checklistNote !== undefined) {
      item.note = opts.checklistNote.slice(0, 300);
    }
    const prog = checklistProgress(task);
    if (prog.allDone && prog.total > 0) {
      // stay open until explicit OK — but mark partial→ready
      if (task.status === "open" || task.status === "partial") {
        task.status = "partial";
      }
    } else if (prog.anyDone) {
      if (task.status === "open" || task.status === "ok") {
        task.status = "partial";
        syncDecisionToValiderMd(
          opts.itemId,
          "PARTIEL",
          opts.note || task.porteurNote,
        );
      }
    } else if (task.status === "partial") {
      task.status = "open";
    }
    pushHistory(
      task,
      `checklist:${cid}=${item.done ? "on" : "off"}`,
      item.note,
    );
  } else if (opts.type === "note") {
    task.porteurNote = (opts.note || "").slice(0, 2000);
    pushHistory(task, "note", task.porteurNote);
  } else if (opts.type === "move") {
    if (opts.cycleId === null) {
      task.cycleId = undefined;
    } else if (opts.cycleId) {
      const cycle = board.cycles.find((c) => c.id === opts.cycleId);
      if (!cycle) return { ok: false, error: "cycle introuvable" };
      // remove from old cycles
      for (const c of board.cycles) {
        c.itemIds = c.itemIds.filter((id) => id !== opts.itemId);
      }
      if (!cycle.itemIds.includes(opts.itemId)) {
        cycle.itemIds.push(opts.itemId);
      }
      task.cycleId = cycle.id;
    }
    if (opts.decision === "PLUS_TARD") {
      task.status = "deferred";
      syncDecisionToValiderMd(
        opts.itemId,
        "PLUS_TARD",
        opts.note || task.porteurNote,
      );
      appendTesterNote(opts.itemId, "PLUS_TARD", opts.note);
    }
    pushHistory(task, `move:${opts.cycleId ?? "none"}`, opts.note);
  } else if (opts.type === "reorder") {
    const dir = opts.direction;
    if (dir !== "up" && dir !== "down") {
      return { ok: false, error: "direction up|down requise" };
    }
    const cycle = board.cycles.find((c) => c.id === task.cycleId);
    if (cycle) {
      const idx = cycle.itemIds.indexOf(opts.itemId);
      if (idx < 0) return { ok: false, error: "item hors cycle" };
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= cycle.itemIds.length) {
        return { ok: false, error: "déjà en bout de liste" };
      }
      const tmp = cycle.itemIds[swap];
      cycle.itemIds[swap] = cycle.itemIds[idx];
      cycle.itemIds[idx] = tmp;
      // sync order fields
      cycle.itemIds.forEach((id, i) => {
        if (board.tasks[id]) board.tasks[id].order = (task.order || 0) - idx + i;
      });
    } else {
      const siblings = Object.values(board.tasks)
        .filter((t) => !t.cycleId)
        .sort((a, b) => a.order - b.order);
      const idx = siblings.findIndex((t) => t.id === opts.itemId);
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (idx < 0 || swap < 0 || swap >= siblings.length) {
        return { ok: false, error: "déjà en bout de liste" };
      }
      const a = siblings[idx].order;
      siblings[idx].order = siblings[swap].order;
      siblings[swap].order = a;
    }
    pushHistory(task, `reorder:${dir}`);
  }

  const saved = saveValidationBoardFile(board);
  if (!saved.ok) return saved;

  return {
    ok: true,
    message: `${opts.itemId} — ${opts.type} OK`,
    board,
  };
}
