import {
  defaultUiPreferencesV1,
  UI_PREFERENCES_VERSION,
  type UserUiPreferencesV1,
} from "./schema";
import {
  mergeCustomizationSettings,
  type CustomizationSettings,
} from "./customization";
import {
  mergeUiPanels,
  migrateLegacyPanelStorage,
  type UiPanelsSettings,
} from "./panels";

export const UI_PREFERENCES_STORAGE_KEY = "jobbingtrack-ui-preferences-v1";
export const LEGACY_CUSTOMIZATION_KEY = "customization-settings";

export function buildPreferencesV1(
  customization: CustomizationSettings,
  panels: UiPanelsSettings,
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
    customization: mergeCustomizationSettings(customization),
    panels: mergeUiPanels(panels),
  };
}

/** @deprecated Utiliser buildPreferencesV1 */
export function customizationToV1(
  customization: CustomizationSettings,
  panels?: UiPanelsSettings,
): UserUiPreferencesV1 {
  return buildPreferencesV1(
    customization,
    panels ?? defaultUiPreferencesV1.panels,
  );
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
      panels: mergeUiPanels(parsed.panels),
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

export function persistV1(prefs: UserUiPreferencesV1): UserUiPreferencesV1 {
  const v1 = {
    ...defaultUiPreferencesV1,
    ...prefs,
    customization: mergeCustomizationSettings(prefs.customization),
    panels: mergeUiPanels(prefs.panels),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(v1));
    localStorage.setItem(
      LEGACY_CUSTOMIZATION_KEY,
      JSON.stringify(v1.customization),
    );
  }
  return v1;
}

export function persistPreferences(
  customization: CustomizationSettings,
  panels: UiPanelsSettings = defaultUiPreferencesV1.panels,
): UserUiPreferencesV1 {
  return persistV1(buildPreferencesV1(customization, panels));
}

export function loadInitialPreferences(): {
  customization: CustomizationSettings;
  panels: UiPanelsSettings;
} {
  const v1 = readV1FromLocalStorage();
  const customization =
    v1?.customization ??
    readLegacyCustomization() ??
    mergeCustomizationSettings({});
  const panels = migrateLegacyPanelStorage(
    v1?.panels ?? defaultUiPreferencesV1.panels,
  );
  return { customization, panels };
}
