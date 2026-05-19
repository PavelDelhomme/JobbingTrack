import { useState, useEffect, useCallback } from "react";
import { FRONTEND_URLS } from "@/config/ports.config";

export interface CustomizationSettings {
  // Thème général
  theme: "light" | "dark" | "auto";
  primaryColor: string;
  accentColor: string;

  // Layout
  sidebarCollapsed: boolean;
  compactMode: boolean;
  showAnimations: boolean;

  // Dashboard
  dashboardLayout: "grid" | "list" | "kanban";
  defaultView: string;
  itemsPerPage: number;

  // Recherche
  searchFilters: {
    defaultModules: string[];
    autoComplete: boolean;
    highlightResults: boolean;
  };

  // Notifications
  notifications: {
    enabled: boolean;
    sound: boolean;
    position: "top-right" | "top-left" | "bottom-right" | "bottom-left";
    duration: number;
  };

  // Accessibilité
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    reduceMotion: boolean;
    focusIndicators: boolean;
  };

  // Préférences linguistiques
  language: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";

  // Données et confidentialité
  dataRetention: {
    cacheDuration: number;
    syncFrequency: number;
    offlineMode: boolean;
  };
}

export const defaultSettings: CustomizationSettings = {
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
    offlineMode: true,
  },
};

/** Fusion profonde avec les valeurs par défaut (évite undefined en UI). */
export function mergeCustomizationSettings(
  partial?: Partial<CustomizationSettings> | Record<string, unknown> | null,
): CustomizationSettings {
  const p = (partial || {}) as Partial<CustomizationSettings>;
  return {
    ...defaultSettings,
    ...p,
    searchFilters: {
      ...defaultSettings.searchFilters,
      ...(p.searchFilters || {}),
    },
    notifications: {
      ...defaultSettings.notifications,
      ...(p.notifications || {}),
    },
    accessibility: {
      ...defaultSettings.accessibility,
      ...(p.accessibility || {}),
    },
    dataRetention: {
      ...defaultSettings.dataRetention,
      ...(p.dataRetention || {}),
    },
  };
}

const CUSTOMIZATION_CSS_VARS = [
  "--primary-color",
  "--accent-color",
  "--primary-50",
  "--primary-100",
  "--primary-200",
  "--primary-300",
  "--primary-400",
  "--primary-500",
  "--primary-600",
  "--primary-700",
  "--primary-800",
  "--primary-900",
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

function applyAllSettings(settings: CustomizationSettings) {
  applyTheme(settings);
  applyCustomColors(settings);
  applyAccessibility(settings);
  applyAnimations(settings);
  applyLayout(settings);
  applyNotifications(settings);
  applyLanguage(settings);
}

export function useCustomization() {
  const [settings, setSettings] =
    useState<CustomizationSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          try {
            const apiUrl = FRONTEND_URLS.api;
            const response = await fetch(
              `${apiUrl}/api/v1/users/customization`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                signal: AbortSignal.timeout(3000),
              },
            );

            if (response.ok) {
              const userSettings = await response.json();
              const payload =
                userSettings.success && userSettings.customization
                  ? userSettings.customization
                  : userSettings;
              setSettings(mergeCustomizationSettings(payload));
              setIsLoading(false);
              return;
            }
            if (response.status !== 404) {
              console.error(
                `Erreur ${response.status} lors du chargement des paramètres utilisateur:`,
                response.statusText,
              );
            }
          } catch (error) {
            console.warn(
              "Erreur réseau lors du chargement des paramètres utilisateur, utilisation du localStorage:",
              error,
            );
          }
        }

        const storedSettings = localStorage.getItem("customization-settings");
        if (storedSettings) {
          try {
            const parsedSettings = JSON.parse(storedSettings);
            setSettings(mergeCustomizationSettings(parsedSettings));
          } catch (error) {
            console.error("Erreur parsing paramètres localStorage:", error);
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des paramètres:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const saveSettings = async (
    newSettings: Partial<CustomizationSettings>,
  ) => {
    const updatedSettings = mergeCustomizationSettings({
      ...settings,
      ...newSettings,
    });
    setSettings(updatedSettings);

    try {
      localStorage.setItem(
        "customization-settings",
        JSON.stringify(updatedSettings),
      );

      const token = localStorage.getItem("token");
      if (token) {
        try {
          const response = await fetch(
            `${FRONTEND_URLS.api}/api/v1/users/customization`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(updatedSettings),
              signal: AbortSignal.timeout(3000),
            },
          );

          if (response.status === 404) {
            console.warn(
              "Endpoint de personnalisation non disponible pour la sauvegarde (404)",
            );
          } else if (!response.ok) {
            console.error(
              `Erreur ${response.status} lors de la sauvegarde des paramètres utilisateur:`,
              response.statusText,
            );
          }
        } catch (error) {
          console.warn(
            "Erreur réseau lors de la sauvegarde des paramètres utilisateur (ignorée):",
            error,
          );
        }
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des paramètres:", error);
    }
  };

  const resetSettings = useCallback(async (): Promise<CustomizationSettings> => {
    const fresh = mergeCustomizationSettings({});
    clearCustomizationDomOverrides();
    setSettings(fresh);
    localStorage.setItem("customization-settings", JSON.stringify(fresh));

    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch(`${FRONTEND_URLS.api}/api/v1/users/customization`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fresh),
          signal: AbortSignal.timeout(3000),
        });
      } catch {
        /* local reset suffit */
      }
    }

    applyAllSettings(fresh);
    return fresh;
  }, []);

  useEffect(() => {
    if (isLoading) return;
    applyAllSettings(settings);
  }, [settings, isLoading]);

  return {
    settings,
    isLoading,
    saveSettings,
    resetSettings,
  };
}

// Fonction pour appliquer le thème
function applyTheme(settings: CustomizationSettings) {
  const root = document.documentElement;

  const applyDarkMode = () => {
    if (
      settings.theme === "dark" ||
      (settings.theme === "auto" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  applyDarkMode();

  if (settings.theme === "auto") {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyDarkMode();
    mediaQuery.removeEventListener("change", handleChange);
    mediaQuery.addEventListener("change", handleChange);
  }
}

function applyCustomColors(settings: CustomizationSettings) {
  const root = document.documentElement;
  if (!/^#[0-9A-Fa-f]{6}$/.test(settings.primaryColor)) return;
  if (!/^#[0-9A-Fa-f]{6}$/.test(settings.accentColor)) return;

  root.style.setProperty("--primary-color", settings.primaryColor);
  root.style.setProperty("--accent-color", settings.accentColor);

  const primaryRgb = hexToRgb(settings.primaryColor);
  if (primaryRgb) {
    root.style.setProperty(
      "--primary-500",
      settings.primaryColor,
    );
    root.style.setProperty(
      "--primary-600",
      adjustColor(settings.primaryColor, -20),
    );
  }
}

function applyAccessibility(settings: CustomizationSettings) {
  const root = document.documentElement;

  if (settings.accessibility.highContrast) {
    root.classList.add("high-contrast");
  } else {
    root.classList.remove("high-contrast");
  }

  if (settings.accessibility.largeText) {
    root.classList.add("large-text");
  } else {
    root.classList.remove("large-text");
  }

  if (settings.accessibility.reduceMotion) {
    root.classList.add("reduce-motion");
    root.style.setProperty("--animation-duration", "0.01ms");
  } else {
    root.classList.remove("reduce-motion");
    root.style.removeProperty("--animation-duration");
  }
}

function applyAnimations(settings: CustomizationSettings) {
  const root = document.documentElement;

  if (settings.showAnimations) {
    root.classList.add("animations-enabled");
  } else {
    root.classList.remove("animations-enabled");
  }
}

function applyLayout(settings: CustomizationSettings) {
  const root = document.documentElement;

  if (settings.compactMode) {
    root.classList.add("compact-mode");
  } else {
    root.classList.remove("compact-mode");
  }

  if (settings.sidebarCollapsed) {
    root.classList.add("sidebar-collapsed");
  } else {
    root.classList.remove("sidebar-collapsed");
  }

  root.setAttribute("data-dashboard-layout", settings.dashboardLayout);
  root.style.setProperty("--items-per-page", String(settings.itemsPerPage));
}

function applyNotifications(settings: CustomizationSettings) {
  const root = document.documentElement;
  const duration =
    typeof settings.notifications.duration === "number"
      ? settings.notifications.duration
      : defaultSettings.notifications.duration;

  if (settings.notifications.enabled) {
    root.classList.add("notifications-enabled");
  } else {
    root.classList.remove("notifications-enabled");
  }

  root.setAttribute(
    "data-notification-position",
    settings.notifications.position || defaultSettings.notifications.position,
  );
  root.style.setProperty("--notification-duration", `${duration}ms`);

  if (settings.notifications.sound) {
    root.classList.add("notification-sound-enabled");
  } else {
    root.classList.remove("notification-sound-enabled");
  }
}

function applyLanguage(settings: CustomizationSettings) {
  const root = document.documentElement;

  root.setAttribute("lang", settings.language || defaultSettings.language);
  root.setAttribute(
    "data-date-format",
    settings.dateFormat || defaultSettings.dateFormat,
  );
  root.setAttribute(
    "data-time-format",
    settings.timeFormat || defaultSettings.timeFormat,
  );
  root.style.setProperty(
    "--cache-duration",
    `${settings.dataRetention.cacheDuration}d`,
  );
  root.style.setProperty(
    "--sync-frequency",
    `${settings.dataRetention.syncFrequency}m`,
  );

  if (settings.dataRetention.offlineMode) {
    root.classList.add("offline-mode");
  } else {
    root.classList.remove("offline-mode");
  }
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function adjustColor(color: string, amount: number) {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const adjusted = {
    r: Math.max(0, Math.min(255, rgb.r + amount)),
    g: Math.max(0, Math.min(255, rgb.g + amount)),
    b: Math.max(0, Math.min(255, rgb.b + amount)),
  };

  return `rgb(${adjusted.r}, ${adjusted.g}, ${adjusted.b})`;
}
