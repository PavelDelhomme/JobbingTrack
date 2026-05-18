"use client";

/**
 * Rappelle la plage horaire affichée sous le titre d’un graphique (cohérent avec TimeRangeSelector).
 */
export function ChartPeriodCaption({ label }: { label: string }) {
  if (!label?.trim()) return null;
  return (
    <p
      className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-snug border-b border-gray-100 dark:border-gray-700 pb-2"
      role="note"
    >
      <span className="font-semibold text-gray-600 dark:text-gray-300">
        Période des données :{" "}
      </span>
      {label}
    </p>
  );
}
