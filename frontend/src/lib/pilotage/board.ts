import fs from "fs";
import {
  findRowById,
  parseMarkdownTables,
  replaceTableRow,
  stripMdBold,
  type MdTable,
} from "@/lib/pilotage/mdTables";
import { resolvePilotageById } from "@/lib/pilotage/paths";

export type BoardItem = {
  id: string;
  source: "TODOS" | "TODOS_A_VALIDER" | "TODOS_A_TESTER";
  section: string;
  label: string;
  action?: string;
  decision?: string;
  notes?: string;
  phase?: string;
  status: "open" | "ok" | "ko" | "pending" | "active";
};

export type PilotageBoard = {
  where: string;
  itemsEnCours: BoardItem[];
  itemsAValider: BoardItem[];
  updatedAt: string;
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

function extractWhere(pilotageMd: string | null, validerMd: string | null): string {
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

export function buildPilotageBoard(): PilotageBoard {
  const todos = readFile("TODOS");
  const valider = readFile("TODOS_A_VALIDER");
  const pilotage = readFile("PILOTAGE");

  return {
    where: extractWhere(pilotage, valider),
    itemsEnCours: todos ? parseTodosEnCours(todos) : [],
    itemsAValider: valider ? parseValider(valider) : [],
    updatedAt: new Date().toISOString(),
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
 * Applique OK / KO sur TODOS_A_VALIDER.md (+ note optionnelle).
 * Met aussi à jour une ligne de preuve courte dans TODOS_A_TESTER.md.
 */
export function applyValiderDecision(opts: {
  itemId: string;
  decision: "OK" | "KO";
  note?: string;
}): { ok: true; message: string } | { ok: false; error: string } {
  const resolved = resolvePilotageById("TODOS_A_VALIDER");
  if (!resolved.ok) return { ok: false, error: resolved.error };
  if (!fs.existsSync(resolved.absPath)) {
    return { ok: false, error: "TODOS_A_VALIDER.md introuvable" };
  }

  let content = fs.readFileSync(resolved.absPath, "utf8");
  const tables = parseMarkdownTables(content);
  const table = pickValiderTable(tables, opts.itemId);
  if (!table) {
    return { ok: false, error: `Item « ${opts.itemId} » introuvable dans A_VALIDER` };
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
  // garder id/label
  cells[iId] = found.cells[iId] || cells[iId];
  cells[iTodo] = found.cells[iTodo] || cells[iTodo];

  content = replaceTableRow(content, table, found.rowIndex, cells);
  try {
    fs.writeFileSync(resolved.absPath, content, "utf8");
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
    if (code === "EROFS" || code === "EACCES") {
      return {
        ok: false,
        error:
          "Impossible d’écrire docs/pilotage (montage lecture seule). Remontez le volume RW docs/pilotage ou travaillez hors conteneur.",
      };
    }
    throw e;
  }

  appendTesterNote(opts.itemId, opts.decision, opts.note);
  bumpSuiviActif(opts.itemId, opts.decision);

  return {
    ok: true,
    message: `${opts.itemId} → ${stamp} écrit dans TODOS_A_VALIDER.md`,
  };
}

function appendTesterNote(itemId: string, decision: string, note?: string) {
  const r = resolvePilotageById("TODOS_A_TESTER");
  if (!r.ok || !fs.existsSync(r.absPath)) return;
  const block = `\n### UI Pilotage — ${itemId} (${new Date().toISOString().slice(0, 10)})\n\n| Test | Résultat | Notes |\n|------|----------|-------|\n| Décision porteur (UI) | **${decision}** | ${(note || "—").replace(/\|/g, "/")} |\n`;
  fs.appendFileSync(r.absPath, block, "utf8");
}

function bumpSuiviActif(itemId: string, decision: string) {
  const r = resolvePilotageById("SUIVI_ACTIF");
  if (!r.ok || !fs.existsSync(r.absPath)) return;
  try {
    const json = JSON.parse(fs.readFileSync(r.absPath, "utf8")) as {
      updatedAt?: string;
      queue?: Array<{ id: string; status: string; label: string }>;
      recentDone?: Array<{ id: string; label: string }>;
    };
    json.updatedAt = new Date().toISOString().slice(0, 10);
    if (decision === "OK" && Array.isArray(json.queue)) {
      const idx = json.queue.findIndex(
        (q) => q.id.includes(itemId) || itemId.includes(q.id.replace(/^B2-/, "")),
      );
      if (idx >= 0) {
        const done = json.queue[idx];
        json.recentDone = [
          { id: done.id, label: done.label },
          ...(json.recentDone || []),
        ].slice(0, 5);
        json.queue = json.queue.filter((_, i) => i !== idx);
        if (json.queue[0]) json.queue[0].status = "active";
      }
    }
    const text = `${JSON.stringify(json, null, 2)}\n`;
    fs.writeFileSync(r.absPath, text, "utf8");
    for (const mirror of [
      `${r.root}/frontend/src/lib/pilotage/suiviActif.json`,
      `${r.root}/frontend/public/pilotage/suivi-actif.json`,
    ]) {
      try {
        fs.writeFileSync(mirror, text, "utf8");
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}
