"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/b4ck0ff1ce/security", label: "Vue d'ensemble" },
  { href: "/b4ck0ff1ce/security/analysis", label: "Analyse" },
  { href: "/b4ck0ff1ce/security/logs", label: "Logs sécurité" },
  { href: "/b4ck0ff1ce/security/threats", label: "Menaces" },
  { href: "/b4ck0ff1ce/security/firewall", label: "Firewall" },
  { href: "/b4ck0ff1ce/security/network", label: "Réseau" },
  { href: "/b4ck0ff1ce/security/incidents", label: "Incidents" },
  { href: "/b4ck0ff1ce/security/alerts", label: "Alertes email" },
  { href: "/b4ck0ff1ce/security/policies", label: "Politiques" },
] as const;

function tabIsActive(pathname: string, tab: (typeof TABS)[number]): boolean {
  if (tab.href === "/b4ck0ff1ce/security") {
    return pathname === tab.href;
  }
  if (tab.href === "/b4ck0ff1ce/security/threats") {
    return (
      pathname === tab.href ||
      pathname.startsWith("/b4ck0ff1ce/security/threats/")
    );
  }
  if (tab.href === "/b4ck0ff1ce/security/incidents") {
    return (
      pathname === tab.href ||
      pathname.startsWith("/b4ck0ff1ce/security/incidents/")
    );
  }
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}

export function SecuritySubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-gray-700"
      aria-label="Sous-sections Sécurité"
    >
      {TABS.map((tab) => {
        const active = tabIsActive(pathname, tab);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-red-600 text-white shadow dark:bg-red-500"
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
