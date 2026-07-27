/**
 * Classes Tailwind partagées — surfaces et textes (dark mode cohérent).
 * Préférer ces tokens aux pastels ad hoc dans .backoffice-content.
 */
export const uiSurfaces = {
  panel:
    "rounded-xl border border-gray-300 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900",
  panelPad:
    "rounded-xl border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900",
  tableWrap:
    "overflow-hidden rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900",
  tableHead: "bg-slate-100 dark:bg-gray-800/80 text-left",
  emptyState:
    "rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-slate-50 dark:bg-gray-900/40 p-8 text-center text-sm text-gray-700 dark:text-gray-400",
  /** Bannière d’alerte légère (hors StatusAlert toné). */
  callout:
    "rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100",
  calloutError:
    "rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100",
  calloutOk:
    "rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-100",
  tabActive: "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white",
  tabIdle:
    "rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200",
  chipActive:
    "rounded-lg border border-indigo-600 bg-indigo-600 px-3 py-1.5 text-left text-xs font-medium text-white sm:text-sm",
  chipIdle:
    "rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-left text-xs text-gray-800 sm:text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200",
  input:
    "h-[min(70vh,720px)] w-full resize-y rounded-xl border border-gray-300 bg-white p-4 font-mono text-xs leading-relaxed text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100",
  btnPrimary:
    "rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40",
  btnSecondary:
    "rounded-lg bg-gray-200 px-3 py-1.5 text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100 disabled:opacity-40",
} as const;

export const uiText = {
  muted: "text-gray-700 dark:text-gray-400",
  subtle: "text-gray-600 dark:text-gray-400",
  body: "text-gray-900 dark:text-gray-100",
  heading: "text-2xl font-bold text-gray-900 dark:text-gray-100",
  subheading: "text-lg font-semibold text-gray-900 dark:text-gray-100",
  link: "text-red-600 dark:text-red-400 hover:underline font-medium",
  linkAccent:
    "text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400",
  mono: "font-mono text-xs text-gray-500 dark:text-gray-400",
} as const;

/** États vides / listes sans données (dark-ready). */
export const uiEmpty = {
  centerPy8: "text-center py-8 text-gray-600 dark:text-gray-400",
  centerPy4: "text-center py-4 text-gray-600 dark:text-gray-400",
} as const;
