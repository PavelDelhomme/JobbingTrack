"use client";

import { cn } from "@/lib/utils";
import type { DashboardLayoutVariant } from "./classes";
import { useDashboardLayoutClasses } from "./useDashboardLayout";

export interface DashboardLayoutRegionProps {
  /** Variante de grille (metrics, section, dense, triple, split). */
  variant?: DashboardLayoutVariant;
  className?: string;
  children: React.ReactNode;
}

/**
 * Zone de contenu sensible à `dashboardLayout` (Paramètres).
 * Classe `dashboard-content` : fallback CSS via `[data-dashboard-layout]` sur `<html>`.
 */
export function DashboardLayoutRegion({
  variant = "section",
  className,
  children,
}: DashboardLayoutRegionProps) {
  const { forVariant } = useDashboardLayoutClasses();
  return (
    <div className={cn("dashboard-content", forVariant(variant), className)}>
      {children}
    </div>
  );
}
