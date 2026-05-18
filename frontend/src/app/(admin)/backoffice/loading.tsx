export default function BackofficeLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 p-6 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-3">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
            />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-80 animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:col-span-2" />
          <div className="h-80 animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900" />
        </div>

        <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900" />
      </div>
    </div>
  );
}
