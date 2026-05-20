/**
 * Classes Tailwind partagées — surfaces et textes (dark mode cohérent).
 */
export const uiSurfaces = {
  panel:
    "rounded-xl border border-gray-300 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900",
  tableWrap:
    "overflow-hidden rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900",
  tableHead: "bg-slate-100 dark:bg-gray-800/80 text-left",
  emptyState:
    "rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-slate-50 dark:bg-gray-900/40 p-8 text-center text-sm text-gray-700 dark:text-gray-400",
} as const;

export const uiText = {
  muted: "text-gray-700 dark:text-gray-400",
  subtle: "text-gray-600 dark:text-gray-400",
  body: "text-gray-900 dark:text-gray-100",
  link: "text-red-600 dark:text-red-400 hover:underline font-medium",
} as const;

/** États vides / listes sans données (dark-ready). */
export const uiEmpty = {
  centerPy8: "text-center py-8 text-gray-600 dark:text-gray-400",
  centerPy4: "text-center py-4 text-gray-600 dark:text-gray-400",
} as const;
