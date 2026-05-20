"use client";

import { useMemo } from "react";
import { useUiPreferences } from "../UiPreferencesContext";
import {
  dashboardDenseGridClass,
  dashboardLayoutClassFor,
  dashboardMetricsLayoutClass,
  dashboardSectionLayoutClass,
  dashboardSplitLayoutClass,
  dashboardTripleGridClass,
  type DashboardLayoutVariant,
} from "./classes";
import { resolveDashboardLayout } from "./registry";

/** Layout dashboard actif (schéma global de personnalisation). */
export function useDashboardLayout() {
  const { customization, isLoading } = useUiPreferences();
  const layoutId = resolveDashboardLayout(customization.dashboardLayout);
  return { layoutId, customization, isLoading };
}

/** Classes Tailwind pré-résolues pour toutes les variantes de grille. */
export function useDashboardLayoutClasses() {
  const { layoutId, isLoading } = useDashboardLayout();
  return useMemo(
    () => ({
      layoutId,
      isLoading,
      metrics: dashboardMetricsLayoutClass(layoutId),
      section: dashboardSectionLayoutClass(layoutId),
      dense: dashboardDenseGridClass(layoutId),
      triple: dashboardTripleGridClass(layoutId),
      split: dashboardSplitLayoutClass(layoutId),
      forVariant: (variant: DashboardLayoutVariant) =>
        dashboardLayoutClassFor(layoutId, variant),
    }),
    [layoutId, isLoading],
  );
}
