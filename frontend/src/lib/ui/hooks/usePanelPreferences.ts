"use client";

import { useCallback } from "react";
import { useUiPreferences } from "../UiPreferencesContext";
import {
  defaultAnalyticsPanel,
  defaultStatisticsPanel,
  type AnalyticsPanelSettings,
  type StatisticsPanelSettings,
} from "../preferences/panels";

export function useStatisticsPanelPrefs() {
  const { panels, isLoading, savePanelPreferences } = useUiPreferences();

  const updateCustomization = useCallback(
    (updates: Partial<StatisticsPanelSettings>) => {
      savePanelPreferences("statistics", updates);
    },
    [savePanelPreferences],
  );

  const resetCustomization = useCallback(() => {
    savePanelPreferences("statistics", defaultStatisticsPanel);
  }, [savePanelPreferences]);

  return {
    customization: panels.statistics,
    isLoading,
    updateCustomization,
    resetCustomization,
  };
}

export function useAnalyticsPanelPrefs() {
  const { panels, isLoading, savePanelPreferences } = useUiPreferences();

  const updateCustomization = useCallback(
    (updates: Partial<AnalyticsPanelSettings>) => {
      savePanelPreferences("analytics", updates);
    },
    [savePanelPreferences],
  );

  const resetCustomization = useCallback(() => {
    savePanelPreferences("analytics", defaultAnalyticsPanel);
  }, [savePanelPreferences]);

  return {
    customization: panels.analytics,
    isLoading,
    updateCustomization,
    resetCustomization,
  };
}
