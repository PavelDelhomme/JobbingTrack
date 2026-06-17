"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/backoffice/performances/correlation",
    label: "Incidents & logs",
  },
  {
    href: "/backoffice/performances/correlation/containers",
    label: "Signaux conteneurs",
  },
] as const;

export function CorrelationSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-gray-200 pb-2 dark:border-gray-700"
      aria-label="Sous-sections Corrélation"
    >
      {TABS.map((tab) => {
        const active =
          tab.href === "/backoffice/performances/correlation"
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-indigo-600 text-white shadow dark:bg-indigo-500"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
