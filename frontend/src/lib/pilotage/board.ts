import fs from "fs";
import {
  findRowById,
  parseMarkdownTables,
  replaceTableRow,
  stripMdBold,
  type MdTable,
} from "@/lib/pilotage/mdTables";
import { resolvePilotageById } from "@/lib/pilotage/paths";
import {
  applyBoardAction,
  buildCycleViews,
  loadValidationBoardFile,
} from "@/lib/pilotage/validationBoard";
import type {
  CycleView,
  DecisionStamp,
  ValidationBoardFile,
  ValidationTask,
} from "@/lib/pilotage/validationBoardTypes";
import {
  buildItemsTermines,
  parseRecentDoneSection,
  type TermineItem,
} from "@/lib/pilotage/termines";

export type BoardItem = {
  id: string;
  source: "TODOS" | "TODOS_A_VALIDER" | "TODOS_A_TESTER";
  section: string;
  label: string;
  action?: string;
  decision?: string;
  notes?: string;
  phase?: string;
  status:
    | "open"
    | "ok"
    | "ko"
    | "pending"
    | "active"
    | "partial"
    | "deferred"
    | "rework";
  /** Présent pour les entrées de la section Terminées. */
  completedAt?: string;
  completedAtLabel?: string;
};

export type PilotageBoard = {
  where: string;
  itemsEnCours: BoardItem[];
  itemsAValider: BoardItem[];
  itemsTodosAll: BoardItem[];
  /** Alias : uniquement « Récemment terminé » dans TODOS.md. */
  itemsRecentDone: BoardItem[];
  /** Fusion chrono : récent TODOS + A_VALIDER OK/KO + board + TODOS_DONE. */
  itemsTermines: TermineItem[];
  updatedAt: string;
  validation: ValidationBoardFile;
  cycles: CycleView[];
  tasksNow: ValidationTask[];
  tasksLater: ValidationTask[];
  tasksDecided: ValidationTask[];
};

function colIndex(headers: string[], ...names: string[]): number {
  const lower = headers.map((h) => stripMdBold(h).toLowerCase());
  for (const n of names) {
    const i = lower.findIndex((h) => h.includes(n.toLowerCase()));
    if (i >= 0) return i;
  }
  return 0;
}

function decisionStatus(decision: string): BoardItem["status"] {
  const d = decision.toUpperCase();
  if (d.includes("PLUS TARD") || d.includes("PLUS_TARD")) return "deferred";
  if (d.includes("PARTIEL")) return "partial";
  if (d.includes("REWORK")) return "rework";
  if (d.includes("OK")) return "ok";
  if (d.includes("KO")) return "ko";
  if (!decision.trim()) return "open";
  return "pending";
}

function readFile(id: string): string | null {
  const r = resolvePilotageById(id);
  if (!r.ok || !fs.existsSync(r.absPath)) return null;
  return fs.readFileSync(r.absPath, "utf8");
}

function parseValider(content: string): BoardItem[] {
  const tables = parseMarkdownTables(content);
  const items: BoardItem[] = [];
  for (const t of tables) {
    const iId = colIndex(t.headers, "id", "point", "#");
    const iTodo = colIndex(t.headers, "à faire", "item", "action");
    const iDec = colIndex(t.headers, "décision");
    const iNotes = colIndex(t.headers, "notes");
    for (const row of t.rows) {
      const id = stripMdBold(row[iId] || "");
      if (!id || id === "—" || id.toLowerCase() === "point") continue;
      const decision = stripMdBold(row[iDec] || "");
      items.push({
        id,
        source: "TODOS_A_VALIDER",
        section: t.section,
        label: stripMdBold(row[iTodo] || id),
        decision,
        notes: stripMdBold(row[iNotes] || ""),
        status: decisionStatus(decision),
      });
    }
  }
  return items;
}

function parseTodosEnCours(content: string): BoardItem[] {
  const tables = parseMarkdownTables(content);
  const items: BoardItem[] = [];
  for (const t of tables) {
    if (!/en cours/i.test(t.section) && !/maintenant/i.test(t.section)) {
      continue;
    }
    const iId = colIndex(t.headers, "id");
    const iPhase = colIndex(t.headers, "phase");
    const iItem = colIndex(t.headers, "item");
    const iAction = colIndex(t.headers, "action");
    for (const row of t.rows) {
      const id = stripMdBold(row[iId] || "");
      if (!id) continue;
      items.push({
        id,
        source: "TODOS",
        section: t.section,
        phase: stripMdBold(row[iPhase] || ""),
        label: stripMdBold(row[iItem] || id),
        action: stripMdBold(row[iAction] || ""),
        status: "active",
      });
    }
  }
  return items;
}

/** Toutes les tables TODOS utiles (En cours, File Phase B, backlog visible). */
function parseTodosCatalog(content: string): BoardItem[] {
  const tables = parseMarkdownTables(content);
  const items: BoardItem[] = [];
  const seen = new Set<string>();
  for (const t of tables) {
    const sec = t.section || "";
    if (/récemment terminé/i.test(sec)) continue;
    if (/process/i.test(sec) && /suivi/i.test(sec)) continue;
    const iId = colIndex(t.headers, "id", "#", "point");
    const iPhase = colIndex(t.headers, "phase");
    const iItem = colIndex(t.headers, "item", "à faire", "action");
    const iAction = colIndex(t.headers, "action immédiate", "action", "statut");
    for (const row of t.rows) {
      const id = stripMdBold(row[iId] || "");
      if (!id || id === "—" || (/^\d+$/.test(id) && row.length < 3)) continue;
      const key = `${sec}::${id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const label = stripMdBold(row[iItem] || id);
      const action = stripMdBold(row[iAction] || "");
      items.push({
        id,
        source: "TODOS",
        section: sec || "TODOS",
        phase: stripMdBold(row[iPhase] || ""),
        label,
        action: action !== label ? action : undefined,
        status: /en cours|maintenant/i.test(sec) ? "active" : "pending",
      });
    }
  }
  return items;
}

function extractWhere(
  pilotageMd: string | null,
  validerMd: string | null,
): string {
  if (pilotageMd) {
    const m = pilotageMd.match(/\*\*Phase[^*]*\*\*[^\n]*/);
    if (m) return m[0].replace(/\*\*/g, "").trim();
  }
  if (validerMd) {
    const m = validerMd.match(/\*\*Point exact\*\*\s*:\s*(.+)/);
    if (m) return m[1].trim();
  }
  return "Phase active non détectée";
}

function sortTasks(tasks: ValidationTask[]): ValidationTask[] {
  return [...tasks].sort(
    (a, b) => a.order - b.order || a.id.localeCompare(b.id),
  );
}

export function buildPilotageBoard(): PilotageBoard {
  const todos = readFile("TODOS");
  const valider = readFile("TODOS_A_VALIDER");
  const done = readFile("TODOS_DONE");
  const pilotage = readFile("PILOTAGE");
  const validation = loadValidationBoardFile();
  const cycles = buildCycleViews(validation);
  const allTasks = Object.values(validation.tasks);
  const recent = todos ? parseRecentDoneSection(todos) : [];
  const termines = buildItemsTermines({
    todosMd: todos,
    doneMd: done,
    validerMd: valider,
    validationTasks: allTasks,
  });

  return {
    where: extractWhere(pilotage, valider),
    itemsEnCours: todos ? parseTodosEnCours(todos) : [],
    itemsAValider: valider ? parseValider(valider) : [],
    itemsTodosAll: todos ? parseTodosCatalog(todos) : [],
    itemsRecentDone: recent,
    itemsTermines: termines,
    updatedAt: new Date().toISOString(),
    validation,
    cycles,
    tasksNow: sortTasks(
      allTasks.filter((t) =>
        ["open", "partial", "rework"].includes(t.status),
      ),
    ),
    tasksLater: sortTasks(allTasks.filter((t) => t.status === "deferred")),
    tasksDecided: sortTasks(
      allTasks.filter((t) => t.status === "ok" || t.status === "ko"),
    ),
  };
}

function todayShort(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function pickValiderTable(tables: MdTable[], itemId: string): MdTable | null {
  for (const t of tables) {
    if (findRowById(t, [itemId])) return t;
  }
  return null;
}

/**
 * Applique une décision sur le board riche (+ sync A_VALIDER).
 * Fallback legacy md si la tâche n’est pas dans validation-board.
 */
export function applyValiderDecision(opts: {
  itemId: string;
  decision: "OK" | "KO" | DecisionStamp;
  note?: string;
}): { ok: true; message: string } | { ok: false; error: string } {
  const decision = opts.decision as DecisionStamp;
  if (
    decision === "OK" ||
    decision === "KO" ||
    decision === "PARTIEL" ||
    decision === "PLUS_TARD" ||
    decision === "REWORK"
  ) {
    const rich = applyBoardAction({
      type: "decide",
      itemId: opts.itemId,
      decision,
      note: opts.note,
    });
    if (rich.ok) {
      return { ok: true, message: rich.message };
    }
  }

  const resolved = resolvePilotageById("TODOS_A_VALIDER");
  if (!resolved.ok) return { ok: false, error: resolved.error };
  if (!fs.existsSync(resolved.absPath)) {
    return { ok: false, error: "TODOS_A_VALIDER.md introuvable" };
  }

  let content = fs.readFileSync(resolved.absPath, "utf8");
  const tables = parseMarkdownTables(content);
  const table = pickValiderTable(tables, opts.itemId);
  if (!table) {
    return {
      ok: false,
      error: `Item « ${opts.itemId} » introuvable dans A_VALIDER`,
    };
  }
  const found = findRowById(table, [opts.itemId]);
  if (!found) {
    return { ok: false, error: `Ligne « ${opts.itemId} » introuvable` };
  }

  const iId = colIndex(table.headers, "id", "point", "#");
  const iTodo = colIndex(table.headers, "à faire", "item", "action");
  const iDec = colIndex(table.headers, "décision");
  const iNotes = colIndex(table.headers, "notes");

  const cells = [...found.cells];
  while (cells.length < table.headers.length) cells.push("");

  const stamp = `${opts.decision} ${todayShort()}`;
  cells[iDec] = `**${stamp}**`;
  if (opts.note?.trim()) {
    cells[iNotes] = opts.note.trim().replace(/\|/g, "/");
  } else if (opts.decision === "OK" && !stripMdBold(cells[iNotes] || "")) {
    cells[iNotes] = "porteur UI";
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
        error:
          "Impossible d’écrire docs/pilotage (montage lecture seule). Remontez le volume RW docs/pilotage ou travaillez hors conteneur.",
      };
    }
    throw e;
  }

  return {
    ok: true,
    message: `${opts.itemId} → ${stamp} écrit dans TODOS_A_VALIDER.md`,
  };
}

export { applyBoardAction };
