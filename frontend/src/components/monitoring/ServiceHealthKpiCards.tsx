"use client";

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
        <HealthCard label="Sains" value={summary.healthy} tone="green" />
        <HealthCard label="Dégradés" value={summary.degraded} tone="yellow" />
        <HealthCard
          label="Actifs"
          value={summary.totalRunning}
          suffix={`/${summary.expectedTotal}`}
          tone="blue"
        />
        <HealthCard label="Arrêtés" value={Math.max(0, summary.stopped - summary.notDeployed)} tone="red" />
        <HealthCard label="Non déployés" value={summary.notDeployed} tone="red" />
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
}: {
  label: string;
  value: number;
  suffix?: string;
  tone: "green" | "yellow" | "blue" | "red";
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
    <div className={`p-4 rounded-lg ${shell[tone]}`}>
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
    </div>
  );
}
