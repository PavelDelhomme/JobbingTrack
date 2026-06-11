"use client";

import { ChevronLeft, ChevronRight } from "@/lib/icons";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  className?: string;
}

/**
 * Composant de pagination réutilisable
 * ✅ OPTIMISATION : Pagination pour réduire la charge mémoire
 */
export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage: _itemsPerPage,
  startIndex,
  endIndex,
  onPageChange,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  className = "",
}: PaginationProps) {
  // Générer les numéros de page à afficher
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Afficher toutes les pages si moins de 5
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Afficher les premières pages
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
      // Afficher les pages du milieu
      else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      }
      // Afficher autour de la page actuelle
      else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalPages <= 1) {
    return null; // Ne pas afficher la pagination s'il n'y a qu'une page
  }

  return (
    <div
      className={`flex min-w-0 flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center sm:gap-4 ${className}`}
    >
      {/* Informations */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400 sm:text-left">
        Affichage de{" "}
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {startIndex}
        </span>{" "}
        à{" "}
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {endIndex}
        </span>{" "}
        sur{" "}
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {totalItems}
        </span>{" "}
        résultats
      </div>

      {/* Contrôles de pagination */}
      <div className="flex min-w-0 flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        {/* Bouton Précédent */}
        <button
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className={`rounded-lg border px-2.5 py-2 transition-colors sm:px-3 ${
            canGoPrevious
              ? "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Numéros de page */}
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === "...") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-1 text-gray-400 dark:text-gray-600 sm:px-2"
                >
                  ...
                </span>
              );
            }

            const pageNumber = page as number;
            const isActive = pageNumber === currentPage;

            return (
              <button
                key={pageNumber}
                onClick={() => onPageChange(pageNumber)}
                className={`rounded-lg border px-2.5 py-2 text-sm transition-colors sm:px-3 ${
                  isActive
                    ? "border-blue-600 dark:border-blue-500 bg-blue-600 dark:bg-blue-500 text-white"
                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {pageNumber}
              </button>
            );
          })}
        </div>

        {/* Bouton Suivant */}
        <button
          onClick={onNext}
          disabled={!canGoNext}
          className={`rounded-lg border px-2.5 py-2 transition-colors sm:px-3 ${
            canGoNext
              ? "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
          }`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
