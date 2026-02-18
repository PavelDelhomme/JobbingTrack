'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from '@/lib/icons';

export type TimeRangeOption =
  | 'today'
  | '1h'
  | '6h'
  | '24h'
  | '3d'
  | '7d'
  | '14d'
  | '30d';

const PERIODE_ACTUELLE_LABEL = 'Période actuelle';

const DEFAULT_OPTIONS: TimeRangeOption[] = [
  'today',
  '1h',
  '6h',
  '24h',
  '3d',
  '7d',
  '14d',
  '30d',
];

const LABELS: Record<TimeRangeOption, string> = {
  today: "Aujourd'hui",
  '1h': '1 h',
  '6h': '6 h',
  '24h': '24 h',
  '3d': '3 jours',
  '7d': '7 jours',
  '14d': '14 jours',
  '30d': '30 jours',
};

export interface TimeRangeSelectorProps {
  timeRange: TimeRangeOption;
  setTimeRange: (v: TimeRangeOption) => void;
  useCustomRange: boolean;
  setUseCustomRange: (v: boolean) => void;
  customStart: string;
  setCustomStart: (v: string) => void;
  customEnd: string;
  setCustomEnd: (v: string) => void;
  rangeLabel: string;
  goPrev: () => void;
  goNext: () => void;
  canGoNext: boolean;
  onPeriodNow?: () => void;
  options?: TimeRangeOption[];
}

export function TimeRangeSelector({
  timeRange,
  setTimeRange,
  useCustomRange,
  setUseCustomRange,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  rangeLabel,
  goPrev,
  goNext,
  canGoNext,
  onPeriodNow,
  options = DEFAULT_OPTIONS,
}: TimeRangeSelectorProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <select
          value={timeRange}
          onChange={(e) => {
            setTimeRange(e.target.value as TimeRangeOption);
            if (!useCustomRange) onPeriodNow?.();
          }}
          disabled={useCustomRange}
          className="px-3 py-2 sm:px-4 sm:py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 disabled:opacity-60 text-sm min-w-0 max-w-full"
          aria-label="Période"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {LABELS[opt]}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 min-w-0">
          <button
            type="button"
            onClick={goPrev}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 shrink-0"
            aria-label="Période précédente"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[120px] sm:min-w-[200px] text-center text-xs sm:text-sm text-gray-700 dark:text-gray-300 truncate px-1">
            {rangeLabel}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            aria-label="Période suivante"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <button
          type="button"
          onClick={onPeriodNow}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap"
        >
          {PERIODE_ACTUELLE_LABEL}
        </button>
      </div>

      <details className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-hidden">
        <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 [list-style:inside]">
          Plage personnalisée
        </summary>
        <div className="p-3 pt-0 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Définir une plage de dates, puis cocher « Utiliser cette plage ».
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              Du
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 text-sm min-w-0"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              au
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 text-sm min-w-0"
              />
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useCustomRange}
                onChange={(e) => setUseCustomRange(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Utiliser cette plage
              </span>
            </label>
          </div>
        </div>
      </details>
    </>
  );
}
