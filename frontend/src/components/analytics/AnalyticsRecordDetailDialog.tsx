"use client";

import { formatLocalDateTime } from "@/lib/utils/date";

type RecordLike = Record<string, unknown>;

function formatValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function AnalyticsRecordDetailDialog({
  open,
  title,
  record,
  onClose,
}: {
  open: boolean;
  title: string;
  record: RecordLike | null;
  onClose: () => void;
}) {
  if (!open || !record) return null;

  const entries = Object.entries(record).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="analytics-detail-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700 sm:px-6">
          <h2
            id="analytics-detail-title"
            className="text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Fermer
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 sm:px-6">
          <dl className="space-y-3">
            {entries.map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {key}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap break-words font-mono text-sm text-gray-900 dark:text-gray-100">
                  {key === "timestamp" && typeof value === "string"
                    ? formatLocalDateTime(value)
                    : formatValue(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
