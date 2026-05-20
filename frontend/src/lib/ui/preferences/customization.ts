/**
 * Paramètres étendus (page Paramètres) — source partagée moteur UI + legacy hook.
 */

export interface CustomizationSettings {
  theme: "light" | "dark" | "auto";
  primaryColor: string;
  accentColor: string;
  sidebarCollapsed: boolean;
  compactMode: boolean;
  showAnimations: boolean;
  dashboardLayout: "grid" | "list" | "kanban";
  defaultView: string;
  itemsPerPage: number;
  searchFilters: {
    defaultModules: string[];
    autoComplete: boolean;
    highlightResults: boolean;
  };
  notifications: {
    enabled: boolean;
    sound: boolean;
    position: "top-right" | "top-left" | "bottom-right" | "bottom-left";
    duration: number;
  };
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    reduceMotion: boolean;
    focusIndicators: boolean;
  };
  language: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  dataRetention: {
    cacheDuration: number;
    syncFrequency: number;
    offlineMode: boolean;
  };
}

export const defaultCustomizationSettings: CustomizationSettings = {
  theme: "auto",
  primaryColor: "#3B82F6",
  accentColor: "#10B981",
  sidebarCollapsed: false,
  compactMode: false,
  showAnimations: true,
  dashboardLayout: "grid",
  defaultView: "dashboard",
  itemsPerPage: 20,
  searchFilters: {
    defaultModules: ["applications", "companies", "contacts"],
    autoComplete: true,
    highlightResults: true,
  },
  notifications: {
    enabled: true,
    sound: true,
    position: "top-right",
    duration: 5000,
  },
  accessibility: {
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    focusIndicators: true,
  },
  language: "fr",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "24h",
  dataRetention: {
    cacheDuration: 7,
    syncFrequency: 5,
    offlineMode: false,
  },
};

export function mergeCustomizationSettings(
  partial?: Partial<CustomizationSettings> | Record<string, unknown> | null,
): CustomizationSettings {
  const p = (partial || {}) as Partial<CustomizationSettings>;
  return {
    ...defaultCustomizationSettings,
    ...p,
    searchFilters: {
      ...defaultCustomizationSettings.searchFilters,
      ...(p.searchFilters || {}),
    },
    notifications: {
      ...defaultCustomizationSettings.notifications,
      ...(p.notifications || {}),
    },
    accessibility: {
      ...defaultCustomizationSettings.accessibility,
      ...(p.accessibility || {}),
    },
    dataRetention: {
      ...defaultCustomizationSettings.dataRetention,
      ...(p.dataRetention || {}),
    },
  };
}

const CUSTOMIZATION_CSS_VARS = [
  "--primary-color",
  "--accent-color",
  "--primary-500",
  "--primary-600",
  "--animation-duration",
  "--items-per-page",
  "--notification-duration",
  "--cache-duration",
  "--sync-frequency",
];

const CUSTOMIZATION_CLASSES = [
  "high-contrast",
  "large-text",
  "reduce-motion",
  "animations-enabled",
  "compact-mode",
  "sidebar-collapsed",
  "notifications-enabled",
  "notification-sound-enabled",
  "offline-mode",
];

export function clearCustomizationDomOverrides() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  CUSTOMIZATION_CSS_VARS.forEach((name) => root.style.removeProperty(name));
  CUSTOMIZATION_CLASSES.forEach((cls) => root.classList.remove(cls));
  root.removeAttribute("data-dashboard-layout");
  root.removeAttribute("data-notification-position");
  root.removeAttribute("data-date-format");
  root.removeAttribute("data-time-format");
}
