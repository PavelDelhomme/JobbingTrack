"use client";

import Link from "next/link";
import {
  summarizeDockerServiceHealth,
  type DockerServiceRow,
} from "@/lib/metrics/serviceHealthOverview";

export interface ServiceHealthKpiCardsProps {
  dockerServices?: DockerServiceRow[] | null;
  /** Libellé sous les cartes (source, périmètre). */
  hint?: string;
  hideHint?: boolean;
  className?: string;
}

const HEALTH_KPI_LINKS = {
  healthy: "/backoffice/services?status=healthy",
  degraded: "/backoffice/services?status=degraded",
  running: "/backoffice/services?status=running",
  stopped: "/backoffice/services?status=stopped",
  not_deployed: "/backoffice/services?status=not_deployed",
} as const;

export function ServiceHealthKpiCards({
  dockerServices,
  hint,
  hideHint = false,
  className = "",
}: ServiceHealthKpiCardsProps) {
  const summary = summarizeDockerServiceHealth(dockerServices || []);

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <HealthCard
          label="Sains"
          value={summary.healthy}
          tone="green"
          href={HEALTH_KPI_LINKS.healthy}
        />
        <HealthCard
          label="Dégradés"
          value={summary.degraded}
          tone="yellow"
          href={HEALTH_KPI_LINKS.degraded}
        />
        <HealthCard
          label="Actifs"
          value={summary.totalRunning}
          suffix={`/${summary.expectedTotal}`}
          tone="blue"
          href={HEALTH_KPI_LINKS.running}
        />
        <HealthCard
          label="Arrêtés"
          value={Math.max(0, summary.stopped - summary.notDeployed)}
          tone="red"
          href={HEALTH_KPI_LINKS.stopped}
        />
        <HealthCard
          label="Non déployés"
          value={summary.notDeployed}
          tone="red"
          href={HEALTH_KPI_LINKS.not_deployed}
        />
      </div>
      {!hideHint && (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {hint ??
            `Périmètre catalogue JobbingTrack : ${summary.expectedTotal} services attendus. Sains/dégradés = conteneurs en cours. Non déployés = jamais créés (⚪ DOWN make status) — lancer make up-full ou le profile compose adéquat.`}
        </p>
      )}
    </div>
  );
}

function HealthCard({
  label,
  value,
  suffix,
  tone,
  href,
}: {
  label: string;
  value: number;
  suffix?: string;
  tone: "green" | "yellow" | "blue" | "red";
  href: string;
}) {
  const shell: Record<typeof tone, string> = {
    green: "bg-green-50 dark:bg-green-900/20",
    yellow: "bg-yellow-50 dark:bg-yellow-900/20",
    blue: "bg-blue-50 dark:bg-blue-900/20",
    red: "bg-red-50 dark:bg-red-900/20",
  };
  const valueColor: Record<typeof tone, string> = {
    green: "text-green-600 dark:text-green-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
    blue: "text-blue-600 dark:text-blue-400",
    red: "text-red-600 dark:text-red-400",
  };

  return (
    <Link
      href={href}
      className={`block p-4 rounded-lg ${shell[tone]} transition hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 dark:hover:ring-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500`}
      title={`Voir les services : ${label}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        <span className={`text-2xl font-bold tabular-nums ${valueColor[tone]}`}>
          {value}
          {suffix ? (
            <span className="text-base font-semibold text-gray-500 dark:text-gray-400">
              {suffix}
            </span>
          ) : null}
        </span>
      </div>
    </Link>
  );
}
