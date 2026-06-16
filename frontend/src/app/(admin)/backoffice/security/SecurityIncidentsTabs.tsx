"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/backoffice/security/incidents", label: "Synthèse incidents" },
  { href: "/backoffice/security/threats", label: "Menaces réseau" },
] as const;

export function SecurityIncidentsTabs() {
  const pathname = usePathname() || "";

  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
      {TABS.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
