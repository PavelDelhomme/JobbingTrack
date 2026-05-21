import {
  defaultCustomizationSettings,
  mergeCustomizationSettings,
} from "../customization";
import { customizationToV1, readV1FromLocalStorage } from "../storage";

describe("mergeCustomizationSettings", () => {
  it("garde les sous-objets par défaut si partiel", () => {
    const merged = mergeCustomizationSettings({
      notifications: { enabled: false },
    });
    expect(merged.notifications.enabled).toBe(false);
    expect(merged.notifications.duration).toBe(
      defaultCustomizationSettings.notifications.duration,
    );
  });

  it("accepte un patch vide comme reset logique", () => {
    const merged = mergeCustomizationSettings({});
    expect(merged.theme).toBe(defaultCustomizationSettings.theme);
    expect(merged.itemsPerPage).toBe(defaultCustomizationSettings.itemsPerPage);
  });
});

describe("customizationToV1", () => {
  it("mappe theme auto vers system", () => {
    const v1 = customizationToV1(mergeCustomizationSettings({ theme: "auto" }));
    expect(v1.theme).toBe("system");
    expect(v1.customization.theme).toBe("auto");
  });
});

describe("readV1FromLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("retourne null sans entrée", () => {
    expect(readV1FromLocalStorage()).toBeNull();
  });
});
