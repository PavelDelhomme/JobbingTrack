/**
 * Moteur UI — exports publics (chargement, préférences, surfaces).
 */
export { PageLoader } from "./feedback/PageLoader";
export { SectionLoader } from "./feedback/SectionLoader";
export { TableSkeleton } from "./feedback/TableSkeleton";
export { TablePanelSkeleton } from "./feedback/TablePanelSkeleton";
export { UiPreferencesProvider } from "./UiPreferencesProvider";
export { uiSurfaces, uiText } from "./surfaces";
export { clearLegacyUiDomOverrides } from "./preferences/dom";
export {
  defaultUiPreferencesV1,
  UI_PREFERENCES_VERSION,
  type UserUiPreferencesV1,
  type UiThemePreference,
} from "./preferences/schema";
