/**
 * Parse minimal des tableaux Markdown GFM (lignes | a | b |).
 */

export type MdTable = {
  /** Titre ## le plus proche au-dessus */
  section: string;
  headers: string[];
  rows: string[][];
  /** Index de la première ligne du tableau dans le fichier (0-based) */
  startLine: number;
  /** Index après la dernière ligne du tableau */
  endLine: number;
};

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

function isSeparator(line: string): boolean {
  return /^\|?[\s:-]+\|[\s|:-]*$/.test(line.trim());
}

export function parseMarkdownTables(content: string): MdTable[] {
  const lines = content.split(/\r?\n/);
  const tables: MdTable[] = [];
  let currentSection = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h = line.match(/^#{1,3}\s+(.+)$/);
    if (h) {
      currentSection = h[1].trim();
      continue;
    }
    if (!line.trim().startsWith("|")) continue;
    if (i + 1 >= lines.length || !isSeparator(lines[i + 1])) continue;

    const headers = splitRow(line);
    const rows: string[][] = [];
    let j = i + 2;
    while (j < lines.length && lines[j].trim().startsWith("|")) {
      if (isSeparator(lines[j])) {
        j++;
        continue;
      }
      rows.push(splitRow(lines[j]));
      j++;
    }
    tables.push({
      section: currentSection,
      headers,
      rows,
      startLine: i,
      endLine: j,
    });
    i = j - 1;
  }
  return tables;
}

export function stripMdBold(s: string): string {
  return s.replace(/\*\*/g, "").trim();
}

export function replaceTableRow(
  content: string,
  table: MdTable,
  rowIndex: number,
  newCells: string[],
): string {
  const lines = content.split(/\r?\n/);
  const lineIndex = table.startLine + 2 + rowIndex;
  if (lineIndex < 0 || lineIndex >= lines.length) return content;
  lines[lineIndex] = `| ${newCells.join(" | ")} |`;
  return lines.join("\n");
}

export function findRowById(
  table: MdTable,
  idHints: string[],
): { rowIndex: number; cells: string[] } | null {
  const hints = idHints.map((h) => stripMdBold(h).toLowerCase()).filter(Boolean);
  // Préférer match exact sur la 1ʳᵉ colonne (ID / Point)
  for (let i = 0; i < table.rows.length; i++) {
    const cells = table.rows[i];
    const first = stripMdBold(cells[0] || "").toLowerCase();
    if (hints.some((h) => first === h || first.replace(/^b2-/, "") === h)) {
      return { rowIndex: i, cells };
    }
  }
  for (let i = 0; i < table.rows.length; i++) {
    const cells = table.rows[i];
    const joined = cells.map(stripMdBold).join(" ").toLowerCase();
    if (hints.some((h) => joined.includes(h))) {
      return { rowIndex: i, cells };
    }
  }
  return null;
}
