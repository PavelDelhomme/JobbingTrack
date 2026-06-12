import {
  applyTheme,
  getStoredTheme,
  setStoredTheme,
  type Theme,
} from "../theme";

describe("theme storage", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.body.className = "";
  });

  it("retourne dark par défaut sans entrée localStorage", () => {
    expect(getStoredTheme()).toBe("dark");
  });

  it("persiste le thème choisi dans localStorage.theme", () => {
    setStoredTheme("light");
    expect(localStorage.getItem("theme")).toBe("light");
    expect(getStoredTheme()).toBe("light");
  });

  it("synchronise jobbingtrack-ui-preferences-v1 sans écraser les autres champs", () => {
    localStorage.setItem(
      "jobbingtrack-ui-preferences-v1",
      JSON.stringify({
        theme: "system",
        customization: { theme: "auto", compactMode: true },
      }),
    );

    setStoredTheme("dark");

    const prefs = JSON.parse(
      localStorage.getItem("jobbingtrack-ui-preferences-v1") || "{}",
    );
    expect(prefs.theme).toBe("dark");
    expect(prefs.customization.theme).toBe("dark");
    expect(prefs.customization.compactMode).toBe(true);
  });

  it("synchronise customization-settings legacy", () => {
    localStorage.setItem(
      "customization-settings",
      JSON.stringify({ theme: "auto", itemsPerPage: 50 }),
    );

    setStoredTheme("light");

    const legacy = JSON.parse(
      localStorage.getItem("customization-settings") || "{}",
    );
    expect(legacy.theme).toBe("light");
    expect(legacy.itemsPerPage).toBe(50);
  });

  it("crée customization-settings si absent", () => {
    setStoredTheme("dark");
    const legacy = JSON.parse(
      localStorage.getItem("customization-settings") || "{}",
    );
    expect(legacy.theme).toBe("dark");
  });
});

describe("applyTheme", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.body.className = "";
  });

  it("applique les classes dark sur html et body", () => {
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
    expect(document.body.classList.contains("dark")).toBe(true);
  });

  it("applique les classes light et retire dark", () => {
    applyTheme("dark");
    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.body.classList.contains("light")).toBe(true);
  });

  it("résout system via prefers-color-scheme", () => {
    const matchMedia = jest.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("dark"),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        }) as MediaQueryList,
    );

    applyTheme("system");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    matchMedia.mockRestore();
  });
});

describe("persistance après refresh simulé", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.body.className = "";
  });

  it("relit dark après setStoredTheme puis rechargement simulé", () => {
    const themes: Theme[] = ["dark", "light"];
    for (const theme of themes) {
      localStorage.clear();
      setStoredTheme(theme);
      const reloaded = getStoredTheme();
      applyTheme(reloaded);
      const actual = reloaded === "system" ? "light" : reloaded;
      expect(document.documentElement.classList.contains(actual)).toBe(true);
      if (actual === "dark") {
        expect(document.documentElement.classList.contains("dark")).toBe(true);
      }
    }
  });
});
