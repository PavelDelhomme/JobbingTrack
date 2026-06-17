/** Classes Tailwind pour les pills de niveau de log (filtres Statistics). */
export function logLevelChipTone(
  level: string,
  checked: boolean,
): string {
  if (!checked) {
    return "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:border-gray-500";
  }
  const normalized = level.trim().toUpperCase();
  if (normalized.includes("ERROR") || normalized.includes("FATAL")) {
    return "border-red-500 bg-red-50 text-red-900 shadow-sm dark:border-red-600 dark:bg-red-950/50 dark:text-red-100";
  }
  if (normalized.includes("WARN")) {
    return "border-amber-500 bg-amber-50 text-amber-950 shadow-sm dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-100";
  }
  if (normalized.includes("INFO")) {
    return "border-sky-500 bg-sky-50 text-sky-950 shadow-sm dark:border-sky-600 dark:bg-sky-950/40 dark:text-sky-100";
  }
  if (normalized.includes("DEBUG") || normalized.includes("TRACE")) {
    return "border-gray-400 bg-gray-100 text-gray-800 shadow-sm dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100";
  }
  return "border-violet-500 bg-violet-50 text-violet-950 shadow-sm dark:border-violet-600 dark:bg-violet-950/40 dark:text-violet-100";
}
