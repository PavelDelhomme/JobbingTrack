"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdminLayout } from "@/components/features";

const TABS = [
  { href: "/backoffice/emails", label: "Dashboard" },
  { href: "/backoffice/email-monitor", label: "Email Monitor" },
  { href: "/backoffice/emails/templates", label: "Templates" },
  { href: "/backoffice/emails/settings", label: "Configuration" },
  { href: "/backoffice/emails/deliverability", label: "Déliverabilité" },
  { href: "/backoffice/emails/mailhog", label: "MailHog" },
] as const;

function isEmailTabActive(pathname: string, href: string): boolean {
  if (href === "/backoffice/emails") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function EmailBackofficeSubNav() {
  const pathname = usePathname() || "";

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-gray-700"
      aria-label="Sous-sections Gestion des emails"
    >
      {TABS.map(({ href, label }) => {
        const isActive = isEmailTabActive(pathname, href);
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

export function EmailBackofficePageShell({
  title,
  description,
  actions,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <EmailBackofficeSubNav />
        <div className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-4xl">
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
              <div className="flex min-w-0 w-full flex-wrap items-center gap-2 xl:max-w-3xl xl:justify-end">
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
