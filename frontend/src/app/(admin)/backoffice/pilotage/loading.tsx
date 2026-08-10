export default function PilotageLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-8 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      <div className="h-4 w-full max-w-xl animate-pulse rounded bg-gray-100 dark:bg-gray-900" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-900"
          />
        ))}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Chargement du pilotage…
      </p>
    </div>
  );
}
