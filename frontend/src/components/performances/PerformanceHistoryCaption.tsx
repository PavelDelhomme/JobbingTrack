"use client";

export type PerformanceHistorySource =
  | "system_metrics"
  | "container_metrics"
  | "docker_live"
  | "derived"
  | "empty";

type PerformanceHistoryCaptionProps = {
  source: PerformanceHistorySource;
  renderedPoints: number;
  rawPoints?: number;
  timeRangeLabel?: string;
  note?: string;
  className?: string;
};

const SOURCE_LABELS: Record<PerformanceHistorySource, string> = {
  system_metrics: "Persistance system_metrics",
  container_metrics: "Persistance container_metrics",
  docker_live: "Docker live / fallback instantané",
  derived: "Série dérivée depuis points persistés",
  empty: "Aucune série historique",
};

export function PerformanceHistoryCaption({
  source,
  renderedPoints,
  rawPoints,
  timeRangeLabel,
  note,
  className = "",
}: PerformanceHistoryCaptionProps) {
  const pointLabel =
    rawPoints != null && rawPoints !== renderedPoints
      ? `${rawPoints} point(s) source -> ${renderedPoints} rendu(s)`
      : renderedPoints > 0
        ? `${renderedPoints} point(s) rendu(s)`
        : "données live uniquement";

  return (
    <p
      className={`rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400 ${className}`}
      role="status"
    >
      {timeRangeLabel ? (
        <span className="font-medium text-gray-700 dark:text-gray-300">
          Période : {timeRangeLabel}
        </span>
      ) : null}
      {timeRangeLabel ? " · " : null}
      Source : {SOURCE_LABELS[source]} · {pointLabel}
      {note ? ` · ${note}` : null}
    </p>
  );
}
