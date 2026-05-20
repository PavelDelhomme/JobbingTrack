/**
 * Pont legacy → moteur UI (`UiPreferencesProvider`).
 * @deprecated Préférer `useUiPreferences` depuis `@/lib/ui`.
 */
import { useCallback } from "react";
import { useUiPreferences } from "@/lib/ui/UiPreferencesContext";

export type {
  CustomizationSettings,
} from "@/lib/ui/preferences/customization";

export {
  defaultCustomizationSettings as defaultSettings,
  mergeCustomizationSettings,
  clearCustomizationDomOverrides,
} from "@/lib/ui/preferences/customization";

export function useCustomization() {
  const { customization, isLoading, saveCustomization, resetAll } =
    useUiPreferences();

  const saveSettings = useCallback(
    async (patch: Parameters<typeof saveCustomization>[0]) => {
      await saveCustomization(patch);
    },
    [saveCustomization],
  );

  const resetSettings = useCallback(async () => resetAll(), [resetAll]);

  return {
    settings: customization,
    isLoading,
    saveSettings,
    resetSettings,
  };
}
