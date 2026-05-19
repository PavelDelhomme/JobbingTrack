/**
 * Moteur UI — exports publics (chargement, préférences à venir).
 */
export { PageLoader } from "./feedback/PageLoader";
export { SectionLoader } from "./feedback/SectionLoader";
export { TableSkeleton } from "./feedback/TableSkeleton";
export {
  defaultUiPreferencesV1,
  UI_PREFERENCES_VERSION,
  type UserUiPreferencesV1,
  type UiThemePreference,
} from "./preferences/schema";
