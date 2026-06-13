"use client";

import type { ReactNode } from "react";

interface PerformanceStateProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export function PerformanceLoadingState({
  children = "Chargement…",
  className = "",
}: Partial<PerformanceStateProps>) {
  return (
    <div
      className={`flex min-h-[240px] items-center justify-center text-gray-500 dark:text-gray-400 sm:h-64 ${className}`}
    >
      {children}
    </div>
  );
}

export function PerformanceEmptyState({
  children,
  className = "",
  id,
}: PerformanceStateProps) {
  return (
    <div
      id={id}
      className={`rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 sm:p-8 ${className}`}
    >
      {children}
    </div>
  );
}

export function PerformanceInfoNotice({
  children,
  className = "",
  id,
}: PerformanceStateProps) {
  return (
    <div
      id={id}
      className={`rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100 ${className}`}
    >
      {children}
    </div>
  );
}
