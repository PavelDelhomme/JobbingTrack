/**
 * Registre de layouts backoffice (amorce moteur UI).
 * Les pages consomment `useDashboardLayout()` plutôt qu’un booléen isolé.
 */
import type { CustomizationSettings } from "../preferences/customization";

export type DashboardLayoutId = CustomizationSettings["dashboardLayout"];

export interface LayoutRegistryEntry {
  id: DashboardLayoutId;
  label: string;
  description: string;
}

export const dashboardLayoutRegistry: LayoutRegistryEntry[] = [
  {
    id: "grid",
    label: "Grille",
    description: "Cartes KPI en grille responsive (défaut).",
  },
  {
    id: "list",
    label: "Liste",
    description: "Sections empilées, lecture verticale.",
  },
  {
    id: "kanban",
    label: "Kanban",
    description: "Colonnes par statut (à brancher sur les vues métier).",
  },
];

export function resolveDashboardLayout(
  id: string | undefined,
): DashboardLayoutId {
  const found = dashboardLayoutRegistry.find((e) => e.id === id);
  return found?.id ?? "grid";
}
