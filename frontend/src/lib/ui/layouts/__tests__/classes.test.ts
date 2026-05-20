import {
  dashboardLayoutClassFor,
  dashboardMetricsLayoutClass,
} from "../classes";

describe("dashboard layout classes", () => {
  it("grid utilise une grille responsive 3 colonnes", () => {
    expect(dashboardMetricsLayoutClass("grid")).toContain("xl:grid-cols-3");
  });

  it("list empile verticalement", () => {
    expect(dashboardMetricsLayoutClass("list")).toContain("flex-col");
  });

  it("forVariant résout dense et split", () => {
    expect(dashboardLayoutClassFor("kanban", "dense")).toContain(
      "lg:grid-cols-3",
    );
    expect(dashboardLayoutClassFor("list", "split")).toContain("flex-col");
  });
});
