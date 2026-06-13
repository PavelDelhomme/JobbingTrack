"use client";

import type { ReactNode } from "react";
import { ChartPeriodCaption } from "@/components/analytics";

interface PerformanceChartCardProps {
  title: string;
  children: ReactNode;
  periodLabel?: string;
  description?: ReactNode;
  className?: string;
  contentClassName?: string;
  id?: string;
}

export function PerformanceChartCard({
  title,
  children,
  periodLabel,
  description,
  className = "",
  contentClassName = "",
  id,
}: PerformanceChartCardProps) {
  return (
    <div
      id={id}
      className={`min-w-0 rounded-lg border border-gray-200 bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-800 sm:p-6 ${className}`}
    >
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 sm:text-lg">
        {title}
      </h2>
      {description ? (
        <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {description}
        </div>
      ) : null}
      {periodLabel ? <ChartPeriodCaption label={periodLabel} /> : null}
      <div className={contentClassName}>{children}</div>
    </div>
  );
}
