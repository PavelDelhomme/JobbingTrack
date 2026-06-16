"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Clock,
  Cpu,
  MemoryStick,
  Network,
  TrendingUp,
  Zap,
} from "lucide-react";
import { rechartsTooltipProps } from "@/lib/charts/rechartsTooltipTheme";

const COLORS = {
  primary: "#3B82F6",
  secondary: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#8B5CF6",
  success: "#22C55E",
  purple: "#A855F7",
  cyan: "#06B6D4",
};

export const AVAILABLE_METRICS = [
  { key: "cpu_percent", label: "CPU (%)", color: COLORS.primary, icon: Cpu },
  {
    key: "memory_percent",
    label: "Mémoire (%)",
    color: COLORS.secondary,
    icon: MemoryStick,
  },
  {
    key: "network_rx_mb",
    label: "Réseau RX (MB)",
    color: COLORS.info,
    icon: Network,
  },
  {
    key: "network_tx_mb",
    label: "Réseau TX (MB)",
    color: COLORS.warning,
    icon: Network,
  },
  {
    key: "response_time_avg",
    label: "Temps de réponse (ms)",
    color: COLORS.purple,
    icon: Clock,
  },
  {
    key: "error_rate",
    label: "Taux d'erreur (%)",
    color: COLORS.danger,
    icon: Activity,
  },
  {
    key: "availability_percent",
    label: "Disponibilité (%)",
    color: COLORS.success,
    icon: TrendingUp,
  },
  {
    key: "load_score",
    label: "Score de charge",
    color: COLORS.cyan,
    icon: Zap,
  },
] as const;

export type TestsPerformanceMetricPoint = {
  timestamp: string;
  cpu_percent: number;
  memory_percent: number;
  network_rx_mb: number;
  network_tx_mb: number;
  response_time_avg: number;
  error_rate: number;
  availability_percent: number;
  load_score: number;
};

export function TestsPerformanceRealtimeChart({
  metricsData,
  selectedMetrics,
}: {
  metricsData: TestsPerformanceMetricPoint[];
  selectedMetrics: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={500}>
      <LineChart data={metricsData}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
        <XAxis
          dataKey="timestamp"
          stroke="#9CA3AF"
          style={{ fontSize: "12px" }}
        />
        <YAxis stroke="#9CA3AF" style={{ fontSize: "12px" }} />
        <Tooltip {...rechartsTooltipProps} />
        <Legend />
        {AVAILABLE_METRICS.filter((m) => selectedMetrics.includes(m.key)).map(
          (metric) => (
            <Line
              key={metric.key}
              type="monotone"
              dataKey={metric.key}
              stroke={metric.color}
              strokeWidth={2}
              name={metric.label}
              dot={false}
              isAnimationActive={false}
            />
          ),
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
