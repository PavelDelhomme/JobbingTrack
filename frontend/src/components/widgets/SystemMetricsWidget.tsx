import React from 'react'
import MetricCard from './MetricCard'
import LineChart from '../charts/LineChart'

interface SystemMetrics {
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkIn: number
  networkOut: number
  uptime: string
}

interface SystemMetricsWidgetProps {
  metrics: SystemMetrics
  className?: string
}

export default function SystemMetricsWidget({ metrics, className = '' }: SystemMetricsWidgetProps) {
  // Données simulées pour le graphique de tendance CPU
  const cpuTrendData = [
    { label: '00:00', value: Math.max(0, metrics.cpuUsage - 20) },
    { label: '04:00', value: Math.max(0, metrics.cpuUsage - 15) },
    { label: '08:00', value: metrics.cpuUsage - 10 },
    { label: '12:00', value: metrics.cpuUsage },
    { label: '16:00', value: Math.min(100, metrics.cpuUsage + 5) },
    { label: '20:00', value: Math.min(100, metrics.cpuUsage + 10) },
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Métriques principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="CPU"
          value={`${metrics.cpuUsage}%`}
          change={{
            value: 5,
            label: 'vs hier'
          }}
          trend={metrics.cpuUsage > 80 ? 'up' : metrics.cpuUsage > 60 ? 'neutral' : 'down'}
          icon={<span className="text-blue-500">⚡</span>}
        />

        <MetricCard
          title="Mémoire"
          value={`${metrics.memoryUsage}%`}
          change={{
            value: 2,
            label: 'vs hier'
          }}
          trend={metrics.memoryUsage > 85 ? 'up' : metrics.memoryUsage > 70 ? 'neutral' : 'down'}
          icon={<span className="text-green-500">🧠</span>}
        />

        <MetricCard
          title="Disque"
          value={`${metrics.diskUsage}%`}
          change={{
            value: 1,
            label: 'vs hier'
          }}
          trend={metrics.diskUsage > 90 ? 'up' : 'neutral'}
          icon={<span className="text-purple-500">💾</span>}
        />

        <MetricCard
          title="Uptime"
          value={metrics.uptime}
          icon={<span className="text-orange-500">⏱️</span>}
        />
      </div>

      {/* Graphique de tendance CPU */}
      <div className="mt-6">
        <LineChart
          data={cpuTrendData}
          title="Utilisation CPU (24h)"
          color="#3B82F6"
          height={150}
        />
      </div>
    </div>
  )
}
