"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdminLayout } from "@/components/features";

const TEST_TABS = [
  { href: "/b4ck0ff1ce/tests", label: "Vue d'ensemble" },
  { href: "/b4ck0ff1ce/tests-api", label: "Tests API" },
  { href: "/b4ck0ff1ce/tests-backend", label: "Tests Backend" },
  { href: "/b4ck0ff1ce/tests-frontend", label: "Tests Frontend" },
  { href: "/b4ck0ff1ce/tests-backoffice", label: "Tests Backoffice" },
] as const;

export function DevelopmentTestsSubNav() {
  const pathname = usePathname() || "";

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-gray-700"
      aria-label="Sous-sections Développement tests"
    >
      {TEST_TABS.map(({ href, label }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
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

export function DevelopmentPageShell({
  title,
  description,
  actions,
  children,
  showTestsSubNav = true,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  showTestsSubNav?: boolean;
}) {
  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {showTestsSubNav ? <DevelopmentTestsSubNav /> : null}
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
