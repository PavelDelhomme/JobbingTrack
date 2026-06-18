"use client";

import { useEffect } from "react";
import { useBackofficePageRefresh } from "@/contexts/BackofficePageRefreshContext";

type RefreshHandler = () => void | Promise<void>;

/** Enregistre le rafraîchissement progressif de la page courante (KPI + tableaux). */
export function useRegisterBackofficeRefresh(
  handler: RefreshHandler,
  enabled = true,
) {
  const ctx = useBackofficePageRefresh();

  useEffect(() => {
    if (!ctx || !enabled) return;
    return ctx.register(handler);
  }, [ctx, handler, enabled]);
}
