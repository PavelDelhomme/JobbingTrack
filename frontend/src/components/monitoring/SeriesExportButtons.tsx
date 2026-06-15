"use client";

import {
  downloadSeriesRows,
  type SeriesExportRow,
} from "@/lib/exports/seriesExport";

type SeriesExportButtonsProps = {
  rows: SeriesExportRow[];
  baseName: string;
  label?: string;
};

export function SeriesExportButtons({
  rows,
  baseName,
  label = "Exporter les séries affichées",
}: SeriesExportButtonsProps) {
  const disabled = rows.length === 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
        {label}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => downloadSeriesRows(rows, baseName, "csv")}
        className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
      >
        CSV
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => downloadSeriesRows(rows, baseName, "json")}
        className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
      >
        JSON
      </button>
    </div>
  );
}
