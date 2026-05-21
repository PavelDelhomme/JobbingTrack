import type { DashboardLayoutId } from "./registry";

/** Classes Tailwind pour la grille de cartes KPI du dashboard backoffice. */
export function dashboardMetricsLayoutClass(
  layoutId: DashboardLayoutId,
): string {
  switch (layoutId) {
    case "list":
      return "flex flex-col gap-4 md:gap-6";
    case "kanban":
      return "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6";
    case "grid":
    default:
      return "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 md:gap-6";
  }
}

/** Sections deux colonnes (graphiques, panneaux jumeaux). */
export function dashboardSectionLayoutClass(
  layoutId: DashboardLayoutId,
): string {
  switch (layoutId) {
    case "list":
      return "flex flex-col gap-6";
    case "kanban":
      return "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6";
    case "grid":
    default:
      return "grid grid-cols-1 lg:grid-cols-2 gap-6";
  }
}

/** Grille dense (4 colonnes desktop) — cartes système backoffice. */
export function dashboardDenseGridClass(layoutId: DashboardLayoutId): string {
  switch (layoutId) {
    case "list":
      return "flex flex-col gap-4";
    case "kanban":
      return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";
    case "grid":
    default:
      return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4";
  }
}

/** Grille triple — listes services, popups. */
export function dashboardTripleGridClass(layoutId: DashboardLayoutId): string {
  switch (layoutId) {
    case "list":
      return "flex flex-col gap-4";
    case "kanban":
      return "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4";
    case "grid":
    default:
      return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";
  }
}

/** Split large (Statistics — totaux / évolution). */
export function dashboardSplitLayoutClass(layoutId: DashboardLayoutId): string {
  switch (layoutId) {
    case "list":
      return "flex flex-col gap-6";
    case "kanban":
      return "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8";
    case "grid":
    default:
      return "grid grid-cols-1 lg:grid-cols-2 gap-8";
  }
}

export type DashboardLayoutVariant =
  | "metrics"
  | "section"
  | "dense"
  | "triple"
  | "split";

const VARIANT_RESOLVERS: Record<
  DashboardLayoutVariant,
  (id: DashboardLayoutId) => string
> = {
  metrics: dashboardMetricsLayoutClass,
  section: dashboardSectionLayoutClass,
  dense: dashboardDenseGridClass,
  triple: dashboardTripleGridClass,
  split: dashboardSplitLayoutClass,
};

export function dashboardLayoutClassFor(
  layoutId: DashboardLayoutId,
  variant: DashboardLayoutVariant,
): string {
  return VARIANT_RESOLVERS[variant](layoutId);
}
