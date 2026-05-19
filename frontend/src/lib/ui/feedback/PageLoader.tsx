"use client";

import { LoadingState } from "@/components/ui/LoadingState";

export interface PageLoaderProps {
  message?: string;
  /** Plein écran (gate auth, transition route racine). */
  fullScreen?: boolean;
  className?: string;
}

/**
 * Chargeur de page unifié — fond sombre en dark mode (évite l’écran blanc).
 */
export function PageLoader({
  message = "Chargement…",
  fullScreen = true,
  className = "",
}: PageLoaderProps) {
  return (
    <LoadingState
      message={message}
      fullScreen={fullScreen}
      className={className}
    />
  );
}
