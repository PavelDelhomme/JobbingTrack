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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HealthCard label="Sains" value={summary.healthy} tone="green" />
        <HealthCard label="Dégradés" value={summary.degraded} tone="yellow" />
        <HealthCard label="En cours" value={summary.totalRunning} tone="blue" />
        <HealthCard label="Arrêtés" value={summary.stopped} tone="red" />
      </div>
      {!hideHint && (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {hint ??
            "Sains / dégradés = conteneurs en cours d'exécution. Arrêtés = conteneurs connus mais non démarrés — aligné avec /backoffice/services."}
        </p>
      )}
    </div>
  );
}

function HealthCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
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
        </span>
      </div>
    </div>
  );
}
