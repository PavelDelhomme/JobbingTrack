"use client";

import type { ReactNode } from "react";

/** Barre de période collante sous l’en-tête backoffice (Performances, Statistics, …). */
export function StickyTimeRangeToolbar({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`sticky top-0 z-20 -mx-1 mb-4 rounded-xl border border-gray-200 bg-white/95 px-3 py-3 shadow-sm backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/95 sm:px-4 ${className}`}
    >
      {children}
    </div>
  );
}
