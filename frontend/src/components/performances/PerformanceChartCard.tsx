"use client";

import type { ReactNode } from "react";
import { ChartPeriodCaption } from "@/components/analytics";

interface PerformanceChartCardProps {
  title: string;
  children: ReactNode;
  periodLabel?: string;
  description?: ReactNode;
  /** Valeur instantanée affichée en haut à droite (CPU, RAM, latence…). */
  liveValue?: ReactNode;
  className?: string;
  contentClassName?: string;
  id?: string;
}

export function PerformanceChartCard({
  title,
  children,
  periodLabel,
  liveValue,
  className = "",
  contentClassName = "",
  id,
}: PerformanceChartCardProps) {
  return (
    <div
      id={id}
      className={`min-w-0 rounded-lg border border-gray-200 bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-800 sm:p-6 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 sm:text-lg">
          {title}
        </h2>
        {liveValue ? (
          <div className="text-right text-sm font-semibold tabular-nums text-blue-700 dark:text-blue-300 shrink-0">
            {liveValue}
          </div>
        ) : null}
      </div>
      {periodLabel ? <ChartPeriodCaption label={periodLabel} /> : null}
      <div className={contentClassName}>{children}</div>
    </div>
  );
}
