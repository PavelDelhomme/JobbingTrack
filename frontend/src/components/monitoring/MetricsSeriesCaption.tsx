"use client";

import type { StatisticsHistorySource } from "@/lib/metrics/statisticsTimeSeries";
import { uiText } from "@/lib/ui";

export interface MetricsSeriesCaptionProps {
  pointCount: number;
  errorDerived?: boolean;
  source?: StatisticsHistorySource;
  timeRangeLabel?: string;
  className?: string;
}

const SOURCE_LABELS: Record<StatisticsHistorySource, string> = {
  system_metrics: "Persistance system_metrics",
  snapshots: "Snapshots conteneurs",
  empty: "Aucune série",
};

export function MetricsSeriesCaption({
  pointCount,
  errorDerived,
  source = "empty",
  timeRangeLabel,
  className = "",
}: MetricsSeriesCaptionProps) {
  const live = pointCount === 0;
  return (
    <p
      className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/50 px-3 py-2 text-xs ${uiText.muted} ${className}`}
      role="status"
    >
      {timeRangeLabel ? (
        <span className="font-medium text-gray-700 dark:text-gray-300">
          Période : {timeRangeLabel}
        </span>
      ) : null}
      {timeRangeLabel ? " · " : null}
      Source : {SOURCE_LABELS[source]}
      {live ? " · données live uniquement" : ` · ${pointCount} point(s)`}
      {errorDerived ? " · taux d'erreur dérivé (100 − disponibilité)" : null}
    </p>
  );
}
