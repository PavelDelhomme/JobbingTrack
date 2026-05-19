/**
 * Nettoyage des overrides DOM legacy (customization.css / ancienne page Paramètres).
 */

const LEGACY_ROOT_CLASSES = [
  "high-contrast",
  "offline-mode",
  "large-text",
  "reduce-motion",
  "compact-mode",
  "sidebar-collapsed",
  "notifications-enabled",
  "notification-sound-enabled",
  "animations-enabled",
] as const;

const LEGACY_CSS_VARS = [
  "--primary-color",
  "--accent-color",
  "--primary-500",
  "--primary-600",
] as const;

export function clearLegacyUiDomOverrides() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  LEGACY_ROOT_CLASSES.forEach((cls) => root.classList.remove(cls));
  LEGACY_CSS_VARS.forEach((name) => root.style.removeProperty(name));
  root.removeAttribute("data-dashboard-layout");
  root.removeAttribute("data-notification-position");
}
