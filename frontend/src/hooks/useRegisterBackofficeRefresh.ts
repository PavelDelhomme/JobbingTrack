"use client";

import { useEffect, useRef } from "react";
import { useBackofficePageRefresh } from "@/contexts/BackofficePageRefreshContext";

type RefreshHandler = () => void | Promise<void>;

/** Enregistre le rafraîchissement progressif de la page courante (KPI + tableaux). */
export function useRegisterBackofficeRefresh(
  handler: RefreshHandler,
  enabled = true,
) {
  const ctx = useBackofficePageRefresh();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!ctx || !enabled) return;
    return ctx.register(() => {
      const result = handlerRef.current();
      return result instanceof Promise ? result : undefined;
    });
  }, [ctx, enabled]);
}
