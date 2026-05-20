/**
 * Moteur UI — exports publics (chargement, préférences, surfaces).
 */
export { PageLoader } from "./feedback/PageLoader";
export { SectionLoader } from "./feedback/SectionLoader";
export { TableSkeleton } from "./feedback/TableSkeleton";
export { TablePanelSkeleton } from "./feedback/TablePanelSkeleton";
export { UiPreferencesProvider } from "./UiPreferencesProvider";
export { useUiPreferences } from "./UiPreferencesContext";
export type { UiPreferencesContextValue } from "./UiPreferencesContext";
export {
  mergeCustomizationSettings,
  defaultCustomizationSettings,
  clearCustomizationDomOverrides,
  type CustomizationSettings,
} from "./preferences/customization";
export { uiSurfaces, uiText, uiEmpty } from "./surfaces";
export {
  dashboardLayoutRegistry,
  resolveDashboardLayout,
  type DashboardLayoutId,
} from "./layouts/registry";
export { useDashboardLayout } from "./layouts/useDashboardLayout";
export { clearLegacyUiDomOverrides } from "./preferences/dom";
export {
  defaultUiPreferencesV1,
  UI_PREFERENCES_VERSION,
  type UserUiPreferencesV1,
  type UiThemePreference,
} from "./preferences/schema";
