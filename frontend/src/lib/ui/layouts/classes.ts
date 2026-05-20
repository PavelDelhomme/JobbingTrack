import type { DashboardLayoutId } from "./registry";

/** Classes Tailwind pour la grille de cartes KPI du dashboard backoffice. */
export function dashboardMetricsLayoutClass(layoutId: DashboardLayoutId): string {
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

/** Conteneur secondaire (sections doubles colonnes). */
export function dashboardSectionLayoutClass(layoutId: DashboardLayoutId): string {
  switch (layoutId) {
    case "list":
      return "flex flex-col gap-6";
    case "kanban":
      return "grid grid-cols-1 lg:grid-cols-2 gap-6";
    case "grid":
    default:
      return "grid grid-cols-1 lg:grid-cols-2 gap-6";
  }
}
