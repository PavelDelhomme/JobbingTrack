import { TableSkeleton } from "@/lib/ui";

/** Suspense / transition Next — squelette dark pour toutes les routes /security/** */
export default function SecurityRouteLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 p-6 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-8 w-72 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <TableSkeleton rows={10} columns={7} />
        </div>
      </div>
    </div>
  );
}
