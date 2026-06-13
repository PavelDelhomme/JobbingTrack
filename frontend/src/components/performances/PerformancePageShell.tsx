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
}

export function PerformancePageShell({
  title,
  description,
  children,
  actions,
  notice,
}: PerformancePageShellProps) {
  return (
    <AdminLayout>
      <div className="w-full space-y-6 p-6">
        <Link
          href="/b4ck0ff1ce/performances"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <span aria-hidden>←</span>
          Retour à Performances
        </Link>
        <PerformancesSubNav />
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
              {title}
            </h1>
            {description ? (
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {description}
              </div>
            ) : null}
          </div>
          {notice}
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
