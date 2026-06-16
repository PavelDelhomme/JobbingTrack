"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdminLayout } from "@/components/features";
import { SecurityIncidentsTabs } from "./SecurityIncidentsTabs";

const TABS = [
  { href: "/backoffice/security", label: "Vue d'ensemble" },
  { href: "/backoffice/security/analysis", label: "Analyse" },
  { href: "/backoffice/security/logs", label: "Logs" },
  { href: "/backoffice/security/incidents", label: "Incidents" },
  { href: "/backoffice/security/investigation", label: "Investigation" },
  { href: "/backoffice/security/firewall", label: "Firewall" },
  { href: "/backoffice/security/network", label: "Réseau" },
  { href: "/backoffice/security/alerts", label: "Alertes email" },
  { href: "/backoffice/security/policies", label: "Politiques" },
] as const;

function isSecurityTabActive(pathname: string, href: string): boolean {
  if (href === "/backoffice/security") {
    return pathname === "/backoffice/security";
  }
  if (href === "/backoffice/security/incidents") {
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      pathname === "/backoffice/security/threats" ||
      pathname.startsWith("/backoffice/security/threats/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SecuritySubNav() {
  const pathname = usePathname() || "";

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-gray-700"
      aria-label="Sous-sections Sécurité"
    >
      {TABS.map(({ href, label }) => {
        const isActive = isSecurityTabActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-red-600 text-white shadow dark:bg-red-500"
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

export function SecurityPageShell({
  title,
  description,
  actions,
  children,
  showIncidentsTabs = false,
  showSubNav = true,
  backHref,
  backLabel = "Retour",
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  showIncidentsTabs?: boolean;
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
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <span aria-hidden>←</span>
            {backLabel}
          </Link>
        ) : null}
        {showSubNav ? <SecuritySubNav /> : null}
        {showIncidentsTabs ? <SecurityIncidentsTabs /> : null}
        <div className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100">
                {title}
              </h1>
              {description ? (
                <div className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-400">
                  {description}
                </div>
              ) : null}
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
