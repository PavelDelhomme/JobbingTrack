"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdminLayout } from "@/components/features";

const TABS = [
  { href: "/backoffice/services", label: "Liste des services" },
  { href: "/backoffice/services/logs", label: "Services & Logs" },
] as const;

function isServicesTabActive(pathname: string, href: string): boolean {
  if (href === "/backoffice/services") {
    return (
      pathname === href || /^\/backoffice\/services\/[^/]+$/.test(pathname)
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ServicesSubNav() {
  const pathname = usePathname() || "";

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-gray-700"
      aria-label="Sous-sections Administration services"
    >
      {TABS.map(({ href, label }) => {
        const isActive = isServicesTabActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
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

export function ServicesPageShell({
  title,
  actions,
  children,
  showSubNav = true,
  backHref,
  backLabel = "Retour",
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  showSubNav?: boolean;
  backHref?: string | null;
  backLabel?: string;
}) {
  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {backHref ? (
          <Link
            href={backHref}
            title={backLabel}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <span aria-hidden>←</span>
            {backLabel}
          </Link>
        ) : null}
        {showSubNav ? <ServicesSubNav /> : null}
        <div className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100">
                {title}
              </h1>
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
    </AdminLayout>
  );
}
