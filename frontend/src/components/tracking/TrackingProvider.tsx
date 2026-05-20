"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import userTracking from "@/lib/tracking/userTracking";

/**
 * Provider de tracking qui initialise le système de tracking
 * et track automatiquement les événements utilisateur
 */
export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Tracker les changements de page uniquement sur mobile
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userAgent =
        navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobile =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent.toLowerCase(),
        );
      const isBackoffice = pathname?.startsWith("/b4ck0ff1ce");

      // Tracker uniquement sur mobile et pas dans le backoffice
      if (isMobile && !isBackoffice) {
        userTracking.trackPageView();
      }
    }
  }, [pathname]);

  return <>{children}</>;
}

/**
 * Hook pour tracker les clics sur les boutons
 */
export function useTracking() {
  const trackClick = (element: HTMLElement, eventName?: string) => {
    userTracking.trackClick(element, eventName);
  };

  const trackEvent = (
    eventName: string,
    eventType: string = "click",
    category?: string,
    properties?: Record<string, any>,
  ) => {
    userTracking.trackEvent(eventName, eventType, category, properties);
  };

  const trackError = (
    error: Error | string,
    errorType: string = "javascript",
    severity: "error" | "warning" | "critical" = "error",
  ) => {
    userTracking.trackError(error, errorType, severity);
  };

  const trackPerformance = (
    metricName: string,
    metricType: string,
    value?: number,
    duration?: number,
  ) => {
    userTracking.trackPerformance(metricName, metricType, value, duration);
  };

  return {
    trackClick,
    trackEvent,
    trackError,
    trackPerformance,
  };
}
