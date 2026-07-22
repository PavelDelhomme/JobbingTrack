import {
  mergeTerminesChrono,
  parseFrDateToIso,
  parseRecentDoneSection,
  parseTodosDoneTable,
  parseValiderDecided,
  renumberAndCapRecentDone,
  type TermineItem,
} from "./termines";

describe("termines — dates FR", () => {
  it("parseFrDateToIso 22/07 → 2026-07-22", () => {
    expect(parseFrDateToIso("22/07")).toBe("2026-07-22T12:00:00.000Z");
  });

  it("parseFrDateToIso avec année", () => {
    expect(parseFrDateToIso("10/06/2026")).toBe("2026-06-10T12:00:00.000Z");
  });
});

describe("termines — parseRecentDoneSection", () => {
  const md = `# TODOs

## Récemment terminé (max 1 catégorie + 3 sous-items)

### Mobile B2 — stabilisation shell / crash (22/07)

1. **OK** B2-B.3 USER drawer sans Administration
2. **OK** B2-B.4 Impersonnaliser → hub
3. **OK** B2-C.5 Relances sans crash

---

## ▶ En cours maintenant

| ID | Item |
|----|------|
| X | y |
`;

  it("extrait les OK datés du sous-titre", () => {
    const items = parseRecentDoneSection(md);
    expect(items).toHaveLength(3);
    expect(items[0].id).toBe("B2-B.3");
    expect(items[0].completedAtLabel).toBe("22/07");
    expect(items[0].completedAt).toBe("2026-07-22T12:00:00.000Z");
  });
});

describe("termines — parseTodosDoneTable", () => {
  const md = `# DONE

| Date | Élément validé | Environnement | Preuve / remarque |
|------|----------------|---------------|-------------------|
| 22/07/2026 | Mobile B2 — **B.3** USER drawer | Samsung | OK |
| 12/06/2026 | Mode sombre persistant | local | OK |
`;

  it("lit la table chronologique", () => {
    const items = parseTodosDoneTable(md);
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items[0].section).toBe("TODOS_DONE");
  });
});

describe("termines — parseValiderDecided", () => {
  const md = `# A_VALIDER

| Point | À faire | Décision | Notes |
|-------|---------|----------|-------|
| **D.6** | FAB Relance | | |
| D.7 | FAB Appel | **OK 22/07** | porteur |
| D.8 | FAB Entretien | **KO 21/07** | bug |
`;

  it("ne garde que OK/KO", () => {
    const items = parseValiderDecided(md);
    expect(items.map((i) => i.id).sort()).toEqual(["D.7", "D.8"]);
    expect(items.find((i) => i.id === "D.8")?.status).toBe("ko");
  });
});

describe("termines — merge chronologique", () => {
  it("dédoublonne par id (priorité premier groupe) et trie desc", () => {
    const a: TermineItem = {
      id: "X",
      source: "TODOS",
      section: "recent",
      label: "from recent",
      status: "ok",
      completedAt: "2026-07-22T12:00:00.000Z",
      completedAtLabel: "22/07",
    };
    const b: TermineItem = {
      id: "X",
      source: "TODOS",
      section: "DONE",
      label: "from done",
      status: "ok",
      completedAt: "2026-06-01T12:00:00.000Z",
      completedAtLabel: "01/06",
    };
    const c: TermineItem = {
      id: "Y",
      source: "TODOS",
      section: "DONE",
      label: "older",
      status: "ok",
      completedAt: "2026-05-01T12:00:00.000Z",
      completedAtLabel: "01/05",
    };
    const merged = mergeTerminesChrono([[a], [b, c]]);
    expect(merged.map((i) => i.id)).toEqual(["X", "Y"]);
    expect(merged[0].label).toBe("from recent");
  });
});

describe("termines — renumberAndCapRecentDone", () => {
  it("plafonne et renumérote", () => {
    let body = `## Récemment terminé

### Session

1. **OK** A one
2. **OK** B two
3. **OK** C three
4. **OK** D four

## Suite
`;
    body = renumberAndCapRecentDone(body, 2);
    const oks = body.match(/^\d+\.\s+\*\*OK\*\*/gm) || [];
    expect(oks).toHaveLength(2);
    expect(body).toContain("1. **OK** A one");
    expect(body).toContain("2. **OK** B two");
    expect(body).not.toContain("**OK** C three");
  });
});
