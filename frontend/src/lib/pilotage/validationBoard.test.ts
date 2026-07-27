import {
  checklistProgress,
  deriveCycleStatus,
  mergeWithMdAndSeed,
  statusFromMdDecision,
} from "./validationBoard";
import { buildSeedValidationBoard } from "./validationBoardSeed";
import type { ValidationTask } from "./validationBoardTypes";

function miniTask(
  status: ValidationTask["status"],
  checklistDone = 0,
  checklistTotal = 0,
): ValidationTask {
  return {
    id: "T",
    section: "s",
    label: "l",
    description: "d",
    expected: "e",
    status,
    order: 1,
    checklist: Array.from({ length: checklistTotal }, (_, i) => ({
      id: `c${i}`,
      label: `c${i}`,
      done: i < checklistDone,
    })),
    porteurNote: "",
    history: [],
  };
}

describe("validationBoard", () => {
  it("dérive le statut de cycle", () => {
    expect(deriveCycleStatus([miniTask("ok"), miniTask("ok")])).toBe("ok");
    expect(deriveCycleStatus([miniTask("ok"), miniTask("ko")])).toBe("rework");
    expect(deriveCycleStatus([miniTask("ok"), miniTask("open")])).toBe(
      "partial",
    );
    expect(deriveCycleStatus([miniTask("deferred"), miniTask("deferred")])).toBe(
      "deferred",
    );
    expect(deriveCycleStatus([miniTask("open"), miniTask("open")])).toBe(
      "open",
    );
  });

  it("parse décisions md étendues", () => {
    expect(statusFromMdDecision("**OK 22/07**")).toBe("ok");
    expect(statusFromMdDecision("PARTIEL 22/07")).toBe("partial");
    expect(statusFromMdDecision("PLUS TARD")).toBe("deferred");
    expect(statusFromMdDecision("REWORK")).toBe("rework");
    expect(statusFromMdDecision("")).toBeNull();
  });

  it("checklist progress", () => {
    const t = miniTask("open", 1, 3);
    const p = checklistProgress(t);
    expect(p.done).toBe(1);
    expect(p.anyDone).toBe(true);
    expect(p.allDone).toBe(false);
  });

  it("seed + merge conserve les tâches et cycles FAB", () => {
    const seed = buildSeedValidationBoard();
    expect(seed.cycles.find((c) => c.id === "fab-mobile")?.itemIds).toEqual([
      "D.6",
      "D.7",
      "D.8",
      "D.9",
    ]);
    const merged = mergeWithMdAndSeed(seed, `| ID | À faire | Décision | Notes |
|----|---------|----------|-------|
| **D.7** | FAB Appel | **PLUS TARD 22/07** | reporté |
`);
    expect(merged.tasks["D.7"].status).toBe("deferred");
    expect(merged.tasks["D.6"].status).toBe("open");
    expect(merged.tasks["MOB-ENT-01"].checklist.length).toBeGreaterThan(1);
  });
});
