'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/auth'
import AdminLayout from '@/components/features/AdminLayout'
import { 
  BarChart3, 
  MousePointer, 
  AlertTriangle, 
  Zap, 
  Users, 
  Activity,
  Smartphone
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

interface DeviceInfo {
  id: string
  deviceId: string
  platform: string
  deviceModel?: string
  appVersion?: string
  osName?: string
  osVersion?: string
  firstSeen: string
  lastSeen: string
  totalSessions: number
}

interface VersionsData {
  devices: DeviceInfo[]
  versionsByPlatform: Record<string, Array<{ appVersion: string; count: number }>>
  performances: Array<{ metricType?: string; metricName?: string; value?: number; timestamp: string }>
}

export default function UserAnalyticsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [events, setEvents] = useState<UserEvent[]>([])
  const [errors, setErrors] = useState<UserError[]>([])
  const [selectedDays, setSelectedDays] = useState(7)
  const [rangeMode, setRangeMode] = useState<'preset' | 'custom'>('preset')
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  })
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10))
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'errors' | 'performance' | 'mobile'>('overview')
  const [versionsData, setVersionsData] = useState<VersionsData | null>(null)
  const [eventsLoadError, setEventsLoadError] = useState<string | null>(null)

  const rangeQuery = useMemo(() => {
    if (rangeMode === 'custom') {
      const s = new Date(`${customStart}T00:00:00.000Z`).toISOString()
      const e = new Date(`${customEnd}T23:59:59.999Z`).toISOString()
      return `startDate=${encodeURIComponent(s)}&endDate=${encodeURIComponent(e)}`
    }
    return `days=${selectedDays}`
  }, [rangeMode, customStart, customEnd, selectedDays])

  const rangeDescription = useMemo(() => {
    if (rangeMode === 'custom') {
      return `Plage calendaire : ${customStart} → ${customEnd} (bornes UTC).`
    }
    const labels: Record<number, string> = {
      1: 'Dernière journée glissante (paramètre days=1)',
      7: '7 derniers jours',
      30: '30 derniers jours',
      90: '90 derniers jours',
    }
    return labels[selectedDays] || `Derniers ${selectedDays} jours`
  }, [rangeMode, customStart, customEnd, selectedDays])

  const loadData = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'
      const q = rangeQuery
      // Promise.allSettled pour ne pas faire échouer tout le chargement si une requête est bloquée (ex. uBlock sur /analytics/events)
      const results = await Promise.allSettled([
        axios.get(`${apiUrl}/api/v1/analytics/stats/${user.id}?${q}`, { headers }),
        axios.get(`${apiUrl}/api/v1/analytics/events?limit=100&${q}`, { headers }),
        axios.get(`${apiUrl}/api/v1/analytics/errors?limit=100&${q}`, { headers }),
        axios.get(`${apiUrl}/api/v1/analytics/stats/${user.id}/versions?${q}`, { headers }).catch(() => ({ data: { success: false } }))
      ])

      const [statsRes, eventsRes, errorsRes, versionsRes] = results.map((r) => (r.status === 'fulfilled' ? r.value : null))

      if (statsRes?.data?.success) {
        setStats(statsRes.data.data)
      }
      if (eventsRes?.data?.success) {
        setEvents(eventsRes.data.data || [])
        setEventsLoadError(null)
      } else if (results[1]?.status === 'rejected') {
        setEvents([])
        setEventsLoadError('Événements non disponibles (requête bloquée par une extension ou erreur réseau). Désactivez les bloqueurs de publicité sur ce site si besoin.')
      } else {
        setEventsLoadError(null)
      }
      if (errorsRes?.data?.success) {
        setErrors(errorsRes.data.data || [])
      }
      if (versionsRes?.data?.success && versionsRes.data?.data) {
        setVersionsData(versionsRes.data.data)
      } else {
        setVersionsData(null)
      }
    } catch (error) {
      console.error('[ANALYTICS] Erreur chargement données:', error)
    } finally {
      setLoading(false)
    }
  }, [user, rangeQuery])

  useEffect(() => {
    void loadData()
  }, [loadData])

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
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{rangeDescription}</p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">Mode</label>
              <select
                value={rangeMode}
                onChange={(e) => setRangeMode(e.target.value as 'preset' | 'custom')}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="preset">Périodes rapides</option>
                <option value="custom">Plage personnalisée</option>
              </select>
              {rangeMode === 'preset' ? (
                <select
                  value={selectedDays}
                  onChange={(e) => setSelectedDays(Number(e.target.value))}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value={1}>1 jour (glissant)</option>
                  <option value={7}>7 jours</option>
                  <option value={30}>30 jours</option>
                  <option value={90}>90 jours</option>
                </select>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                    Du
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                    au
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
              { id: 'events', label: 'Événements', icon: MousePointer },
              { id: 'errors', label: 'Erreurs', icon: AlertTriangle },
              { id: 'performance', label: 'Performance', icon: Zap },
              { id: 'mobile', label: 'Versions & App mobile', icon: Smartphone }
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
                {eventsLoadError && (
                  <div className="mx-6 mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 text-sm">
                    {eventsLoadError}
                  </div>
                )}
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
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                    Métriques de performance (période sélectionnée)
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Données issues de <code className="text-xs">/analytics/stats/…/versions</code> (même fenêtre que
                    l’onglet Versions). Les détails par appareil restent dans l’onglet « Versions & App mobile ».
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
                  {versionsData?.performances?.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                              Type
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                              Métrique
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                              Valeur
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                              Date
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {versionsData.performances.map((p: any, i: number) => (
                            <tr key={i}>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{p.metricType || '—'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{p.metricName || '—'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                {p.value != null ? p.value : '—'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                {new Date(p.timestamp).toLocaleString('fr-FR')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">
                      Aucune métrique sur cette période. Les mesures sont enregistrées côté mobile / web lorsque le client
                      envoie des événements performance.
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'mobile' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    Appareils enregistrés
                  </h3>
                  {versionsData?.devices?.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Plateforme</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Modèle / OS</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Version app</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sessions</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Dernière activité</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {versionsData.devices.map((d) => (
                            <tr key={d.id}>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{d.platform}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{d.deviceModel || d.osName || '—'}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{d.appVersion || '—'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{d.totalSessions}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{new Date(d.lastSeen).toLocaleString('fr-FR')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">Aucun appareil enregistré. Les appareils sont enregistrés lorsque vous utilisez l’app mobile (ou le web avec envoi de device).</p>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    Versions utilisées par plateforme
                  </h3>
                  {versionsData?.versionsByPlatform && Object.keys(versionsData.versionsByPlatform).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(versionsData.versionsByPlatform).map(([platform, versions]) => (
                        <div key={platform}>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{platform}</p>
                          <ul className="flex flex-wrap gap-2">
                            {versions.map((v, i) => (
                              <li key={i} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">
                                {v.appVersion} <span className="text-gray-500 dark:text-gray-400">({v.count} événements)</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">Aucune version enregistrée. La version est envoyée avec les événements (app mobile ou web).</p>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    Métriques performance (app / web)
                  </h3>
                  {versionsData?.performances?.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Métrique</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Valeur</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {versionsData.performances.map((p: any, i: number) => (
                            <tr key={i}>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{p.metricType || '—'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{p.metricName || '—'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{p.value != null ? p.value : '—'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{new Date(p.timestamp).toLocaleString('fr-FR')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">Aucune métrique de performance enregistrée.</p>
                  )}
                </div>
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

