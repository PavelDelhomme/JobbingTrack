"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clearLegacyUiDomOverrides } from "./preferences/dom";
import { applyCustomizationToDom } from "./preferences/apply";
import {
  defaultCustomizationSettings,
  clearCustomizationDomOverrides,
  mergeCustomizationSettings,
  type CustomizationSettings,
} from "./preferences/customization";
import {
  fetchRemoteCustomization,
  mergeRemoteCustomization,
  saveRemoteCustomization,
} from "./preferences/api";
import {
  customizationToV1,
  persistPreferences,
  readLegacyCustomization,
  readV1FromLocalStorage,
} from "./preferences/storage";
import type { UserUiPreferencesV1 } from "./preferences/schema";

export interface UiPreferencesContextValue {
  preferences: UserUiPreferencesV1;
  customization: CustomizationSettings;
  isLoading: boolean;
  saveCustomization: (
    patch: Partial<CustomizationSettings> | CustomizationSettings,
  ) => Promise<CustomizationSettings>;
  resetAll: () => Promise<CustomizationSettings>;
}

const UiPreferencesContext = createContext<UiPreferencesContextValue | null>(
  null,
);

async function loadInitialCustomization(): Promise<CustomizationSettings> {
  let base =
    readV1FromLocalStorage()?.customization ??
    readLegacyCustomization() ??
    mergeCustomizationSettings({});

  const remote = await fetchRemoteCustomization();
  base = mergeRemoteCustomization(base, remote);
  persistPreferences(base);
  return base;
}

export function UiPreferencesProvider({ children }: { children: ReactNode }) {
  const [customization, setCustomization] = useState<CustomizationSettings>(
    defaultCustomizationSettings,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    clearLegacyUiDomOverrides();
    let cancelled = false;

    (async () => {
      const loaded = await loadInitialCustomization();
      if (cancelled) return;
      setCustomization(loaded);
      applyCustomizationToDom(loaded);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const preferences = useMemo((): UserUiPreferencesV1 => {
    if (isLoading) return customizationToV1(customization);
    return persistPreferences(customization);
  }, [customization, isLoading]);

  const saveCustomization = useCallback(
    async (
      patch: Partial<CustomizationSettings> | CustomizationSettings,
    ): Promise<CustomizationSettings> => {
      const next = mergeCustomizationSettings({
        ...customization,
        ...(patch as Partial<CustomizationSettings>),
      });
      setCustomization(next);
      persistPreferences(next);
      applyCustomizationToDom(next);
      await saveRemoteCustomization(next as unknown as Record<string, unknown>);
      return next;
    },
    [customization],
  );

  const resetAll = useCallback(async (): Promise<CustomizationSettings> => {
    const fresh = mergeCustomizationSettings({});
    clearCustomizationDomOverrides();
    clearLegacyUiDomOverrides();
    setCustomization(fresh);
    persistPreferences(fresh);
    applyCustomizationToDom(fresh);
    await saveRemoteCustomization(fresh as unknown as Record<string, unknown>);
    return fresh;
  }, []);

  const value = useMemo(
    () => ({
      preferences,
      customization,
      isLoading,
      saveCustomization,
      resetAll,
    }),
    [preferences, customization, isLoading, saveCustomization, resetAll],
  );

  return (
    <UiPreferencesContext.Provider value={value}>
      {children}
    </UiPreferencesContext.Provider>
  );
}

export function useUiPreferences(): UiPreferencesContextValue {
  const ctx = useContext(UiPreferencesContext);
  if (!ctx) {
    throw new Error("useUiPreferences must be used within UiPreferencesProvider");
  }
  return ctx;
}
