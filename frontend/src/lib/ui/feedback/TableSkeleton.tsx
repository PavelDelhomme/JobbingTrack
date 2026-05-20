"use client";

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

/** Skeleton tableau — dark mode natif (remplace le texte « Chargement… »). */
export function TableSkeleton({
  rows = 8,
  columns = 6,
  className = "",
}: TableSkeletonProps) {
  return (
    <div
      className={`animate-pulse p-4 space-y-3 ${className}`}
      role="status"
      aria-busy="true"
      aria-label="Chargement"
    >
      <div className="h-10 rounded-md bg-gray-200 dark:bg-gray-700" />
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: columns }).map((_, col) => (
            <div
              key={col}
              className="h-9 rounded bg-gray-100 dark:bg-gray-700/80"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
