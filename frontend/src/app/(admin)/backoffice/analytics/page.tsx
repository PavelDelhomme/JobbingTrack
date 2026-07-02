"use client";

import React from "react";
import Link from "next/link";
import { BarChart3, Smartphone, Users } from "@/lib/icons";
import { AnalyticsPageShell } from "./application/ApplicationSubNav";

export default function AnalyticsPage() {
  const cards = [
    {
      href: "/backoffice/analytics/application/performance",
      title: "Application",
      icon: Smartphone,
    },
    {
      href: "/backoffice/user-analytics",
      title: "Utilisateurs",
      icon: Users,
    },
    {
      href: "/backoffice/performances",
      title: "Performances (infra)",
      icon: BarChart3,
    },
  ] as const;

  return (
    <AnalyticsPageShell
      title={
        <span className="flex items-center gap-2">
          <BarChart3 className="h-7 w-7" aria-hidden />
          Analytics
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ href, title, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="block rounded-lg border border-gray-200 bg-white p-5 transition hover:border-blue-400 hover:shadow-sm dark:border-gray-600 dark:bg-gray-800/80 dark:hover:border-blue-500"
          >
            <div className="flex items-center gap-3">
              <Icon
                className="h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400"
                aria-hidden
              />
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </AnalyticsPageShell>
  );
}
