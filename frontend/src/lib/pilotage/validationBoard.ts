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
      if (!cur.column && seedTask.column) cur.column = seedTask.column;
      if (!cur.kind && seedTask.kind) cur.kind = seedTask.kind;
      if (!cur.parentId && seedTask.parentId) cur.parentId = seedTask.parentId;
      // Enrich checklist labels from seed without wiping done flags
      if (seedTask.checklist?.length) {
        for (const sc of seedTask.checklist) {
          if (!cur.checklist.some((c) => c.id === sc.id)) {
            cur.checklist.push({ ...sc });
          }
        }
      }
    }
  }

  if (base.focusTaskId === undefined) {
    base.focusTaskId = seed.focusTaskId ?? null;
  }

  // Cycles : fusionner les itemIds manquants du seed
  for (const seedCycle of seed.cycles) {
    const cur = base.cycles.find((c) => c.id === seedCycle.id);
    if (!cur) {
      base.cycles.push({ ...seedCycle, itemIds: [...seedCycle.itemIds] });
    } else {
      for (const id of seedCycle.itemIds) {
        if (!cur.itemIds.includes(id)) cur.itemIds.push(id);
      }
      if (!cur.description && seedCycle.description) {
        cur.description = seedCycle.description;
      }
      if (seedCycle.label) cur.label = seedCycle.label;
    }
  }

  if (validerMd) {
    const tables = parseMarkdownTables(validerMd);
    const alias = (raw: string): string[] => {
      const id = raw.trim();
      const out = [id];
      if (id.startsWith("B2-")) out.push(id.slice(3));
      else if (/^[A-F]\.\d/.test(id) || /^D\.\d/.test(id)) out.push(`B2-${id}`);
      return out;
    };
    for (const t of tables) {
      const iId = colIndex(t.headers, "id", "point", "#");
      const iDec = colIndex(t.headers, "décision");
      const iNotes = colIndex(t.headers, "notes");
      for (const row of t.rows) {
        const rawId = stripMdBold(row[iId] || "");
        if (!rawId) continue;
        const taskId = alias(rawId).find((c) => base.tasks[c]);
        if (!taskId) continue;
        const mdStatus = statusFromMdDecision(stripMdBold(row[iDec] || ""));
        if (mdStatus) {
          base.tasks[taskId].status = mdStatus;
        }
        const note = stripMdBold(row[iNotes] || "");
        if (note && !base.tasks[taskId].porteurNote) {
          base.tasks[taskId].porteurNote = note;
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

  // Persister si nouveau seed (tâches/cycles manquants) pour que le JSON reste la vérité live
  if (resolved.ok) {
    const existingIds = new Set(Object.keys(existing?.tasks || {}));
    const needsPersist =
      !existing ||
      Object.keys(merged.tasks).some((id) => !existingIds.has(id)) ||
      merged.cycles.some((c) => {
        const old = existing?.cycles.find((x) => x.id === c.id);
        return !old || c.itemIds.some((id) => !old.itemIds.includes(id));
      });
    if (needsPersist) {
      try {
        writeJsonSafe(resolved.absPath, merged);
      } catch {
        /* EROFS — retour mémoire */
      }
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

/** Met à jour « Point exact » + PILOTAGE « Où on en est » vers la prochaine tâche ouverte. */
function updatePointExactFromBoard(board: ValidationBoardFile): void {
  const next = Object.values(board.tasks)
    .filter((t) => ["open", "partial", "rework"].includes(t.status))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))[0];
  if (!next) return;

  const pointLine = `**Point exact** : **${next.id}** ${next.label}`;
  const valider = resolvePilotageById("TODOS_A_VALIDER");
  if (valider.ok && fs.existsSync(valider.absPath)) {
    try {
      let md = fs.readFileSync(valider.absPath, "utf8");
      if (/\*\*Point exact\*\*\s*:/.test(md)) {
        md = md.replace(/\*\*Point exact\*\*\s*:[^\n]*/, pointLine);
      }
      fs.writeFileSync(valider.absPath, md, "utf8");
    } catch {
      /* ignore */
    }
  }

  const pilotage = resolvePilotageById("PILOTAGE");
  if (pilotage.ok && fs.existsSync(pilotage.absPath)) {
    try {
      let md = fs.readFileSync(pilotage.absPath, "utf8");
      const where = `**Phase B · ${next.id} ${next.label}**`;
      if (/\*\*Phase B[^*]*\*\*/.test(md)) {
        md = md.replace(/\*\*Phase B[^*]*\*\*[^\n]*/, where);
        fs.writeFileSync(pilotage.absPath, md, "utf8");
      }
    } catch {
      /* ignore */
    }
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
  checklistNote?: string;
  direction?: "up" | "down";
  cycleId?: string | null;
  column?: import("@/lib/pilotage/validationBoardTypes").KanbanColumnId;
  label?: string;
  description?: string;
  inboxKind?: "feedback" | "error";
  sourceRef?: string;
}): BoardActionResult {
  const board = loadValidationBoardFile();

  if (opts.type === "promoteInbox") {
    const sourceRef = (opts.sourceRef || opts.itemId).slice(0, 120);
    const existing =
      board.tasks[opts.itemId] ||
      Object.values(board.tasks).find((t) => t.sourceRef === sourceRef);
    const targetCol =
      opts.column && opts.column !== "inbox_feedback" && opts.column !== "inbox_errors"
        ? opts.column
        : "backlog";
    if (existing) {
      return applyBoardAction({
        type: "setColumn",
        itemId: existing.id,
        column: targetCol,
        note: opts.note || "re-promo inbox",
      });
    }
    const kind = opts.inboxKind === "error" ? "error" : "feedback";
    const id = opts.itemId.slice(0, 80);
    const maxOrder = Math.max(
      0,
      ...Object.values(board.tasks).map((t) => t.order || 0),
    );
    board.tasks[id] = {
      id,
      kind,
      column: targetCol,
      section: kind === "error" ? "Inbox erreurs" : "Inbox retours",
      label: (opts.label || opts.note || id).slice(0, 200),
      description: (opts.description || "").slice(0, 2000),
      expected: "Traiter puis OK/KO depuis la fiche",
      status: "open",
      order: maxOrder + 1,
      checklist: [
        {
          id: "repro",
          label: "Reproduire / confirmer le signalement",
          done: false,
        },
        {
          id: "fix-or-wontfix",
          label: "Corriger ou documenter le refus",
          done: false,
        },
      ],
      porteurNote: opts.note?.slice(0, 2000) || "",
      history: [{ at: nowIso(), action: "promoteInbox", note: sourceRef }],
      sourceRef,
    };
    pushHistory(board.tasks[id], `column:${targetCol}`, "créé depuis inbox");
    updatePointExactFromBoard(board);
    const saved = saveValidationBoardFile(board);
    if (!saved.ok) return saved;
    return {
      ok: true,
      message: `${id} promu → ${targetCol}`,
      board,
    };
  }

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
    // Colonnes Kanban alignées sur la décision
    if (decision === "OK") {
      task.column = "done";
      if (board.focusTaskId === opts.itemId) board.focusTaskId = null;
    } else if (decision === "KO" || decision === "REWORK") {
      task.column = "rework";
      if (board.focusTaskId === opts.itemId) board.focusTaskId = null;
    } else if (decision === "PLUS_TARD") {
      task.column = "later";
      if (board.focusTaskId === opts.itemId) board.focusTaskId = null;
    } else if (decision === "PARTIEL") {
      task.column = "a_tester";
    }
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
    if (
      decision === "OK" ||
      decision === "KO" ||
      decision === "PLUS_TARD" ||
      decision === "REWORK"
    ) {
      updatePointExactFromBoard(board);
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
  } else if (opts.type === "setColumn") {
    const col = opts.column;
    if (!col) return { ok: false, error: "column requise" };
    const valid = [
      "inbox_feedback",
      "inbox_errors",
      "backlog",
      "doing",
      "a_tester",
      "a_valider",
      "rework",
      "later",
      "done",
    ];
    if (!valid.includes(col)) {
      return { ok: false, error: `colonne invalide: ${col}` };
    }
    // WIP=1 : déplacer l’ancien focus hors doing
    if (col === "doing") {
      if (board.focusTaskId && board.focusTaskId !== opts.itemId) {
        const prev = board.tasks[board.focusTaskId];
        if (prev) {
          prev.column = "backlog";
          pushHistory(prev, "auto:demote-from-doing");
        }
      }
      board.focusTaskId = opts.itemId;
      task.column = "doing";
      // En cours = focus actif : ne pas afficher « À reprendre » / deferred
      if (
        task.status === "ok" ||
        task.status === "deferred" ||
        task.status === "rework" ||
        task.status === "ko"
      ) {
        task.status = "open";
      }
    } else {
      task.column = col;
      if (board.focusTaskId === opts.itemId) board.focusTaskId = null;
      if (col === "later") task.status = "deferred";
      if (col === "rework") task.status = "rework";
      if (col === "done") task.status = "ok";
      if (col === "a_tester" && task.status === "open") {
        task.status = "partial";
      }
      if (col === "backlog" || col === "a_valider") {
        if (task.status === "deferred" || task.status === "ok") {
          task.status = "open";
        }
      }
    }
    pushHistory(task, `column:${col}`, opts.note);
    updatePointExactFromBoard(board);
  } else if (opts.type === "focus") {
    // Alias ADHD : mettre en « En cours » (WIP 1)
    return applyBoardAction({
      type: "setColumn",
      itemId: opts.itemId,
      column: "doing",
      note: opts.note,
    });
  }

  const saved = saveValidationBoardFile(board);
  if (!saved.ok) return saved;

  return {
    ok: true,
    message: `${opts.itemId} — ${opts.type} OK`,
    board,
  };
}
