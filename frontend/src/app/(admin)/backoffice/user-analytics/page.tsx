'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/auth'
import AdminLayout from '@/components/features/AdminLayout'
import { 
  BarChart3, 
  MousePointer, 
  AlertTriangle, 
  Zap, 
  Users, 
  Activity,
  TrendingUp,
  Clock,
  Globe
} from 'lucide-react'
import axios from 'axios'

interface UserStats {
  totalSessions: number
  activeSessions: number
  totalEvents: number
  totalErrors: number
  eventsByType: Array<{ type: string; count: number }>
  errorsByType: Array<{ type: string; count: number }>
  topPages: Array<{ page: string; count: number }>
  topActions: Array<{ action: string; count: number }>
}

interface UserEvent {
  id: string
  eventType: string
  eventName: string
  category: string
  page: string
  timestamp: string
  properties: any
}

interface UserError {
  id: string
  errorType: string
  errorName: string
  errorMessage: string
  severity: string
  page: string
  timestamp: string
  resolved: boolean
}

export default function UserAnalyticsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [events, setEvents] = useState<UserEvent[]>([])
  const [errors, setErrors] = useState<UserError[]>([])
  const [selectedDays, setSelectedDays] = useState(7)
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'errors' | 'performance'>('overview')

  useEffect(() => {
    loadData()
  }, [selectedDays])

  const loadData = async () => {
    if (!user) return

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      const [statsRes, eventsRes, errorsRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'}/api/v1/analytics/stats/${user.id}?days=${selectedDays}`, { headers }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'}/api/v1/analytics/events?limit=50`, { headers }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'}/api/v1/analytics/errors?limit=50`, { headers })
      ])

      if (statsRes.data.success) {
        setStats(statsRes.data.data)
      }
      if (eventsRes.data.success) {
        setEvents(eventsRes.data.data || [])
      }
      if (errorsRes.data.success) {
        setErrors(errorsRes.data.data || [])
      }
    } catch (error) {
      console.error('[ANALYTICS] Erreur chargement données:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              📊 Analytics Utilisateur
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Analyse des actions et comportements des utilisateurs
            </p>
          </div>
          <select
            value={selectedDays}
            onChange={(e) => setSelectedDays(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value={1}>Dernières 24h</option>
            <option value={7}>7 derniers jours</option>
            <option value={30}>30 derniers jours</option>
            <option value={90}>90 derniers jours</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
              { id: 'events', label: 'Événements', icon: MousePointer },
              { id: 'errors', label: 'Erreurs', icon: AlertTriangle },
              { id: 'performance', label: 'Performance', icon: Zap }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement des données...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && stats && (
              <div className="space-y-6">
                {/* Cartes de synthèse */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    icon={Users}
                    title="Sessions"
                    value={stats.totalSessions}
                    subtitle={`${stats.activeSessions} actives`}
                    color="blue"
                  />
                  <StatCard
                    icon={MousePointer}
                    title="Événements"
                    value={stats.totalEvents}
                    subtitle="Actions utilisateur"
                    color="green"
                  />
                  <StatCard
                    icon={AlertTriangle}
                    title="Erreurs"
                    value={stats.totalErrors}
                    subtitle="Problèmes détectés"
                    color="red"
                  />
                  <StatCard
                    icon={Activity}
                    title="Taux d'erreur"
                    value={stats.totalEvents > 0 ? ((stats.totalErrors / stats.totalEvents) * 100).toFixed(2) + '%' : '0%'}
                    subtitle="Erreurs / Événements"
                    color="yellow"
                  />
                </div>

                {/* Graphiques */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Événements par type */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                      Événements par type
                    </h3>
                    <div className="space-y-3">
                      {stats.eventsByType.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">{item.type}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${(item.count / stats.totalEvents) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-gray-900 dark:text-white font-medium w-12 text-right">
                              {item.count}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pages les plus visitées */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                      Pages les plus visitées
                    </h3>
                    <div className="space-y-3">
                      {stats.topPages.slice(0, 10).map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400 truncate flex-1">
                            {item.page || 'N/A'}
                          </span>
                          <span className="text-gray-900 dark:text-white font-medium ml-4">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions les plus fréquentes */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    Actions les plus fréquentes
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats.topActions.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {item.action}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {item.count} fois
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'events' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Événements récents
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Nom
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Page
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {events.map((event) => (
                        <tr key={event.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {event.eventType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {event.eventName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {event.page || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {new Date(event.timestamp).toLocaleString('fr-FR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'errors' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Erreurs récentes
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Message
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Sévérité
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Page
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {errors.map((error) => (
                        <tr key={error.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              {error.errorType}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-md truncate">
                            {error.errorMessage}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${
                                error.severity === 'critical'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  : error.severity === 'warning'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                              }`}
                            >
                              {error.severity}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {error.page || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {new Date(error.timestamp).toLocaleString('fr-FR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Métriques de performance
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Les métriques de performance seront affichées ici une fois collectées.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}

function StatCard({ icon: Icon, title, value, subtitle, color }: any) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
    yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

