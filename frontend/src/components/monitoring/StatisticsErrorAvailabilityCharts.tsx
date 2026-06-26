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
import { ChartPeriodCaption } from "@/components/analytics/ChartPeriodCaption";
import { rechartsTooltipProps } from "@/lib/charts/rechartsTooltipTheme";
import type {
  StatisticsChartPoint,
  StatisticsHistorySource,
} from "@/lib/metrics/statisticsTimeSeries";
import { statisticsHistorySourceLabel } from "@/lib/metrics/statisticsTimeSeries";
import {
  formatLocalChartAxisTick,
  formatLocalDateTime,
} from "@/lib/utils/date";

const COLORS = {
  success: "#22C55E",
  danger: "#EF4444",
};

const CHART_CARD_CLASS =
  "rounded-xl border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900";

function finitePoints(chartData: StatisticsChartPoint[]) {
  return chartData.filter(
    (point) =>
      Number.isFinite(point.timeMs) &&
      (Number.isFinite(point.availability) || Number.isFinite(point.errorRate)),
  );
}

function dataSpanRatio(
  chartData: StatisticsChartPoint[],
  xDomainMin: number,
  xDomainMax: number,
): number {
  const points = finitePoints(chartData);
  if (points.length < 2) return 0;
  const minMs = Math.min(...points.map((p) => p.timeMs));
  const maxMs = Math.max(...points.map((p) => p.timeMs));
  const window = Math.max(1, xDomainMax - xDomainMin);
  return (maxMs - minMs) / window;
}

export function StatisticsErrorAvailabilityCharts({
  chartData,
  availabilityDomain,
  errorDerived,
  xDomainMin,
  xDomainMax,
  axisShowDate = false,
  periodLabel,
  pointCount,
  source = "empty",
  fetchFailed = false,
}: {
  chartData: StatisticsChartPoint[];
  availabilityDomain: [number, number];
  errorDerived?: boolean;
  xDomainMin: number;
  xDomainMax: number;
  axisShowDate?: boolean;
  periodLabel: string;
  pointCount: number;
  source?: StatisticsHistorySource;
  fetchFailed?: boolean;
}) {
  if (chartData.length === 0) {
    return (
      <div
        className={`${CHART_CARD_CLASS} border-dashed p-8 text-center text-sm text-gray-500 dark:text-gray-400`}
      >
        {fetchFailed ? (
          <>
            Impossible de charger l&apos;historique persisté (proxy monitoring
            injoignable ou bloqué par une extension navigateur). Vérifiez que{" "}
            <code className="text-xs">metrics-aggregator</code> est démarré,
            désactivez uBlock sur ce site, puis actualisez. Les données live
            peuvent rester visibles en attendant.
          </>
        ) : (
          <>
            Aucune série persistée sur la période. Vérifier le monitoring et la
            table <code className="text-xs">system_metrics</code>, ou élargir la
            fenêtre temporelle via la barre période ci-dessus.
          </>
        )}
      </div>
    );
  }

  const renderedPoints = finitePoints(chartData);
  const sparseOnWindow =
    renderedPoints.length > 0 &&
    (renderedPoints.length < 8 || dataSpanRatio(chartData, xDomainMin, xDomainMax) < 0.2);
  const showMarkers = sparseOnWindow || renderedPoints.length <= 40;

  const maxErrorRate = Math.max(
    1,
    ...chartData
      .map((point) => point.errorRate)
      .filter((value) => Number.isFinite(value) && value >= 0),
  );
  const errorRateDomainMax =
    maxErrorRate <= 5 ? 5 : Math.min(100, Math.ceil(maxErrorRate * 1.2));
  const axisBottom = axisShowDate ? 56 : 44;
  const tooltipLabel = (_: unknown, payload: unknown) => {
    const timeMs = (payload as Array<{ payload?: { timeMs?: number } }>)?.[0]
      ?.payload?.timeMs;
    return timeMs != null ? formatLocalDateTime(new Date(timeMs)) : "—";
  };

  return (
    <div className="space-y-6">
      <div className={`${CHART_CARD_CLASS} py-4`}>
        <ChartPeriodCaption label={periodLabel} />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Source : {statisticsHistorySourceLabel(source)}
          {pointCount === 0
            ? " · données live uniquement"
            : ` · ${pointCount} point(s) rendu(s)`}
          {errorDerived ? " · taux d'erreur dérivé (100 − disponibilité)" : null}
        </p>
        {sparseOnWindow ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            Peu de mesures sur cette fenêtre : les marqueurs indiquent les
            points disponibles. Réduire la période (ex. 24 h) pour mieux lire la
            courbe, ou attendre l&apos;historique{" "}
            <code className="text-[11px]">system_metrics</code>.
          </p>
        ) : null}
      </div>

      <div className={CHART_CARD_CLASS}>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Disponibilité dans le temps
        </h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Métrique infra persistée — les totaux candidatures/utilisateurs sont
          dans <strong>Statistiques des données</strong> ou l&apos;onglet{" "}
          <strong>App data</strong>.
        </p>
        <div className="mt-3 h-72 w-full min-w-0 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 16, left: 8, bottom: axisBottom }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
              <XAxis
                dataKey="timeMs"
                type="number"
                domain={[xDomainMin, xDomainMax]}
                angle={axisShowDate ? -35 : -25}
                textAnchor="end"
                height={axisBottom}
                minTickGap={axisShowDate ? 32 : 22}
                tickFormatter={(ms) =>
                  formatLocalChartAxisTick(ms as number, {
                    withDate: axisShowDate,
                  })
                }
                tick={{ fontSize: 11 }}
              />
              <YAxis
                domain={availabilityDomain}
                tick={{ fontSize: 11 }}
                width={40}
              />
              <Tooltip {...rechartsTooltipProps} labelFormatter={tooltipLabel} />
              <Line
                type="monotone"
                dataKey="availability"
                stroke={COLORS.success}
                strokeWidth={2}
                name="Disponibilité (%)"
                dot={showMarkers ? { r: 3, strokeWidth: 1 } : false}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={CHART_CARD_CLASS}>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Taux d&apos;erreur dans le temps
        </h3>
        {errorDerived ? (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            Valeur dérivée (100 − disponibilité) lorsque{" "}
            <code className="text-xs">error_rate</code> n&apos;est pas persisté
            en base.
          </p>
        ) : (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Source persistée <code className="text-xs">errorRate</code> /
            <code className="text-xs">error_rate</code>.
          </p>
        )}
        <div className="mt-3 h-72 w-full min-w-0 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 16, left: 8, bottom: axisBottom }}
            >
              <defs>
                <linearGradient id="statsColorError" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
              <XAxis
                dataKey="timeMs"
                type="number"
                domain={[xDomainMin, xDomainMax]}
                angle={axisShowDate ? -35 : -25}
                textAnchor="end"
                height={axisBottom}
                minTickGap={axisShowDate ? 32 : 22}
                tickFormatter={(ms) =>
                  formatLocalChartAxisTick(ms as number, {
                    withDate: axisShowDate,
                  })
                }
                tick={{ fontSize: 11 }}
              />
              <YAxis
                domain={[0, errorRateDomainMax]}
                tick={{ fontSize: 11 }}
                width={40}
              />
              <Tooltip {...rechartsTooltipProps} labelFormatter={tooltipLabel} />
              <Area
                type="monotone"
                dataKey="errorRate"
                stroke={COLORS.danger}
                fillOpacity={1}
                fill="url(#statsColorError)"
                name="Taux d'erreur (%)"
                dot={showMarkers ? { r: 3, strokeWidth: 1 } : false}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
