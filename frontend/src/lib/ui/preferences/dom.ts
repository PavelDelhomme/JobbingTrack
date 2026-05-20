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

import { JT_DOM_VARS_TO_CLEAR } from "./tokens";

const LEGACY_CSS_VARS = JT_DOM_VARS_TO_CLEAR;

export function clearLegacyUiDomOverrides() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  LEGACY_ROOT_CLASSES.forEach((cls) => root.classList.remove(cls));
  LEGACY_CSS_VARS.forEach((name) => root.style.removeProperty(name));
  root.removeAttribute("data-dashboard-layout");
  root.removeAttribute("data-notification-position");
}
