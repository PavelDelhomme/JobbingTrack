"use client";

import { memo, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { rechartsTooltipProps } from "@/lib/charts/rechartsTooltipTheme";

const CHART_COLORS = {
  stroke: "#3B82F6",
  stroke2: "#10B981",
};

function buildChartData(data: any[], valueKey: string) {
  return data.slice(-80).map((p: any) => {
    const ts = p.timestamp
      ? new Date(p.timestamp).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    const val = p[valueKey] ?? p[valueKey.replace(/_/g, "")] ?? 0;
    return {
      time: ts,
      value: Math.round(Number(val) * 10) / 10,
      full: p.timestamp ? new Date(p.timestamp).toLocaleString("fr-FR") : ts,
    };
  });
}

export const CpuSystemChart = memo(function CpuSystemChart({
  data,
}: {
  data: any[];
}) {
  const chartData = useMemo(() => {
    return data.slice(-80).map((point: any) => {
      const cpu =
        typeof point.cpu_percent === "number"
          ? point.cpu_percent
          : (point.cpuUsagePercent ?? 0);
      const ts = point.timestamp
        ? new Date(point.timestamp).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
      return {
        time: ts,
        cpu: Math.round(cpu * 10) / 10,
        full: point.timestamp
          ? new Date(point.timestamp).toLocaleString("fr-FR")
          : ts,
      };
    });
  }, [data]);

  if (chartData.length === 0) return null;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
        >
          <defs>
            <linearGradient
              id="analytics-cpu-gradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor={CHART_COLORS.stroke}
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor={CHART_COLORS.stroke}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#9ca3af"
            strokeOpacity={0.25}
            vertical={false}
          />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11 }}
            stroke="#9ca3af"
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            stroke="#9ca3af"
            unit="%"
            width={32}
          />
          <Tooltip
            {...rechartsTooltipProps}
            formatter={(value: number) => [`${value}%`, "CPU"]}
            labelFormatter={(_, payload) =>
              Array.isArray(payload) && payload[0]?.payload?.full
                ? payload[0].payload.full
                : ""
            }
          />
          <Area
            type="monotone"
            dataKey="cpu"
            stroke={CHART_COLORS.stroke}
            strokeWidth={2}
            fill="url(#analytics-cpu-gradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

export const MemoryChart = memo(function MemoryChart({
  data,
}: {
  data: any[];
}) {
  const chartData = useMemo(
    () => buildChartData(data, "memory_percent"),
    [data],
  );
  if (chartData.length === 0) return null;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
        >
          <defs>
            <linearGradient
              id="analytics-mem-gradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor={CHART_COLORS.stroke2}
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor={CHART_COLORS.stroke2}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#9ca3af"
            strokeOpacity={0.25}
            vertical={false}
          />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11 }}
            stroke="#9ca3af"
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            stroke="#9ca3af"
            unit="%"
            width={32}
          />
          <Tooltip
            {...rechartsTooltipProps}
            formatter={(v: number) => [`${v}%`, "Mémoire"]}
            labelFormatter={(_, p) =>
              Array.isArray(p) && p[0]?.payload?.full ? p[0].payload.full : ""
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={CHART_COLORS.stroke2}
            strokeWidth={2}
            fill="url(#analytics-mem-gradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

export const NetworkChart = memo(function NetworkChart({
  data,
}: {
  data: any[];
}) {
  const chartData = useMemo(() => {
    return data.slice(-80).map((p: any) => {
      const ts = p.timestamp
        ? new Date(p.timestamp).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
      const rx = Number(p.network_rx_mb ?? p.networkRxMb ?? 0);
      const tx = Number(p.network_tx_mb ?? p.networkTxMb ?? 0);
      return {
        time: ts,
        rx: Math.round(rx * 100) / 100,
        tx: Math.round(tx * 100) / 100,
        full: p.timestamp ? new Date(p.timestamp).toLocaleString("fr-FR") : ts,
      };
    });
  }, [data]);
  if (chartData.length === 0) return null;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#9ca3af"
            strokeOpacity={0.25}
            vertical={false}
          />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11 }}
            stroke="#9ca3af"
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="#9ca3af"
            unit=" Mo"
            width={40}
          />
          <Tooltip
            {...rechartsTooltipProps}
            labelFormatter={(_, p) =>
              Array.isArray(p) && p[0]?.payload?.full ? p[0].payload.full : ""
            }
          />
          <Line
            type="monotone"
            dataKey="rx"
            stroke={CHART_COLORS.stroke}
            strokeWidth={2}
            name="Rx (Mo)"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="tx"
            stroke={CHART_COLORS.stroke2}
            strokeWidth={2}
            name="Tx (Mo)"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

export const AvailabilityChart = memo(function AvailabilityChart({
  data,
}: {
  data: any[];
}) {
  const chartData = useMemo(
    () => buildChartData(data, "availability_percent"),
    [data],
  );
  if (chartData.length === 0) return null;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
        >
          <defs>
            <linearGradient
              id="analytics-avail-gradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#9ca3af"
            strokeOpacity={0.25}
            vertical={false}
          />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11 }}
            stroke="#9ca3af"
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            stroke="#9ca3af"
            unit="%"
            width={32}
          />
          <Tooltip
            {...rechartsTooltipProps}
            formatter={(v: number) => [`${v}%`, "Disponibilité"]}
            labelFormatter={(_, p) =>
              Array.isArray(p) && p[0]?.payload?.full ? p[0].payload.full : ""
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#analytics-avail-gradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
