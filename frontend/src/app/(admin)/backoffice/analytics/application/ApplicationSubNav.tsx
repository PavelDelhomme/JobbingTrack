"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdminLayout } from "@/components/features";

const TABS = [
  {
    href: "/backoffice/analytics/application/performance",
    label: "Performances live",
  },
  {
    href: "/backoffice/analytics/application/activity",
    label: "Activité & traces",
  },
  {
    href: "/backoffice/analytics/application/feedback",
    label: "Retours & signalements",
  },
] as const;

export function ApplicationSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-gray-700"
      aria-label="Sous-sections Application"
    >
      {TABS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-blue-600 text-white shadow dark:bg-blue-500"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AnalyticsPageShell({
  title,
  description,
  children,
  actions,
  backHref,
  backLabel = "Retour à la vue d’ensemble",
  showApplicationSubNav = false,
  maxWidthClassName = "w-full",
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  backHref?: string | null;
  backLabel?: string;
  showApplicationSubNav?: boolean;
  maxWidthClassName?: string;
}) {
  return (
    <AdminLayout>
      <div className={`space-y-6 p-6 ${maxWidthClassName}`}>
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <span aria-hidden>←</span>
            {backLabel}
          </Link>
        ) : null}
        {showApplicationSubNav ? <ApplicationSubNav /> : null}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
              {title}
            </h1>
            {description ? (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {description}
              </div>
            ) : null}
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
