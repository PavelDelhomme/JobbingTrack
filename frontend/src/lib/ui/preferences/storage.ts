import {
  defaultUiPreferencesV1,
  UI_PREFERENCES_VERSION,
  type UserUiPreferencesV1,
} from "./schema";
import {
  mergeCustomizationSettings,
  type CustomizationSettings,
} from "./customization";

export const UI_PREFERENCES_STORAGE_KEY = "jobbingtrack-ui-preferences-v1";
export const LEGACY_CUSTOMIZATION_KEY = "customization-settings";

export function customizationToV1(
  customization: CustomizationSettings,
): UserUiPreferencesV1 {
  return {
    version: UI_PREFERENCES_VERSION,
    theme:
      customization.theme === "auto"
        ? "system"
        : customization.theme === "light"
          ? "light"
          : "dark",
    density: customization.compactMode ? "compact" : "comfortable",
    sidebarCollapsed: customization.sidebarCollapsed,
    primaryHex: customization.primaryColor,
    accentHex: customization.accentColor,
    accessibility: {
      highContrast: customization.accessibility.highContrast,
      largeText: customization.accessibility.largeText,
      reduceMotion: customization.accessibility.reduceMotion,
    },
    customization,
  };
}

export function readV1FromLocalStorage(): UserUiPreferencesV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(UI_PREFERENCES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserUiPreferencesV1;
    if (parsed?.version !== UI_PREFERENCES_VERSION) return null;
    return {
      ...defaultUiPreferencesV1,
      ...parsed,
      customization: mergeCustomizationSettings(parsed.customization),
    };
  } catch {
    return null;
  }
}

export function readLegacyCustomization(): CustomizationSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LEGACY_CUSTOMIZATION_KEY);
    if (!raw) return null;
    return mergeCustomizationSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function persistPreferences(
  customization: CustomizationSettings,
): UserUiPreferencesV1 {
  const v1 = customizationToV1(customization);
  if (typeof window !== "undefined") {
    localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(v1));
    localStorage.setItem(LEGACY_CUSTOMIZATION_KEY, JSON.stringify(customization));
  }
  return v1;
}
