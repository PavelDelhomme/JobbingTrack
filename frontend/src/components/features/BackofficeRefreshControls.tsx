"use client";

import { RefreshCw } from "lucide-react";
import { useBackofficePageRefresh } from "@/contexts/BackofficePageRefreshContext";

export function BackofficeRefreshControls({
  variant = "both",
}: {
  variant?: "icon" | "menu" | "both";
}) {
  const ctx = useBackofficePageRefresh();
  if (!ctx) return null;

  const { refresh, isRefreshing, hasHandler } = ctx;
  const disabled = !hasHandler || isRefreshing;

  const iconBtn = (
    <button
      type="button"
      onClick={() => void refresh()}
      disabled={disabled}
      title={
        hasHandler
          ? "Actualiser les données de la page"
          : "Aucune source de données à actualiser sur cette page"
      }
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
    </button>
  );

  const menuBtn = (
    <button
      type="button"
      onClick={() => void refresh()}
      disabled={disabled}
      className="flex w-full items-center gap-2 px-4 py-2 text-left text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
    >
      <RefreshCw
        className={`h-4 w-4 text-blue-600 ${isRefreshing ? "animate-spin" : ""}`}
      />
      <span>Actualiser les données</span>
    </button>
  );

  if (variant === "icon") return iconBtn;
  if (variant === "menu") return menuBtn;
  return (
    <>
      {iconBtn}
      {menuBtn}
    </>
  );
}
