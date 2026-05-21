import {
  applyTheme as applyDocumentTheme,
  setStoredTheme,
  type Theme,
} from "@/lib/hooks/theme";
import {
  defaultCustomizationSettings,
  type CustomizationSettings,
} from "./customization";
import { JT_CSS_VARS, LEGACY_ALIAS_VARS } from "./tokens";

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

/** Applique les paramètres au DOM (thème, couleurs, layout, a11y). */
export function applyCustomizationToDom(settings: CustomizationSettings) {
  syncThemeWithThemeProvider(settings);

  const root = document.documentElement;
  if (
    /^#[0-9A-Fa-f]{6}$/.test(settings.primaryColor) &&
    /^#[0-9A-Fa-f]{6}$/.test(settings.accentColor)
  ) {
    root.style.setProperty(JT_CSS_VARS.primary, settings.primaryColor);
    root.style.setProperty(JT_CSS_VARS.accent, settings.accentColor);
    LEGACY_ALIAS_VARS.forEach((alias, i) => {
      root.style.setProperty(
        alias,
        i === 0 ? settings.primaryColor : settings.accentColor,
      );
    });
  }

  root.classList.toggle("high-contrast", settings.accessibility.highContrast);
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
  root.classList.toggle(
    "notifications-enabled",
    settings.notifications.enabled,
  );
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
