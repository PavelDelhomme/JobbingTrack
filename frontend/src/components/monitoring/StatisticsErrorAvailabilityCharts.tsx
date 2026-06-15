"use client";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { rechartsTooltipProps } from "@/lib/charts/rechartsTooltipTheme";
import type { StatisticsChartPoint } from "@/lib/metrics/statisticsTimeSeries";

const COLORS = {
  success: "#22C55E",
  danger: "#EF4444",
};

export function StatisticsErrorAvailabilityCharts({
  chartData,
  availabilityDomain,
  errorDerived,
}: {
  chartData: StatisticsChartPoint[];
  availabilityDomain: [number, number];
  errorDerived?: boolean;
}) {
  if (chartData.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
        Aucune série persistée sur la période. Vérifier le monitoring et la
        table <code className="text-xs">system_metrics</code>, ou élargir la
        fenêtre temporelle.
      </div>
    );
  }

  const maxErrorRate = Math.max(
    1,
    ...chartData
      .map((point) => point.errorRate)
      .filter((value) => Number.isFinite(value) && value >= 0),
  );
  const errorRateDomainMax =
    maxErrorRate <= 5 ? 5 : Math.min(100, Math.ceil(maxErrorRate * 1.2));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Disponibilité dans le temps
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time"
              stroke="#9CA3AF"
              style={{ fontSize: "12px" }}
            />
            <YAxis
              stroke="#9CA3AF"
              style={{ fontSize: "12px" }}
              domain={availabilityDomain}
            />
            <Tooltip {...rechartsTooltipProps} />
            <Line
              type="monotone"
              dataKey="availability"
              stroke={COLORS.success}
              strokeWidth={3}
              name="Disponibilité (%)"
              dot={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Taux d&apos;erreur dans le temps
        </h3>
        {errorDerived ? (
          <p className="mb-3 text-xs text-amber-700 dark:text-amber-300">
            Valeur dérivée (100 − disponibilité) lorsque{" "}
            <code className="text-xs">error_rate</code> n&apos;est pas persisté
            en base.
          </p>
        ) : (
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            Source persistée <code className="text-xs">errorRate</code> /
            <code className="text-xs">error_rate</code>.
          </p>
        )}
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="statsColorError" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.8} />
                <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time"
              stroke="#9CA3AF"
              style={{ fontSize: "12px" }}
            />
            <YAxis
              stroke="#9CA3AF"
              style={{ fontSize: "12px" }}
              domain={[0, errorRateDomainMax]}
            />
            <Tooltip {...rechartsTooltipProps} />
            <Area
              type="monotone"
              dataKey="errorRate"
              stroke={COLORS.danger}
              fillOpacity={1}
              fill="url(#statsColorError)"
              name="Taux d'erreur (%)"
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
