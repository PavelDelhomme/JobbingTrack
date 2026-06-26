"use client";

import type { ReactNode } from "react";
import type { FilterBadge } from "@/lib/filters/types";

type FilterBarProps = {
  children: ReactNode;
  hasDraftChanges?: boolean;
  facetsLoading?: boolean;
  onApply: () => void;
  onReset: () => void;
  badges?: FilterBadge[];
  sortBadge?: string | null;
  /** Boutons / badges toggle à côté de « Appliquer les filtres » */
  toolbarExtra?: ReactNode;
};

export function FilterBar({
  children,
  hasDraftChanges = false,
  facetsLoading = false,
  onApply,
  onReset,
  badges = [],
  sortBadge = null,
  toolbarExtra = null,
}: FilterBarProps) {
  return (
    <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
      {children}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onApply}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Appliquer les filtres
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          Réinitialiser
        </button>
        {toolbarExtra}
        {hasDraftChanges && (
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
            Filtres modifiés, pas encore appliqués
          </span>
        )}
        {facetsLoading && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Chargement des suggestions…
          </span>
        )}
      </div>
      {(sortBadge || badges.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          {sortBadge && (
            <span className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
              {sortBadge}
            </span>
          )}
          {badges.map((badge) => (
            <span
              key={badge.key}
              className="rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-700"
            >
              {badge.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
