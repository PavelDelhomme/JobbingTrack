"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AdminLayout } from "@/components/features";
import { PerformancesSubNav } from "@/app/(admin)/backoffice/performances/PerformancesSubNav";

interface PerformancePageShellProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  notice?: ReactNode;
  backHref?: string;
  backLabel?: string;
  topLinks?: ReactNode;
}

export function PerformancePageShell({
  title,
  children,
  actions,
  backHref = "/backoffice/performances",
  backLabel = "Retour à Performances",
  topLinks,
}: PerformancePageShellProps) {
  return (
    <AdminLayout>
      <div className="w-full space-y-6 p-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <span aria-hidden>←</span>
            {backLabel}
          </Link>
          {topLinks}
        </div>
        <PerformancesSubNav />
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
              {title}
            </h1>
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {actions}
            </div>
          ) : null}
        </div>
        {children}
      </div>
    </AdminLayout>
  );
}
