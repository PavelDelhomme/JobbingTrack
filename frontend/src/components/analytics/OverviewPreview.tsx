"use client";

export interface OverviewPreviewRow {
  id: string;
  primary: string;
  secondary: string;
  meta: string;
}

export function OverviewPreview({
  title,
  empty,
  rows,
  onViewAll,
}: {
  title: string;
  empty: string;
  rows: OverviewPreviewRow[];
  onViewAll: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        <button
          type="button"
          onClick={onViewAll}
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          Voir tout
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-md border border-gray-100 px-3 py-2 dark:border-gray-700"
            >
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                {r.primary}
              </p>
              <p className="truncate text-xs text-gray-600 dark:text-gray-400">
                {r.secondary}
              </p>
              <p className="mt-1 text-xs text-gray-500">{r.meta}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
