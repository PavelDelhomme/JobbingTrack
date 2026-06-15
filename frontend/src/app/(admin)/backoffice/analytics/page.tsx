"use client";

import React from "react";
import Link from "next/link";
import { BarChart3, Smartphone, Users } from "@/lib/icons";
import { AnalyticsPageShell } from "./application/ApplicationSubNav";

/**
 * Hub Analytics : résumé orienté **données produit** (application, utilisateurs).
 * CPU / conteneurs / réseau système → **`/b4ck0ff1ce/performances`**.
 */
export default function AnalyticsPage() {
  const cards = [
    {
      href: "/b4ck0ff1ce/analytics/application/performance",
      title: "Application",
      desc: "Performances live mobile, activité & traces, retours et signalements.",
      icon: Smartphone,
    },
    {
      href: "/b4ck0ff1ce/user-analytics",
      title: "Utilisateurs",
      desc: "Analytics utilisateur (parcours, engagement, segments).",
      icon: Users,
    },
    {
      href: "/b4ck0ff1ce/performances",
      title: "Performances (infra)",
      desc: "CPU, mémoire, conteneurs Docker, réseau système — hors périmètre « analytics » métier.",
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
      description={
        <p className="max-w-3xl">
          Vue d&apos;ensemble des vues{" "}
          <strong className="font-medium text-gray-800 dark:text-gray-200">
            application
          </strong>{" "}
          et{" "}
          <strong className="font-medium text-gray-800 dark:text-gray-200">
            utilisateurs
          </strong>
          . Les métriques machine (charge, conteneurs, réseau hôte) sont
          regroupées sous{" "}
          <Link
            href="/b4ck0ff1ce/performances"
            className="font-medium text-blue-600 underline hover:no-underline dark:text-blue-400"
          >
            Performances
          </Link>
          .
        </p>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ href, title, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="block rounded-lg border border-gray-200 bg-white p-5 transition hover:border-blue-400 hover:shadow-sm dark:border-gray-600 dark:bg-gray-800/80 dark:hover:border-blue-500"
          >
            <div className="flex items-start gap-3">
              <Icon
                className="mt-0.5 h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400"
                aria-hidden
              />
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {title}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {desc}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
        Statistiques agrégées (app data, sécurité, logs) :{" "}
        <Link
          href="/b4ck0ff1ce/statistics"
          className="font-medium text-blue-600 underline dark:text-blue-400"
        >
          Statistiques
        </Link>
      </div>
    </AnalyticsPageShell>
  );
}
