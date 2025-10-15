import React from 'react'
import MetricCard from './MetricCard'
import BarChart from '../charts/BarChart'

interface BusinessMetrics {
  totalApplications: number
  totalCompanies: number
  totalContacts: number
  totalInterviews: number
  totalCalls: number
  totalFollowups: number
  recentActivity: {
    applications: number
    interviews: number
    calls: number
    followups: number
  }
}

interface BusinessMetricsWidgetProps {
  metrics: BusinessMetrics
  className?: string
}

export default function BusinessMetricsWidget({ metrics, className = '' }: BusinessMetricsWidgetProps) {
  // Données pour le graphique d'activité récente
  const activityData = [
    { label: 'Candidatures', value: metrics.recentActivity.applications },
    { label: 'Entretiens', value: metrics.recentActivity.interviews },
    { label: 'Appels', value: metrics.recentActivity.calls },
    { label: 'Relances', value: metrics.recentActivity.followups },
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Métriques principales */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Candidatures"
          value={metrics.totalApplications.toLocaleString()}
          change={{
            value: 12,
            label: 'cette semaine'
          }}
          trend="up"
          icon={<span className="text-blue-500">📝</span>}
        />

        <MetricCard
          title="Entreprises"
          value={metrics.totalCompanies.toLocaleString()}
          change={{
            value: 8,
            label: 'ce mois'
          }}
          trend="up"
          icon={<span className="text-green-500">🏢</span>}
        />

        <MetricCard
          title="Contacts"
          value={metrics.totalContacts.toLocaleString()}
          change={{
            value: 15,
            label: 'cette semaine'
          }}
          trend="up"
          icon={<span className="text-purple-500">👥</span>}
        />

        <MetricCard
          title="Entretiens"
          value={metrics.totalInterviews.toLocaleString()}
          change={{
            value: 5,
            label: 'cette semaine'
          }}
          trend="up"
          icon={<span className="text-orange-500">📅</span>}
        />

        <MetricCard
          title="Appels"
          value={metrics.totalCalls.toLocaleString()}
          change={{
            value: 3,
            label: 'aujourd\'hui'
          }}
          trend="neutral"
          icon={<span className="text-red-500">📞</span>}
        />

        <MetricCard
          title="Relances"
          value={metrics.totalFollowups.toLocaleString()}
          change={{
            value: 7,
            label: 'cette semaine'
          }}
          trend="up"
          icon={<span className="text-pink-500">📧</span>}
        />
      </div>

      {/* Graphique d'activité récente */}
      <div className="mt-6">
        <BarChart
          data={activityData}
          title="Activité récente (7 jours)"
          color="#10B981"
          height={200}
        />
      </div>
    </div>
  )
}
