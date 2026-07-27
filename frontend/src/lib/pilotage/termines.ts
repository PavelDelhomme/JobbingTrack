import fs from "fs";
import {
  parseMarkdownTables,
  stripMdBold,
} from "@/lib/pilotage/mdTables";
import { resolvePilotageById } from "@/lib/pilotage/paths";
import type { ValidationTask } from "@/lib/pilotage/validationBoardTypes";

const DEFAULT_YEAR = 2026;
/** Nombre max d’entrées « Récemment terminé » conservées dans TODOS.md. */
export const RECENT_DONE_MAX = 12;

export type TermineSource = "TODOS" | "TODOS_A_VALIDER" | "TODOS_A_TESTER";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** `22/07` ou `22/07/2026` → ISO date (midi UTC) pour tri. */
export function parseFrDateToIso(
  raw: string,
  fallbackYear = DEFAULT_YEAR,
): string | null {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = m[3] ? Number(m[3]) : fallbackYear;
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${pad2(month)}-${pad2(day)}T12:00:00.000Z`;
}

export function todayFrShort(): string {
  const d = new Date();
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}

export type TermineItem = {
  id: string;
  source: TermineSource;
  section: string;
  label: string;
  action?: string;
  decision?: string;
  notes?: string;
  phase?: string;
  status: "ok" | "ko";
  completedAt: string;
  completedAtLabel: string;
};

function toTermine(
  item: Omit<TermineItem, "completedAt" | "completedAtLabel" | "status"> & {
    status?: "ok" | "ko";
  },
  completedAt: string,
  completedAtLabel: string,
): TermineItem {
  return {
    ...item,
    status: item.status === "ko" ? "ko" : "ok",
    completedAt,
    completedAtLabel,
  };
}

/** Section courte « Récemment terminé » (listes numérotées + sous-titres datés). */
export function parseRecentDoneSection(content: string): TermineItem[] {
  const block = content.match(
    /##\s*Récemment terminé[\s\S]*?(?=\n##\s[^#]|\n##\s*$)/i,
  );
  if (!block) return [];

  const items: TermineItem[] = [];
  let sectionDateIso =
    parseFrDateToIso(todayFrShort()) || new Date().toISOString();
  let sectionDateLabel = todayFrShort();
  let subsection = "Récemment terminé";

  for (const line of block[0].split("\n")) {
    const h3 = line.match(/^###\s+(.+)/);
    if (h3) {
      subsection = h3[1].trim();
      const dm = subsection.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/);
      if (dm) {
        const iso = parseFrDateToIso(dm[1]);
        if (iso) {
          sectionDateIso = iso;
          sectionDateLabel = dm[1];
        }
      }
      continue;
    }

    const trimmed = line.trim();
    if (!/^\d+\.\s+/.test(trimmed)) continue;

    const ok = trimmed.match(
      /^\d+\.\s+\*\*(OK|KO)\*\*\s+(\S+)\s+(.+?)(?:\s+[—–-]\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?))?\s*$/i,
    );
    if (!ok) continue;

    const decision = ok[1].toUpperCase() as "OK" | "KO";
    const id = ok[2];
    const label = ok[3].trim();
    let dateIso = sectionDateIso;
    let dateLabel = sectionDateLabel;
    if (ok[4]) {
      const iso = parseFrDateToIso(ok[4]);
      if (iso) {
        dateIso = iso;
        dateLabel = ok[4];
      }
    }

    items.push(
      toTermine(
        {
          id,
          source: "TODOS",
          section: subsection,
          label,
          decision,
          status: decision === "KO" ? "ko" : "ok",
        },
        dateIso,
        dateLabel,
      ),
    );
  }
  return items;
}

/** Table chronologique de TODOS_DONE.md. */
export function parseTodosDoneTable(content: string): TermineItem[] {
  const tables = parseMarkdownTables(content);
  const items: TermineItem[] = [];
  for (const t of tables) {
    const headers = t.headers.map((h) => stripMdBold(h).toLowerCase());
    const iDate = headers.findIndex((h) => h.includes("date"));
    const iItem = headers.findIndex(
      (h) => h.includes("élément") || h.includes("element") || h.includes("valid"),
    );
    const iEnv = headers.findIndex((h) => h.includes("environnement"));
    const iNotes = headers.findIndex(
      (h) => h.includes("preuve") || h.includes("remarque") || h.includes("notes"),
    );
    if (iDate < 0 || iItem < 0) continue;

    for (const row of t.rows) {
      const dateRaw = stripMdBold(row[iDate] || "");
      const label = stripMdBold(row[iItem] || "");
      if (!dateRaw || !label) continue;
      const iso =
        parseFrDateToIso(dateRaw.replace(/-/g, "/")) ||
        (() => {
          const d = new Date(dateRaw);
          return Number.isNaN(d.getTime()) ? null : d.toISOString();
        })();
      if (!iso) continue;

      const idGuess =
        label.match(/\b([A-Z]{1,4}\d?[A-Z0-9._-]{2,})\b/)?.[1] ||
        label.slice(0, 40).replace(/\s+/g, "-");

      items.push(
        toTermine(
          {
            id: idGuess,
            source: "TODOS",
            section: "TODOS_DONE",
            label,
            notes:
              [
                iEnv >= 0 ? stripMdBold(row[iEnv] || "") : "",
                iNotes >= 0 ? stripMdBold(row[iNotes] || "") : "",
              ]
                .filter(Boolean)
                .join(" · ") || undefined,
            status: "ok",
            decision: "OK",
          },
          iso,
          dateRaw.includes("/")
            ? dateRaw.slice(0, 10)
            : `${pad2(new Date(iso).getUTCDate())}/${pad2(new Date(iso).getUTCMonth() + 1)}`,
        ),
      );
    }
  }
  return items;
}

/** Lignes A_VALIDER déjà décidées OK/KO. */
export function parseValiderDecided(content: string): TermineItem[] {
  const tables = parseMarkdownTables(content);
  const items: TermineItem[] = [];
  for (const t of tables) {
    const headers = t.headers.map((h) => stripMdBold(h).toLowerCase());
    const iId = headers.findIndex(
      (h) => h.includes("id") || h.includes("point") || h === "#",
    );
    const iTodo = headers.findIndex(
      (h) =>
        h.includes("à faire") ||
        h.includes("item") ||
        h.includes("action") ||
        h.includes("faire"),
    );
    const iDec = headers.findIndex((h) => h.includes("décision"));
    const iNotes = headers.findIndex((h) => h.includes("notes"));
    if (iId < 0 || iDec < 0) continue;

    for (const row of t.rows) {
      const id = stripMdBold(row[iId] || "");
      const decision = stripMdBold(row[iDec] || "");
      if (!id || !decision.trim()) continue;
      const up = decision.toUpperCase();
      if (!up.includes("OK") && !up.includes("KO")) continue;
      if (up.includes("PARTIEL") || up.includes("PLUS TARD") || up.includes("REWORK")) {
        continue;
      }

      const dm = decision.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/);
      const iso =
        (dm && parseFrDateToIso(dm[1])) ||
        parseFrDateToIso(todayFrShort()) ||
        new Date().toISOString();
      const label = stripMdBold(row[iTodo >= 0 ? iTodo : iId] || id);

      items.push(
        toTermine(
          {
            id,
            source: "TODOS_A_VALIDER",
            section: t.section || "A_VALIDER",
            label,
            decision,
            notes: iNotes >= 0 ? stripMdBold(row[iNotes] || "") : undefined,
            status: up.includes("KO") ? "ko" : "ok",
          },
          iso,
          dm?.[1] || todayFrShort(),
        ),
      );
    }
  }
  return items;
}

export function terminesFromValidationTasks(
  tasks: ValidationTask[],
): TermineItem[] {
  return tasks
    .filter((t) => t.status === "ok" || t.status === "ko")
    .map((t) => {
      const hist = t.history?.[0];
      const iso = hist?.at || new Date().toISOString();
      const d = new Date(iso);
      const label = Number.isNaN(d.getTime())
        ? todayFrShort()
        : `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
      return toTermine(
        {
          id: t.id,
          source: "TODOS_A_VALIDER",
          section: t.section || "validation-board",
          label: t.label,
          notes: t.porteurNote || undefined,
          decision: t.status === "ko" ? "KO" : "OK",
          status: t.status === "ko" ? "ko" : "ok",
        },
        iso,
        label,
      );
    });
}

/**
 * Fusion chronologique (plus récent d’abord), dédoublonnage par id.
 * Ordre des groupes = priorité (le premier gagne si même id).
 */
export function mergeTerminesChrono(
  groups: TermineItem[][],
): TermineItem[] {
  const byId = new Map<string, TermineItem>();
  for (const group of groups) {
    for (const item of group) {
      const key = item.id.toLowerCase();
      if (!byId.has(key)) byId.set(key, item);
    }
  }
  return [...byId.values()].sort((a, b) => {
    const c = b.completedAt.localeCompare(a.completedAt);
    if (c !== 0) return c;
    return a.id.localeCompare(b.id);
  });
}

export function buildItemsTermines(opts: {
  todosMd: string | null;
  doneMd: string | null;
  validerMd: string | null;
  validationTasks: ValidationTask[];
}): TermineItem[] {
  const recent = opts.todosMd ? parseRecentDoneSection(opts.todosMd) : [];
  const done = opts.doneMd ? parseTodosDoneTable(opts.doneMd) : [];
  const valider = opts.validerMd ? parseValiderDecided(opts.validerMd) : [];
  const board = terminesFromValidationTasks(opts.validationTasks);
  // Priorité lecture : recent > valider > board > done archive
  return mergeTerminesChrono([recent, valider, board, done]);
}

/**
 * Préfixe une ligne OK/KO dans `## Récemment terminé` de TODOS.md
 * et plafonne à RECENT_DONE_MAX entrées numérotées.
 */
export function prependRecentDoneInTodos(opts: {
  id: string;
  label: string;
  decision?: "OK" | "KO";
}): { ok: true } | { ok: false; error: string } {
  const resolved = resolvePilotageById("TODOS");
  if (!resolved.ok) return { ok: false, error: resolved.error };
  if (!fs.existsSync(resolved.absPath)) {
    return { ok: false, error: "TODOS.md introuvable" };
  }

  const decision = opts.decision || "OK";
  const stamp = todayFrShort();
  const line = `1. **${decision}** ${opts.id} ${opts.label.replace(/\n/g, " ").slice(0, 160)} — ${stamp}`;

  let content = fs.readFileSync(resolved.absPath, "utf8");
  const headingRe = /(##\s*Récemment terminé[^\n]*\n)/i;
  if (!headingRe.test(content)) {
    content = content.replace(
      /^(#\s[^\n]+\n)/,
      `$1\n## Récemment terminé (max 1 catégorie + 3 sous-items)\n\n### Session UI (${stamp})\n\n${line}\n\n`,
    );
  } else {
    content = content.replace(headingRe, (_m, heading: string) => {
      return `${heading}\n### Session UI (${stamp})\n\n${line}\n`;
    });
  }

  // Renumeroter + plafonner les lignes « N. **OK|KO** »
  content = renumberAndCapRecentDone(content, RECENT_DONE_MAX);

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
        error: "Impossible d’écrire TODOS.md (montage lecture seule).",
      };
    }
    throw e;
  }
  return { ok: true };
}

export function renumberAndCapRecentDone(
  content: string,
  max = RECENT_DONE_MAX,
): string {
  const match = content.match(
    /(##\s*Récemment terminé[^\n]*\n)([\s\S]*?)(?=\n##\s[^#]|\n##\s*$)/i,
  );
  if (!match) return content;

  const heading = match[1];
  let body = match[2];
  const lineRe = /^(\d+)\.\s+\*\*(OK|KO)\*\*\s+.+$/gim;
  const lines: string[] = [];
  body = body.replace(lineRe, (full) => {
    lines.push(full.replace(/^\d+\./, "N."));
    return "<%LINE%>";
  });

  const kept = lines.slice(0, max);
  let i = 0;
  body = body.replace(/<%LINE%>/g, () => {
    if (i >= kept.length) return "";
    const text = kept[i].replace(/^N\./, `${i + 1}.`);
    i += 1;
    return text;
  });

  // Nettoyer sous-sections vides éventuelles (### sans lignes)
  body = body.replace(/\n###[^\n]+\n+(?=\n###|\n*$)/g, "\n");

  return content.replace(match[0], `${heading}${body}`);
}
