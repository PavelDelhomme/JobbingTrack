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
  buildPreferencesV1,
  loadInitialPreferences,
  persistV1,
} from "./preferences/storage";
import type { UserUiPreferencesV1 } from "./preferences/schema";
import {
  mergeAnalyticsPanel,
  mergeStatisticsPanel,
  type AnalyticsPanelSettings,
  type StatisticsPanelSettings,
  type UiPanelsSettings,
} from "./preferences/panels";

export type PanelScope = keyof UiPanelsSettings;

export interface UiPreferencesContextValue {
  preferences: UserUiPreferencesV1;
  customization: CustomizationSettings;
  panels: UiPanelsSettings;
  isLoading: boolean;
  saveCustomization: (
    patch: Partial<CustomizationSettings> | CustomizationSettings,
  ) => Promise<CustomizationSettings>;
  savePanelPreferences: <S extends PanelScope>(
    scope: S,
    patch: S extends "statistics"
      ? Partial<StatisticsPanelSettings>
      : Partial<AnalyticsPanelSettings>,
  ) => Promise<UiPanelsSettings>;
  resetAll: () => Promise<CustomizationSettings>;
}

const UiPreferencesContext = createContext<UiPreferencesContextValue | null>(
  null,
);

async function loadInitial(): Promise<{
  customization: CustomizationSettings;
  panels: UiPanelsSettings;
}> {
  const { customization: initialCustomization, panels } =
    loadInitialPreferences();
  const remote = await fetchRemoteCustomization();
  const customization = mergeRemoteCustomization(initialCustomization, remote);
  const prefs = buildPreferencesV1(customization, panels);
  persistV1(prefs);
  return { customization: prefs.customization, panels: prefs.panels };
}

export function UiPreferencesProvider({ children }: { children: ReactNode }) {
  const [customization, setCustomization] = useState<CustomizationSettings>(
    defaultCustomizationSettings,
  );
  const [panels, setPanels] = useState<UiPanelsSettings>(
    () => loadInitialPreferences().panels,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    clearLegacyUiDomOverrides();
    let cancelled = false;

    (async () => {
      const loaded = await loadInitial();
      if (cancelled) return;
      setCustomization(loaded.customization);
      setPanels(loaded.panels);
      applyCustomizationToDom(loaded.customization);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const preferences = useMemo((): UserUiPreferencesV1 => {
    const v1 = buildPreferencesV1(customization, panels);
    if (!isLoading) persistV1(v1);
    return v1;
  }, [customization, panels, isLoading]);

  const saveCustomization = useCallback(
    async (
      patch: Partial<CustomizationSettings> | CustomizationSettings,
    ): Promise<CustomizationSettings> => {
      const next = mergeCustomizationSettings({
        ...customization,
        ...(patch as Partial<CustomizationSettings>),
      });
      setCustomization(next);
      persistV1(buildPreferencesV1(next, panels));
      applyCustomizationToDom(next);
      await saveRemoteCustomization(next as unknown as Record<string, unknown>);
      return next;
    },
    [customization, panels],
  );

  const savePanelPreferences = useCallback(
    async <S extends PanelScope>(
      scope: S,
      patch: S extends "statistics"
        ? Partial<StatisticsPanelSettings>
        : Partial<AnalyticsPanelSettings>,
    ): Promise<UiPanelsSettings> => {
      const nextPanels: UiPanelsSettings =
        scope === "statistics"
          ? {
              ...panels,
              statistics: mergeStatisticsPanel({
                ...panels.statistics,
                ...(patch as Partial<StatisticsPanelSettings>),
              }),
            }
          : {
              ...panels,
              analytics: mergeAnalyticsPanel({
                ...panels.analytics,
                ...(patch as Partial<AnalyticsPanelSettings>),
              }),
            };
      setPanels(nextPanels);
      persistV1(buildPreferencesV1(customization, nextPanels));
      return nextPanels;
    },
    [customization, panels],
  );

  const resetAll = useCallback(async (): Promise<CustomizationSettings> => {
    const fresh = mergeCustomizationSettings({});
    clearCustomizationDomOverrides();
    clearLegacyUiDomOverrides();
    setCustomization(fresh);
    persistV1(buildPreferencesV1(fresh, panels));
    applyCustomizationToDom(fresh);
    await saveRemoteCustomization(fresh as unknown as Record<string, unknown>);
    return fresh;
  }, [panels]);

  const value = useMemo(
    () => ({
      preferences,
      customization,
      panels,
      isLoading,
      saveCustomization,
      savePanelPreferences,
      resetAll,
    }),
    [
      preferences,
      customization,
      panels,
      isLoading,
      saveCustomization,
      savePanelPreferences,
      resetAll,
    ],
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
    throw new Error(
      "useUiPreferences must be used within UiPreferencesProvider",
    );
  }
  return ctx;
}
