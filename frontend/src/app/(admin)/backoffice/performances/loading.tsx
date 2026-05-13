export default function PerformancesLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="space-y-2">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-28 animate-pulse rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-72 animate-pulse rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
          />
        ))}
      </div>
    </div>
  )
}
