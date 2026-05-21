"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const TABS = [
  { href: "/b4ck0ff1ce/statistics", label: "Vue d’ensemble" },
  { href: "/b4ck0ff1ce/statistics/app-data", label: "App data" },
  { href: "/b4ck0ff1ce/statistics/security", label: "Sécurité" },
  { href: "/b4ck0ff1ce/statistics/log-stats", label: "Logs (stats)" },
] as const;

export function StatisticsSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-gray-700"
      aria-label="Sous-sections Statistiques"
    >
      {TABS.map(({ href, label }) => {
        const isActive =
          href === "/b4ck0ff1ce/statistics"
            ? pathname === "/b4ck0ff1ce/statistics"
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-violet-600 text-white shadow dark:bg-violet-500"
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

export function StatisticsPageShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <StatisticsSubNav />
      <div className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100">
              {title}
            </h1>
            <div className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-400">
              {description}
            </div>
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}

export function StatisticsRefreshButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
    >
      Rafraîchir
    </button>
  );
}
