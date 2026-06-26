"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { analyticsService } from "@/lib/api/analytics.service";

const TABS = [
  {
    href: "/backoffice/performances",
    label: "Synthèse",
  },
  {
    href: "/backoffice/performances/cpu-memory",
    label: "CPU & Mémoire",
  },
  {
    href: "/backoffice/performances/latency",
    label: "Temps de réponse",
  },
  {
    href: "/backoffice/performances/containers",
    label: "Conteneurs",
  },
  { href: "/backoffice/performances/disk", label: "Disque" },
  {
    href: "/backoffice/performances/network",
    label: "Réseau (détail)",
  },
  {
    href: "/backoffice/performances/correlation",
    label: "Corrélation",
  },
] as const;

export function PerformancesSubNav() {
  const pathname = usePathname();

  // Pré-chauffe la liste conteneurs (cache client 30 s) dès l’entrée section Performances.
  useEffect(() => {
    void analyticsService.getContainersList({ light: true }).catch(() => {});
  }, []);

  const isActive = (tab: (typeof TABS)[number]) => {
    if (tab.href === "/backoffice/performances") {
      return pathname === "/backoffice/performances";
    }
    return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
  };

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-gray-700"
      aria-label="Sous-sections Performances"
    >
      {TABS.map((tab) => {
        const active = isActive(tab);
        return (
          <Link
            key={tab.href + tab.label}
            href={tab.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-blue-600 text-white shadow dark:bg-blue-500"
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
