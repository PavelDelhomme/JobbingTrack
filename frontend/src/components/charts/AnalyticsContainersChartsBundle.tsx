"use client";

import { useEffect, useMemo, useState, type Key } from "react";
import {
  Brush,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartPeriodCaption } from "@/components/analytics/ChartPeriodCaption";
import {
  formatLocalChartAxisTick,
  formatLocalDateTime,
} from "@/lib/utils/date";
import { rechartsTooltipProps } from "@/lib/charts/rechartsTooltipTheme";
import { useSyncedChartBrushRange } from "@/lib/charts/useSyncedChartBrushRange";

function formatPercentTick(value: number | string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n)}%`;
}

function percentDomainMax(dataMax: number): number {
  if (!Number.isFinite(dataMax) || dataMax <= 100) return 100;
  return Math.min(400, Math.ceil(dataMax / 25) * 25);
}

const LINE_PATTERNS = [
  { label: "plein", dash: undefined },
  { label: "tirets", dash: "8 4" },
  { label: "points", dash: "2 4" },
  { label: "mixte", dash: "10 3 2 3" },
  { label: "long", dash: "14 5" },
] as const;

const SERIES_MARKERS = [
  { label: "rond", legendType: "circle" },
  { label: "carré", legendType: "square" },
  { label: "losange", legendType: "diamond" },
  { label: "triangle", legendType: "triangle" },
  { label: "croix", legendType: "cross" },
  { label: "plus", legendType: "cross" },
  { label: "hexagone", legendType: "diamond" },
  { label: "étoile", legendType: "star" },
  { label: "barre", legendType: "line" },
  { label: "chevron", legendType: "triangle" },
  { label: "capsule", legendType: "rect" },
  { label: "anneau", legendType: "circle" },
] as const;

const CONTAINER_SERIES_COLORS = [
  "#0057FF", // bleu électrique
  "#FF6B00", // orange
  "#7A00FF", // violet franc
  "#00A6A6", // turquoise
  "#E00022", // rouge
  "#F5C400", // jaune
  "#D000A7", // magenta
  "#146C2E", // vert profond
  "#8A5A00", // brun
  "#00B8D9", // cyan
  "#B00020", // bordeaux
  "#7CB900", // lime
  "#3344DD", // indigo
  "#FF2D75", // rose
  "#00796B", // teal foncé
  "#FF9F1C", // ambre
  "#5C2D91", // prune
  "#009B4D", // vert émeraude
  "#E65100", // orange brûlé
  "#00D084", // menthe
  "#8B1E3F", // framboise sombre
  "#0082C8", // azur
  "#A16207", // ocre
  "#C026D3", // fuchsia violet
] as const;

function seriesPattern(index: number) {
  return LINE_PATTERNS[index % LINE_PATTERNS.length];
}

function seriesMarker(index: number) {
  return SERIES_MARKERS[index % SERIES_MARKERS.length];
}

function seriesCode(index: number) {
  return `C${index + 1}`;
}

function contrastingTextColor(hex: string) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? "#111827" : "#FFFFFF";
}

function buildContainerSeriesColorMap(seriesNames: string[]) {
  return seriesNames.reduce<Record<string, string>>((acc, name, index) => {
    acc[name] = CONTAINER_SERIES_COLORS[index % CONTAINER_SERIES_COLORS.length];
    return acc;
  }, {});
}

function SeriesSymbol({
  index,
  color,
  size = 14,
}: {
  index: number;
  color: string;
  size?: number;
}) {
  const marker = seriesMarker(index).label;
  const mid = size / 2;

  if (marker === "carré") {
    return (
      <rect
        x={3}
        y={3}
        width={size - 6}
        height={size - 6}
        fill={color}
        rx={2}
      />
    );
  }
  if (marker === "losange") {
    return (
      <path
        d={`M ${mid} 2 L ${size - 2} ${mid} L ${mid} ${size - 2} L 2 ${mid} Z`}
        fill={color}
      />
    );
  }
  if (marker === "triangle") {
    return (
      <path
        d={`M ${mid} 2 L ${size - 2} ${size - 2} L 2 ${size - 2} Z`}
        fill={color}
      />
    );
  }
  if (marker === "croix") {
    return (
      <>
        <line
          x1={3}
          y1={3}
          x2={size - 3}
          y2={size - 3}
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <line
          x1={size - 3}
          y1={3}
          x2={3}
          y2={size - 3}
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
        />
      </>
    );
  }
  if (marker === "plus") {
    return (
      <>
        <line
          x1={mid}
          y1={3}
          x2={mid}
          y2={size - 3}
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <line
          x1={3}
          y1={mid}
          x2={size - 3}
          y2={mid}
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
        />
      </>
    );
  }
  if (marker === "hexagone") {
    return (
      <path
        d={`M ${mid} 2 L ${size - 3} ${size * 0.28} L ${size - 3} ${size * 0.72} L ${mid} ${size - 2} L 3 ${size * 0.72} L 3 ${size * 0.28} Z`}
        fill={color}
      />
    );
  }
  if (marker === "étoile") {
    return (
      <path
        d={`M ${mid} 1.5 L ${mid + 2} ${mid - 1.5} L ${size - 2} ${mid - 1.5} L ${mid + 2.5} ${mid + 1} L ${mid + 4} ${size - 2} L ${mid} ${mid + 2.5} L ${mid - 4} ${size - 2} L ${mid - 2.5} ${mid + 1} L 2 ${mid - 1.5} L ${mid - 2} ${mid - 1.5} Z`}
        fill={color}
      />
    );
  }
  if (marker === "barre") {
    return (
      <rect x={2} y={mid - 2} width={size - 4} height={4} fill={color} rx={2} />
    );
  }
  if (marker === "chevron") {
    return (
      <path
        d={`M 3 3 L ${mid} ${size - 3} L ${size - 3} 3`}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  if (marker === "capsule") {
    return (
      <rect
        x={2}
        y={4}
        width={size - 4}
        height={size - 8}
        fill={color}
        rx={size / 2}
      />
    );
  }
  if (marker === "anneau") {
    return (
      <circle
        cx={mid}
        cy={mid}
        r={Math.max(3, size / 3)}
        fill="none"
        stroke={color}
        strokeWidth={3}
      />
    );
  }
  return <circle cx={mid} cy={mid} r={Math.max(3, size / 3)} fill={color} />;
}

type SeriesPointDotProps = {
  cx?: number;
  cy?: number;
  index?: number;
  stroke?: string;
  seriesIndex: number;
  markerEvery: number;
};

function renderSeriesPointDot(
  props: SeriesPointDotProps & { key?: Key },
  seriesIndex: number,
  markerEvery: number,
) {
  const { key, ...dotProps } = props;
  return (
    <SeriesPointDot
      key={key}
      {...dotProps}
      seriesIndex={seriesIndex}
      markerEvery={markerEvery}
    />
  );
}

function SeriesPointDot(props: SeriesPointDotProps) {
  const { cx, cy, index, stroke, seriesIndex, markerEvery } = props;
  if (
    typeof cx !== "number" ||
    typeof cy !== "number" ||
    typeof index !== "number" ||
    index % markerEvery !== 0
  ) {
    return null;
  }

  const code = seriesCode(seriesIndex);
  const width = Math.max(20, code.length * 8 + 8);
  const height = 16;
  const color = stroke || "#64748b";
  return (
    <svg
      x={cx - width / 2}
      y={cy - height / 2}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      <rect
        x={0.75}
        y={0.75}
        width={width - 1.5}
        height={height - 1.5}
        rx={5}
        fill={color}
        stroke="rgba(255,255,255,0.9)"
        strokeWidth={1.5}
      />
      <text
        x={width / 2}
        y={height / 2 + 4}
        textAnchor="middle"
        fontSize={10}
        fontWeight={800}
        fill={contrastingTextColor(color)}
      >
        {code}
      </text>
    </svg>
  );
}

function SeriesVisibilityControls({
  title,
  seriesNames,
  visibleNames,
  colors,
  onToggle,
  onShowAll,
  onHideAll,
}: {
  title: string;
  seriesNames: string[];
  visibleNames: string[];
  colors: Record<string, string>;
  onToggle: (name: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
}) {
  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {title} · {visibleNames.length}/{seriesNames.length} visible(s)
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onShowAll}
            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-white dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Tout afficher
          </button>
          <button
            type="button"
            onClick={onHideAll}
            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-white dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Tout masquer
          </button>
        </div>
      </div>
      <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
        {seriesNames.map((name, index) => {
          const active = visibleNames.includes(name);
          const pattern = seriesPattern(index);
          const marker = seriesMarker(index);
          const code = seriesCode(index);
          const color = colors[name];
          return (
            <button
              key={name}
              type="button"
              onClick={() => onToggle(name)}
              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition ${
                active
                  ? "border-gray-300 bg-white text-gray-900 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  : "border-gray-200 bg-gray-100 text-gray-400 opacity-70 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-500"
              }`}
              title={`${code} · ${name} (${marker.label}, ${pattern.label})`}
            >
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                style={{
                  backgroundColor: color,
                  color: contrastingTextColor(color),
                }}
              >
                {code}
              </span>
              <svg width="34" height="10" viewBox="0 0 34 10" aria-hidden>
                <line
                  x1="1"
                  y1="5"
                  x2="33"
                  y2="5"
                  stroke={color}
                  strokeWidth="2.5"
                  strokeDasharray={pattern.dash}
                  strokeLinecap="round"
                />
                <g transform="translate(12 -2)">
                  <SeriesSymbol index={index} color={color} size={14} />
                </g>
              </svg>
              <span className="max-w-[10rem] truncate">{name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type AnalyticsContainersChartsBundleProps = {
  mode: "multi" | "single";
  rangeLabel: string;
  chartXDomainMin: number;
  chartXDomainMax: number;
  containerAxisShowDate: boolean;
  chartData: Record<string, string | number | null>[];
  containerNamesForChart: string[];
  /** Titre court (ex. sans préfixe jobbingtrack-) pour le mode single */
  selectedContainerLabel: string;
  rawMetricsLength: number;
};

/** Recharts pour Performances — conteneurs (`/backoffice/performances/containers`) — chunk séparé via `dynamic` sur la page. */
export function AnalyticsContainersChartsBundle({
  mode,
  rangeLabel,
  chartXDomainMin,
  chartXDomainMax,
  containerAxisShowDate,
  chartData,
  containerNamesForChart,
  selectedContainerLabel,
  rawMetricsLength,
}: AnalyticsContainersChartsBundleProps) {
  const seriesColors = useMemo(
    () => buildContainerSeriesColorMap(containerNamesForChart),
    [containerNamesForChart],
  );
  const [cpuVisibleNames, setCpuVisibleNames] = useState<string[] | null>(null);
  const [memoryVisibleNames, setMemoryVisibleNames] = useState<string[] | null>(
    null,
  );

  const cpuSeriesNames = useMemo(
    () => cpuVisibleNames ?? containerNamesForChart,
    [containerNamesForChart, cpuVisibleNames],
  );
  const memorySeriesNames = useMemo(
    () => memoryVisibleNames ?? containerNamesForChart,
    [containerNamesForChart, memoryVisibleNames],
  );

  useEffect(() => {
    setCpuVisibleNames((current) =>
      current == null
        ? current
        : current.filter((name) => containerNamesForChart.includes(name)),
    );
    setMemoryVisibleNames((current) =>
      current == null
        ? current
        : current.filter((name) => containerNamesForChart.includes(name)),
    );
  }, [containerNamesForChart]);

  const cpuMarkerEvery = useMemo(
    () =>
      Math.max(
        10,
        Math.ceil(chartData.length / 4),
        Math.ceil(
          (chartData.length * Math.max(cpuSeriesNames.length, 1)) / 120,
        ),
      ),
    [chartData.length, cpuSeriesNames.length],
  );
  const memoryMarkerEvery = useMemo(
    () =>
      Math.max(
        10,
        Math.ceil(chartData.length / 4),
        Math.ceil(
          (chartData.length * Math.max(memorySeriesNames.length, 1)) / 120,
        ),
      ),
    [chartData.length, memorySeriesNames.length],
  );

  const { brushStart, brushEnd, onBrushChange, resetBrush, hasCustomBrush } =
    useSyncedChartBrushRange(chartData.length, 80);

  const chartBottom = containerAxisShowDate ? 72 : 60;
  const chartBottomBrush = chartBottom + 24;
  const showSyncedBrush = chartData.length > 0;

  const toggleCpuSeries = (name: string) => {
    setCpuVisibleNames((current) => {
      const base = current ?? containerNamesForChart;
      return base.includes(name)
        ? base.filter((item) => item !== name)
        : [...base, name];
    });
  };

  const toggleMemorySeries = (name: string) => {
    setMemoryVisibleNames((current) => {
      const base = current ?? containerNamesForChart;
      return base.includes(name)
        ? base.filter((item) => item !== name)
        : [...base, name];
    });
  };

  if (mode === "multi") {
    return (
      <>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Tous les conteneurs — CPU (%)
          </h2>
          <ChartPeriodCaption label={rangeLabel} />
          <SeriesVisibilityControls
            title="Séries CPU"
            seriesNames={containerNamesForChart}
            visibleNames={cpuSeriesNames}
            colors={seriesColors}
            onToggle={toggleCpuSeries}
            onShowAll={() => setCpuVisibleNames([...containerNamesForChart])}
            onHideAll={() => setCpuVisibleNames([])}
          />
          <div className="w-full min-h-[260px] sm:min-h-[400px]">
            <ResponsiveContainer width="100%" height={400} minHeight={260}>
              <LineChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: showSyncedBrush ? chartBottomBrush : chartBottom,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                <XAxis
                  dataKey="timeMs"
                  type="number"
                  domain={[chartXDomainMin, chartXDomainMax]}
                  angle={containerAxisShowDate ? -40 : -35}
                  textAnchor="end"
                  height={containerAxisShowDate ? 72 : 60}
                  minTickGap={containerAxisShowDate ? 32 : 22}
                  tickFormatter={(ms) =>
                    formatLocalChartAxisTick(ms, {
                      withDate: containerAxisShowDate,
                    })
                  }
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  domain={[0, percentDomainMax]}
                  tickFormatter={formatPercentTick}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  {...rechartsTooltipProps}
                  labelFormatter={(_, payload) => {
                    const ts = payload?.[0]?.payload?.timestamp;
                    return ts != null ? formatLocalDateTime(String(ts)) : "—";
                  }}
                />
                {cpuSeriesNames.map((shortName) => {
                  const seriesIndex = containerNamesForChart.indexOf(shortName);
                  const style = seriesPattern(seriesIndex);
                  const marker = seriesMarker(seriesIndex);
                  const code = seriesCode(seriesIndex);
                  return (
                    <Line
                      key={`cpu_${shortName}`}
                      type="monotone"
                      dataKey={`cpu_${shortName}`}
                      stroke={seriesColors[shortName]}
                      strokeDasharray={style.dash}
                      strokeWidth={2.4}
                      name={`${code} · ${shortName} · ${marker.label}`}
                      dot={(props) =>
                        renderSeriesPointDot(props, seriesIndex, cpuMarkerEvery)
                      }
                      activeDot={{ r: 4 }}
                      connectNulls={false}
                    />
                  );
                })}
                {showSyncedBrush ? (
                  <Brush
                    dataKey="timeMs"
                    height={18}
                    travellerWidth={8}
                    startIndex={brushStart}
                    endIndex={brushEnd}
                    tickFormatter={(ms) =>
                      formatLocalChartAxisTick(ms as number, {
                        withDate: containerAxisShowDate,
                      })
                    }
                    onChange={onBrushChange}
                  />
                ) : null}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Tous les conteneurs — Mémoire (%)
          </h2>
          <ChartPeriodCaption label={rangeLabel} />
          <SeriesVisibilityControls
            title="Séries mémoire"
            seriesNames={containerNamesForChart}
            visibleNames={memorySeriesNames}
            colors={seriesColors}
            onToggle={toggleMemorySeries}
            onShowAll={() => setMemoryVisibleNames([...containerNamesForChart])}
            onHideAll={() => setMemoryVisibleNames([])}
          />
          <div className="w-full min-h-[260px] sm:min-h-[400px]">
            <ResponsiveContainer width="100%" height={400} minHeight={260}>
              <LineChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: showSyncedBrush ? chartBottomBrush : chartBottom,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                <XAxis
                  dataKey="timeMs"
                  type="number"
                  domain={[chartXDomainMin, chartXDomainMax]}
                  angle={containerAxisShowDate ? -40 : -35}
                  textAnchor="end"
                  height={containerAxisShowDate ? 72 : 60}
                  minTickGap={containerAxisShowDate ? 32 : 22}
                  tickFormatter={(ms) =>
                    formatLocalChartAxisTick(ms, {
                      withDate: containerAxisShowDate,
                    })
                  }
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={formatPercentTick}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  {...rechartsTooltipProps}
                  labelFormatter={(_, payload) => {
                    const ts = payload?.[0]?.payload?.timestamp;
                    return ts != null ? formatLocalDateTime(String(ts)) : "—";
                  }}
                />
                {memorySeriesNames.map((shortName) => {
                  const seriesIndex = containerNamesForChart.indexOf(shortName);
                  const style = seriesPattern(seriesIndex);
                  const marker = seriesMarker(seriesIndex);
                  const code = seriesCode(seriesIndex);
                  return (
                    <Line
                      key={`memory_${shortName}`}
                      type="monotone"
                      dataKey={`memory_${shortName}`}
                      stroke={seriesColors[shortName]}
                      strokeDasharray={style.dash}
                      strokeWidth={2.4}
                      name={`${code} · ${shortName} · ${marker.label}`}
                      dot={(props) =>
                        renderSeriesPointDot(
                          props,
                          seriesIndex,
                          memoryMarkerEvery,
                        )
                      }
                      activeDot={{ r: 4 }}
                      connectNulls={false}
                    />
                  );
                })}
                {showSyncedBrush ? (
                  <Brush
                    dataKey="timeMs"
                    height={18}
                    travellerWidth={8}
                    startIndex={brushStart}
                    endIndex={brushEnd}
                    tickFormatter={(ms) =>
                      formatLocalChartAxisTick(ms as number, {
                        withDate: containerAxisShowDate,
                      })
                    }
                    onChange={onBrushChange}
                  />
                ) : null}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
          <p>
            {containerNamesForChart.length} conteneur(s) · {chartData.length}{" "}
            points affichés
          </p>
          {showSyncedBrush ? (
            <p>
              Glissez la barre brush sous un des graphiques pour zoomer CPU et
              mémoire sur la même fenêtre.
            </p>
          ) : null}
          {hasCustomBrush ? (
            <button
              type="button"
              onClick={resetBrush}
              className="text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Réinitialiser le zoom
            </button>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 min-w-0">
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {selectedContainerLabel} — CPU et mémoire (%)
      </h2>
      <ChartPeriodCaption label={rangeLabel} />
      <div className="w-full min-h-[260px] sm:min-h-[400px]">
        <ResponsiveContainer width="100%" height={400} minHeight={260}>
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: showSyncedBrush ? chartBottomBrush : chartBottom,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
            <XAxis
              dataKey="timeMs"
              type="number"
              domain={[chartXDomainMin, chartXDomainMax]}
              angle={containerAxisShowDate ? -40 : -35}
              textAnchor="end"
              height={containerAxisShowDate ? 72 : 60}
              minTickGap={containerAxisShowDate ? 32 : 22}
              tickFormatter={(ms) =>
                formatLocalChartAxisTick(ms, {
                  withDate: containerAxisShowDate,
                })
              }
              tick={{ fontSize: 12 }}
            />
            <YAxis
              domain={[0, percentDomainMax]}
              tickFormatter={formatPercentTick}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              {...rechartsTooltipProps}
              labelFormatter={(_, payload: unknown) => {
                const ts = (
                  payload as Array<{ payload?: { timestamp?: string } }>
                )?.[0]?.payload?.timestamp;
                return ts != null ? formatLocalDateTime(ts) : "—";
              }}
              formatter={
                ((value: unknown, name: string) => [
                  value != null && typeof value === "number"
                    ? `${Number(value).toFixed(2)}%`
                    : "—",
                  name === "cpu" ? "CPU" : "Mémoire",
                ]) as (value: unknown, name: string) => [string, string]
              }
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="cpu"
              stroke="#3B82F6"
              strokeWidth={2}
              strokeDasharray={undefined}
              name="CPU %"
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="memory"
              stroke="#10B981"
              strokeWidth={2}
              strokeDasharray="8 4"
              name="Mémoire %"
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
            {showSyncedBrush ? (
              <Brush
                dataKey="timeMs"
                height={18}
                travellerWidth={8}
                startIndex={brushStart}
                endIndex={brushEnd}
                tickFormatter={(ms) =>
                  formatLocalChartAxisTick(ms as number, {
                    withDate: containerAxisShowDate,
                  })
                }
                onChange={onBrushChange}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400 mt-2">
        <p>
          {rawMetricsLength} points → {chartData.length} affichés
        </p>
        {hasCustomBrush ? (
          <button
            type="button"
            onClick={resetBrush}
            className="text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Réinitialiser le zoom
          </button>
        ) : null}
      </div>
    </div>
  );
}
