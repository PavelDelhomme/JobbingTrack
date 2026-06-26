"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdminLayout } from "@/components/features";

const BASE_TABS = [
  { href: "/agent", label: "Agent email" },
  { href: "/backoffice/user-analytics", label: "Analytics utilisateur" },
] as const;

export function AgentSubNav({ adminExtra }: { adminExtra?: boolean }) {
  const pathname = usePathname() || "";
  const tabs = adminExtra
    ? [
        ...BASE_TABS,
        { href: "/backoffice/users", label: "Utilisateurs (admin)" },
      ]
    : [...BASE_TABS];

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-gray-700"
      aria-label="Espace agent et analytics"
    >
      {tabs.map(({ href, label }) => {
        const isActive =
          href === "/agent"
            ? pathname === "/agent" || pathname.startsWith("/agent/")
            : pathname === href || pathname.startsWith(`${href}/`);
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

export function AgentPageShell({
  title,
  description,
  actions,
  adminExtraNav,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  adminExtraNav?: boolean;
  children: ReactNode;
}) {
  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <AgentSubNav adminExtra={adminExtraNav} />
        <div className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-4xl">
              <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100 sm:text-3xl">
                {title}
              </h1>
              {description ? (
                <div className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-400">
                  {description}
                </div>
              ) : null}
            </div>
            {actions ? (
              <div className="flex min-w-0 w-full flex-wrap items-center gap-2 xl:max-w-3xl xl:justify-end">
                {actions}
              </div>
            ) : null}
          </div>
        </div>
        <div className="space-y-6">{children}</div>
      </div>
    </AdminLayout>
  );
}

export function AgentPanel({
  title,
  description,
  children,
  className = "",
}: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      {title ? (
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
      ) : null}
      {description ? (
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      ) : null}
      <div className={title || description ? "mt-4 space-y-4" : "space-y-4"}>
        {children}
      </div>
    </section>
  );
}

export const agentFieldClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white";

export const agentBtnPrimary =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50";

export const agentBtnSecondary =
  "rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800";

export const agentBtnDanger =
  "rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30";
