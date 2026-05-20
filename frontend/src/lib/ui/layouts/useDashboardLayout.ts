"use client";

import { useUiPreferences } from "../UiPreferencesContext";
import { resolveDashboardLayout } from "./registry";

/** Layout dashboard actif (schéma global de personnalisation). */
export function useDashboardLayout() {
  const { customization } = useUiPreferences();
  const layoutId = resolveDashboardLayout(customization.dashboardLayout);
  return { layoutId, customization };
}
