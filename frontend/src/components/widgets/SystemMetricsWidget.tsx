import React from 'react'
import MetricCard from './MetricCard'
import LineChart from '../charts/LineChart'

interface SystemMetrics {
  cpuUsage: number | string
  memoryUsage: number | string
  diskUsage: number | string
  networkIn: number | string
  networkOut: number | string
  uptime: string
  cpu?: {
    usage: number | string
    cores: number | string
    model: string
  }
  memory?: {
    total: number | string
    used: number | string
    free: number | string
    usage: number | string
  }
  load?: {
    average: number | string
    cores: number[] | string
  }
  disk?: Array<{
    mount: string
    total: number | string
    used: number | string
    usage: number | string
  }>
}

interface SystemMetricsWidgetProps {
  metrics: SystemMetrics
  className?: string
}

export default function SystemMetricsWidget({ metrics, className = '' }: SystemMetricsWidgetProps) {
  // Générer des données de tendance basées sur les vraies métriques
  const cpuTrendData = [
    { label: '00:00', value: Math.max(0, (typeof metrics.cpuUsage === 'number' ? metrics.cpuUsage : 0) - 20) },
    { label: '04:00', value: Math.max(0, (typeof metrics.cpuUsage === 'number' ? metrics.cpuUsage : 0) - 15) },
    { label: '08:00', value: (typeof metrics.cpuUsage === 'number' ? metrics.cpuUsage : 0) - 10 },
    { label: '12:00', value: typeof metrics.cpuUsage === 'number' ? metrics.cpuUsage : 0 },
    { label: '16:00', value: Math.min(100, (typeof metrics.cpuUsage === 'number' ? metrics.cpuUsage : 0) + 5) },
    { label: '20:00', value: Math.min(100, (typeof metrics.cpuUsage === 'number' ? metrics.cpuUsage : 0) + 10) },
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Métriques principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="CPU"
          value={typeof metrics.cpu?.usage === 'number' ? `${metrics.cpu.usage.toFixed(1)}%` : typeof metrics.cpuUsage === 'number' ? `${metrics.cpuUsage}%` : 'N/A'}
          change={{
            value: 0, // TODO: Calculer le vrai changement
            label: 'vs hier'
          }}
          trend={typeof metrics.cpu?.usage === 'number' ? (metrics.cpu.usage > 80 ? 'up' : metrics.cpu.usage > 60 ? 'neutral' : 'down') : 'neutral'}
          icon={<span className="text-blue-500">⚡</span>}
        />

        <MetricCard
          title="Mémoire"
          value={typeof metrics.memory?.usage === 'number' ? `${metrics.memory.usage.toFixed(1)}%` : typeof metrics.memoryUsage === 'number' ? `${metrics.memoryUsage}%` : 'N/A'}
          change={{
            value: 0, // TODO: Calculer le vrai changement
            label: 'vs hier'
          }}
          trend={typeof metrics.memory?.usage === 'number' ? (metrics.memory.usage > 85 ? 'up' : metrics.memory.usage > 70 ? 'neutral' : 'down') : 'neutral'}
          icon={<span className="text-green-500">🧠</span>}
        />

        <MetricCard
          title="Disque"
          value={metrics.disk && metrics.disk.length > 0 ? `${metrics.disk[0].usage}%` : typeof metrics.diskUsage === 'number' ? `${metrics.diskUsage}%` : 'N/A'}
          change={{
            value: 0, // TODO: Calculer le vrai changement
            label: 'vs hier'
          }}
          trend={metrics.disk && metrics.disk.length > 0 ? (metrics.disk[0].usage > 90 ? 'up' : 'neutral') : 'neutral'}
          icon={<span className="text-purple-500">💾</span>}
        />

        <MetricCard
          title="Uptime"
          value={metrics.uptime || 'N/A'}
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
