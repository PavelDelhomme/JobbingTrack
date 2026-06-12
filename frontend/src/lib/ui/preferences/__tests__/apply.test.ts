import { applyCustomizationToDom } from "../apply";
import { mergeCustomizationSettings } from "../customization";

describe("applyCustomizationToDom — thème", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.body.className = "";
  });

  it("persiste dark via setStoredTheme quand customization.theme=dark", () => {
    applyCustomizationToDom(
      mergeCustomizationSettings({
        theme: "dark",
      }),
    );

    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("mappe auto vers system sans perdre dark déjà choisi via bouton", () => {
    localStorage.setItem("theme", "dark");
    localStorage.setItem(
      "jobbingtrack-ui-preferences-v1",
      JSON.stringify({
        theme: "dark",
        customization: { theme: "dark" },
      }),
    );

    applyCustomizationToDom(
      mergeCustomizationSettings({
        theme: "auto",
      }),
    );

    expect(localStorage.getItem("theme")).toBe("system");
    expect(
      JSON.parse(
        localStorage.getItem("jobbingtrack-ui-preferences-v1") || "{}",
      ).customization.theme,
    ).toBe("auto");
  });
});
