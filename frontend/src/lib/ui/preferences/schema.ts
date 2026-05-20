/**
 * Schéma v1 des préférences UI (moteur en cours).
 * @see docs/frontend/UI_MOTOR.md
 */

import {
  defaultCustomizationSettings,
  type CustomizationSettings,
} from "./customization";
import { defaultUiPanels, type UiPanelsSettings } from "./panels";

export const UI_PREFERENCES_VERSION = 1 as const;

export type UiThemePreference = "light" | "dark" | "system";

export interface UserUiPreferencesV1 {
  version: typeof UI_PREFERENCES_VERSION;
  theme: UiThemePreference;
  density: "comfortable" | "compact";
  sidebarCollapsed: boolean;
  accentHex?: string;
  primaryHex?: string;
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    reduceMotion: boolean;
  };
  /** Paramètres complets page Paramètres (forme legacy unifiée). */
  customization: CustomizationSettings;
  /** Panneaux Statistics / Analytics (ex-clés localStorage dédiées). */
  panels: UiPanelsSettings;
}

export const defaultUiPreferencesV1: UserUiPreferencesV1 = {
  version: UI_PREFERENCES_VERSION,
  theme: "dark",
  density: "comfortable",
  sidebarCollapsed: false,
  accessibility: {
    highContrast: false,
    largeText: false,
    reduceMotion: false,
  },
  customization: defaultCustomizationSettings,
  panels: defaultUiPanels,
};
