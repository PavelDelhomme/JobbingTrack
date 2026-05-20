import {
  applyTheme as applyDocumentTheme,
  setStoredTheme,
  type Theme,
} from "@/lib/hooks/theme";
import {
  defaultCustomizationSettings,
  type CustomizationSettings,
} from "./customization";

function syncThemeWithThemeProvider(settings: CustomizationSettings) {
  const mapped: Theme =
    settings.theme === "auto"
      ? "system"
      : settings.theme === "light"
        ? "light"
        : "dark";
  setStoredTheme(mapped);
  applyDocumentTheme(mapped);
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

/** Applique les paramètres au DOM (thème, couleurs, layout, a11y). */
export function applyCustomizationToDom(settings: CustomizationSettings) {
  syncThemeWithThemeProvider(settings);

  const root = document.documentElement;
  if (
    /^#[0-9A-Fa-f]{6}$/.test(settings.primaryColor) &&
    /^#[0-9A-Fa-f]{6}$/.test(settings.accentColor)
  ) {
    root.style.setProperty("--primary-color", settings.primaryColor);
    root.style.setProperty("--accent-color", settings.accentColor);
    if (hexToRgb(settings.primaryColor)) {
      root.style.setProperty("--primary-500", settings.primaryColor);
      root.style.setProperty(
        "--primary-600",
        adjustColor(settings.primaryColor, -20),
      );
    }
  }

  root.classList.toggle(
    "high-contrast",
    settings.accessibility.highContrast,
  );
  root.classList.toggle("large-text", settings.accessibility.largeText);
  if (settings.accessibility.reduceMotion) {
    root.classList.add("reduce-motion");
    root.style.setProperty("--animation-duration", "0.01ms");
  } else {
    root.classList.remove("reduce-motion");
    root.style.removeProperty("--animation-duration");
  }

  root.classList.toggle("animations-enabled", settings.showAnimations);
  root.classList.toggle("compact-mode", settings.compactMode);
  root.classList.toggle("sidebar-collapsed", settings.sidebarCollapsed);
  root.setAttribute("data-dashboard-layout", settings.dashboardLayout);
  root.style.setProperty("--items-per-page", String(settings.itemsPerPage));

  const duration =
    typeof settings.notifications.duration === "number"
      ? settings.notifications.duration
      : defaultCustomizationSettings.notifications.duration;
  root.classList.toggle("notifications-enabled", settings.notifications.enabled);
  root.setAttribute(
    "data-notification-position",
    settings.notifications.position ||
      defaultCustomizationSettings.notifications.position,
  );
  root.style.setProperty("--notification-duration", `${duration}ms`);
  root.classList.toggle(
    "notification-sound-enabled",
    settings.notifications.sound,
  );

  root.setAttribute(
    "lang",
    settings.language || defaultCustomizationSettings.language,
  );
  root.setAttribute(
    "data-date-format",
    settings.dateFormat || defaultCustomizationSettings.dateFormat,
  );
  root.setAttribute(
    "data-time-format",
    settings.timeFormat || defaultCustomizationSettings.timeFormat,
  );
  root.style.setProperty(
    "--cache-duration",
    `${settings.dataRetention.cacheDuration}d`,
  );
  root.style.setProperty(
    "--sync-frequency",
    `${settings.dataRetention.syncFrequency}m`,
  );
}
