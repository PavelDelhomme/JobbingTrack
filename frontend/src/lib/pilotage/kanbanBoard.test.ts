import { buildKanbanColumns } from "./kanbanBoard";
import type { ValidationBoardFile } from "./validationBoardTypes";

describe("kanban ADHD", () => {
  const board: ValidationBoardFile = {
    version: 1,
    updatedAt: new Date().toISOString(),
    focusTaskId: "A",
    cycles: [],
    tasks: {
      A: {
        id: "A",
        section: "t",
        label: "Focus",
        description: "d",
        expected: "e",
        status: "open",
        column: "doing",
        order: 1,
        checklist: [],
        porteurNote: "",
        history: [],
      },
      B: {
        id: "B",
        section: "t",
        label: "Backlog",
        description: "d",
        expected: "e",
        status: "open",
        order: 2,
        checklist: [],
        porteurNote: "",
        history: [],
      },
      C: {
        id: "C",
        section: "t",
        label: "Later",
        description: "d",
        expected: "e",
        status: "deferred",
        order: 3,
        checklist: [],
        porteurNote: "",
        history: [],
      },
    },
  };

  it("met le focus seul en doing ; open sans focus → backlog", () => {
    const { columns, focus } = buildKanbanColumns(board);
    const doing = columns.find((c) => c.id === "doing")!;
    const backlog = columns.find((c) => c.id === "backlog")!;
    const later = columns.find((c) => c.id === "later")!;
    expect(doing.cards.map((c) => c.id)).toEqual(["A"]);
    expect(backlog.cards.map((c) => c.id)).toEqual(["B"]);
    expect(later.cards.map((c) => c.id)).toEqual(["C"]);
    expect(focus?.id).toBe("A");
  });

  it("WIP=1 : dégrade le 2e doing vers backlog", () => {
    const b2: ValidationBoardFile = {
      ...board,
      focusTaskId: "A",
      tasks: {
        ...board.tasks,
        D: {
          ...board.tasks.A,
          id: "D",
          label: "Extra",
          column: "doing",
          order: 0,
        },
      },
    };
    const { columns } = buildKanbanColumns(b2);
    const doing = columns.find((c) => c.id === "doing")!;
    expect(doing.cards).toHaveLength(1);
    expect(doing.cards[0].id).toBe("A");
  });
});
