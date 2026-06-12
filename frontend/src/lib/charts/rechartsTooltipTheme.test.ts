import { rechartsTooltipProps } from "./rechartsTooltipTheme";

describe("rechartsTooltipProps", () => {
  it("laisse Recharts colorer chaque item avec la couleur de sa série", () => {
    expect(rechartsTooltipProps).not.toHaveProperty("itemStyle");
  });

  it("garde un fond lisible en clair et en sombre", () => {
    expect(rechartsTooltipProps.contentStyle).toMatchObject({
      backgroundColor: "hsl(var(--popover))",
      color: "hsl(var(--popover-foreground))",
    });
  });
});
