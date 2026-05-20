/**
 * Préférences d’affichage par page (Statistics, Analytics) — schéma global v1.
 */

export type StatisticsTimeRange = "1h" | "6h" | "24h" | "7d" | "30d";

export interface StatisticsPanelSettings {
  showApplications: boolean;
  showUsers: boolean;
  showCompanies: boolean;
  showPerformance: boolean;
  showSystem: boolean;
  showServices: boolean;
  showNetwork: boolean;
  showSecurity: boolean;
  showTimeline: boolean;
  timeRange: StatisticsTimeRange;
  viewType: "cards" | "charts" | "table";
  chartType: "line" | "bar" | "area";
}

export interface AnalyticsPanelSettings {
  showPerformance: boolean;
  showErrors: boolean;
  showTimeline: boolean;
  showDeveloper: boolean;
  showSecurity: boolean;
  viewType: "cards" | "charts" | "table";
  chartType: "bar" | "pie" | "line";
}

export interface UiPanelsSettings {
  statistics: StatisticsPanelSettings;
  analytics: AnalyticsPanelSettings;
}

export const defaultStatisticsPanel: StatisticsPanelSettings = {
  showApplications: true,
  showUsers: true,
  showCompanies: true,
  showPerformance: true,
  showSystem: true,
  showServices: true,
  showNetwork: true,
  showSecurity: true,
  showTimeline: true,
  timeRange: "24h",
  viewType: "charts",
  chartType: "line",
};

export const defaultAnalyticsPanel: AnalyticsPanelSettings = {
  showPerformance: true,
  showErrors: true,
  showTimeline: true,
  showDeveloper: false,
  showSecurity: false,
  viewType: "cards",
  chartType: "bar",
};

export const defaultUiPanels: UiPanelsSettings = {
  statistics: defaultStatisticsPanel,
  analytics: defaultAnalyticsPanel,
};

export const LEGACY_STATISTICS_PANEL_KEY = "statistics-customization";
export const LEGACY_ANALYTICS_PANEL_KEY = "analytics-customization";

export function mergeStatisticsPanel(
  partial?: Partial<StatisticsPanelSettings> | null,
): StatisticsPanelSettings {
  return { ...defaultStatisticsPanel, ...(partial || {}) };
}

export function mergeAnalyticsPanel(
  partial?: Partial<AnalyticsPanelSettings> | null,
): AnalyticsPanelSettings {
  return { ...defaultAnalyticsPanel, ...(partial || {}) };
}

export function mergeUiPanels(
  partial?: Partial<UiPanelsSettings> | null,
): UiPanelsSettings {
  const p = partial || {};
  return {
    statistics: mergeStatisticsPanel(p.statistics),
    analytics: mergeAnalyticsPanel(p.analytics),
  };
}

/** Importe les clés localStorage legacy puis les retire. */
export function migrateLegacyPanelStorage(
  base: UiPanelsSettings = defaultUiPanels,
): UiPanelsSettings {
  if (typeof window === "undefined") return mergeUiPanels(base);
  let panels = mergeUiPanels(base);
  try {
    const statsRaw = localStorage.getItem(LEGACY_STATISTICS_PANEL_KEY);
    if (statsRaw) {
      panels = {
        ...panels,
        statistics: mergeStatisticsPanel(JSON.parse(statsRaw)),
      };
      localStorage.removeItem(LEGACY_STATISTICS_PANEL_KEY);
    }
    const analyticsRaw = localStorage.getItem(LEGACY_ANALYTICS_PANEL_KEY);
    if (analyticsRaw) {
      panels = {
        ...panels,
        analytics: mergeAnalyticsPanel(JSON.parse(analyticsRaw)),
      };
      localStorage.removeItem(LEGACY_ANALYTICS_PANEL_KEY);
    }
  } catch {
    /* ignore corrupt JSON */
  }
  return panels;
}
