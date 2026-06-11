import { CATEGORIES, RUN_API, RUNNABLE_IDS } from "../testsCatalog";

describe("testsCatalog", () => {
  it("expose la suite Agent email / triage comme suite lançable", () => {
    expect(RUNNABLE_IDS).toContain("email-triage");
    expect(RUN_API["email-triage"]).toBe("/api/test/run-email-triage");
    expect(CATEGORIES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "email-triage",
          name: "Agent email / triage",
          href: "/b4ck0ff1ce/test-reports",
        }),
      ]),
    );
  });

  it("garantit que chaque suite lançable a un endpoint API déclaré", () => {
    for (const id of RUNNABLE_IDS) {
      expect(RUN_API[id]).toBeTruthy();
    }
  });
});
