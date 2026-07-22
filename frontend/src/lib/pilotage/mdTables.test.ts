import {
  findRowById,
  parseMarkdownTables,
  replaceTableRow,
  stripMdBold,
} from "./mdTables";

describe("pilotage mdTables", () => {
  const sample = `# Titre

## Section A

| ID | À faire | Décision | Notes |
|----|---------|----------|-------|
| **MOB-1** | Voir liste | | note a |
| D.6 | FAB Relance | | |

## Autre

Pas un tableau.
`;

  it("parse les tableaux GFM avec section", () => {
    const tables = parseMarkdownTables(sample);
    expect(tables).toHaveLength(1);
    expect(tables[0].section).toBe("Section A");
    expect(tables[0].headers[0]).toBe("ID");
    expect(tables[0].rows).toHaveLength(2);
    expect(stripMdBold(tables[0].rows[0][0])).toBe("MOB-1");
  });

  it("remplace une ligne et trouve par id", () => {
    const tables = parseMarkdownTables(sample);
    const found = findRowById(tables[0], ["D.6"]);
    expect(found?.rowIndex).toBe(1);
    const next = replaceTableRow(sample, tables[0], found!.rowIndex, [
      "D.6",
      "FAB Relance",
      "**OK 22/07**",
      "porteur UI",
    ]);
    expect(next).toContain("| D.6 | FAB Relance | **OK 22/07** | porteur UI |");
  });
});
