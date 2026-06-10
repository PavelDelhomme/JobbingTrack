"use client";

import Link from "next/link";
import {
  PRIORITY_RESPONSE_SERVICES,
  RESPONSE_TIME_SOURCE_NOTE,
  isPriorityResponseService,
  normalizeServiceShortName,
} from "@/lib/metrics/responseTimePresentation";
import type { StatisticsServiceEntry } from "@/lib/metrics/serviceHealthOverview";

export interface PriorityResponseServicesSummaryProps {
  services: StatisticsServiceEntry[];
  className?: string;
}

function sortByPriority(
  services: StatisticsServiceEntry[],
): StatisticsServiceEntry[] {
  const order = new Map<string, number>(
    PRIORITY_RESPONSE_SERVICES.map((name, index) => [name, index]),
  );
  return [...services]
    .filter((s) => isPriorityResponseService(s.name))
    .sort((a, b) => {
      const ai = order.get(normalizeServiceShortName(a.name)) ?? 99;
      const bi = order.get(normalizeServiceShortName(b.name)) ?? 99;
      return ai - bi;
    });
}

function statusBadgeClass(status: StatisticsServiceEntry["status"]): string {
  if (status === "healthy")
    return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200";
  if (status === "degraded")
    return "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100";
  if (status === "stopped")
    return "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
}

export function PriorityResponseServicesSummary({
  services,
  className = "",
}: PriorityResponseServicesSummaryProps) {
  const priority = sortByPriority(services);

  return (
    <div
      className={`rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/30 p-3 sm:p-4 space-y-3 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-blue-950 dark:text-blue-100">
            Temps de réponse — services prioritaires P1B
          </h3>
          <p className="text-xs text-blue-900/80 dark:text-blue-100/80 mt-1 max-w-3xl">
            {RESPONSE_TIME_SOURCE_NOTE}
          </p>
        </div>
        <Link
          href="/b4ck0ff1ce/performances/latency"
          className="text-xs font-medium text-blue-700 dark:text-blue-300 hover:underline shrink-0"
        >
          Détail latence →
        </Link>
      </div>

      {priority.length === 0 ? (
        <p className="text-xs text-blue-900/70 dark:text-blue-100/70">
          Aucun service prioritaire en cours d&apos;exécution — vérifier la
          stack Docker ou l&apos;onglet{" "}
          <Link href="/b4ck0ff1ce/services" className="underline">
            Services
          </Link>
          .
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {priority.map((service) => (
            <div
              key={service.name}
              className="rounded-md border border-blue-200/80 dark:border-blue-800/80 bg-white/80 dark:bg-gray-900/50 px-3 py-2 min-w-0"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                  {service.displayName}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${statusBadgeClass(service.status)}`}
                >
                  {service.status === "stopped" ? "arrêté" : service.status}
                </span>
              </div>
              <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 mt-1">
                {service.responseTimeLabel}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
