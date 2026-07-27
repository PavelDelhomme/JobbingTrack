import fs from "fs";
import path from "path";
import {
  parseMarkdownTables,
  replaceTableRow,
  findRowById,
  stripMdBold,
} from "./mdTables";

/**
 * Corrélation sans écrire sur disque : parse → mutate en mémoire → re-parse.
 */
describe("pilotage board correlation (in-memory)", () => {
  const fixture = `# TODOs à valider

**Point exact** : **B2-D.6** FAB Relance

## Correctifs

| ID | À faire | Décision | Notes |
|----|---------|----------|-------|
| **MOB-ENT-01** | Liste entreprises | | backfill |
| **WEB-LOGIN-01** | Login FR | | |

## B2

| Point | À faire | Décision (OK / KO + détail) | Notes |
|-------|---------|-----------------------------|-------|
| **D.6** | FAB → Relance | | ◀ à remplir |
| D.7 | FAB → Appel | **OK 22/07** | |
`;

  it("parse open vs decided alignés avec cellules Décision", () => {
    const tables = parseMarkdownTables(fixture);
    const items: { id: string; status: string }[] = [];
    for (const t of tables) {
      const iId = 0;
      const iDec = t.headers.findIndex((h) =>
        stripMdBold(h).toLowerCase().includes("décision"),
      );
      for (const row of t.rows) {
        const id = stripMdBold(row[iId] || "");
        const decision = stripMdBold(row[iDec] || "");
        const status = decision.toUpperCase().includes("OK")
          ? "ok"
          : decision.toUpperCase().includes("KO")
            ? "ko"
            : !decision.trim()
              ? "open"
              : "pending";
        items.push({ id, status });
      }
    }
    expect(items.find((i) => i.id === "MOB-ENT-01")?.status).toBe("open");
    expect(items.find((i) => i.id === "D.6")?.status).toBe("open");
    expect(items.find((i) => i.id === "D.7")?.status).toBe("ok");
  });

  it("round-trip OK écriture mémoire → re-lecture status ok", () => {
    const tables = parseMarkdownTables(fixture);
    const table = tables[0];
    const found = findRowById(table, ["MOB-ENT-01"]);
    expect(found).not.toBeNull();
    const cells = [...found!.cells];
    cells[2] = "**OK 22/07**";
    cells[3] = "preuve agent";
    const next = replaceTableRow(fixture, table, found!.rowIndex, cells);
    const again = parseMarkdownTables(next)[0];
    const row = findRowById(again, ["MOB-ENT-01"]);
    expect(stripMdBold(row!.cells[2])).toContain("OK");
  });
});

describe("pilotage board correlation (live docs)", () => {
  const root = path.resolve(__dirname, "../../../../..");
  const validerPath = path.join(root, "docs/pilotage/TODOS_A_VALIDER.md");
  const todosPath = path.join(root, "docs/pilotage/TODOS.md");

  it("A_VALIDER open items = lignes sans décision OK/KO", () => {
    if (!fs.existsSync(validerPath)) return;
    const content = fs.readFileSync(validerPath, "utf8");
    const tables = parseMarkdownTables(content);
    let open = 0;
    let decided = 0;
    for (const t of tables) {
      const iDec = t.headers.findIndex((h) =>
        stripMdBold(h).toLowerCase().includes("décision"),
      );
      if (iDec < 0) continue;
      for (const row of t.rows) {
        const id = stripMdBold(row[0] || "");
        if (!id) continue;
        const d = stripMdBold(row[iDec] || "").toUpperCase();
        if (d.includes("OK") || d.includes("KO")) decided += 1;
        else if (!d.trim()) open += 1;
      }
    }
    expect(open).toBeGreaterThan(0);
    expect(decided).toBeGreaterThan(0);
    expect(content).toMatch(/D\.6/);
  });

  it("TODOS En cours contient B2-D.6 et PILOTAGE-UI-04", () => {
    if (!fs.existsSync(todosPath)) return;
    const content = fs.readFileSync(todosPath, "utf8");
    expect(content).toMatch(/PILOTAGE-UI-04/);
    expect(content).toMatch(/B2-D\.6/);
    const tables = parseMarkdownTables(content);
    const enCours = tables.filter(
      (t) => /en cours/i.test(t.section) || /maintenant/i.test(t.section),
    );
    expect(enCours.length).toBeGreaterThan(0);
  });
});
