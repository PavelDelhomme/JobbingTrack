"use client";

import { useEffect, type ReactNode } from "react";
import { clearLegacyUiDomOverrides } from "./preferences/dom";

/**
 * Amorce du moteur UI : purge les classes/vars legacy au boot
 * (évite voile sepia ou couleurs incohérentes après visite Paramètres).
 */
export function UiPreferencesProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    clearLegacyUiDomOverrides();
  }, []);

  return <>{children}</>;
}
