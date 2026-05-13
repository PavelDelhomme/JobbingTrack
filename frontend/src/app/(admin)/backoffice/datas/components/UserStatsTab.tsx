'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/auth'
import { FRONTEND_URLS } from '@/config/ports.config'
import { PieChart } from '@/lib/icons'
import Link from 'next/link'
import axios from 'axios'

const API_URL = FRONTEND_URLS.api

interface UserStatsData {
  totalSessions?: number
  activeSessions?: number
  totalEvents?: number
  totalErrors?: number
  eventsByType?: Array<{ type: string; count: number }>
  errorsByType?: Array<{ type: string; count: number }>
  topPages?: Array<{ page: string; count: number }>
  topActions?: Array<{ action: string; count: number }>
}

export default function UserStatsTab() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UserStatsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [days] = useState(30)

  useEffect(() => {
    if (user?.id) fetchStats()
    else setLoading(false)
  }, [user?.id])

  const fetchStats = async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(
        `${API_URL}/api/v1/analytics/stats/${user.id}?days=${days}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.data?.success && res.data?.data) {
        setStats(res.data.data)
      } else {
        setStats(null)
      }
    } catch (err: any) {
      console.error('Erreur chargement stats utilisateur:', err)
      setError(err.response?.data?.error || 'Service analytics indisponible.')
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <PieChart className="h-8 w-8 text-blue-600" />
          Stats utilisateur
        </h2>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Statistiques d&apos;usage (sessions, événements, erreurs) — données par utilisateur
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
          {error}
          <span className="block mt-1">
            Vérifiez que le dashboard-service (analytics) est démarré et que <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">make db-push-all</code> a été exécuté.
          </span>
        </div>
      )}

      {!user && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400">Connectez-vous pour afficher vos statistiques.</p>
        </div>
      )}

      {user && stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Sessions totales</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalSessions ?? 0}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Sessions actives</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.activeSessions ?? 0}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Événements</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalEvents ?? 0}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Erreurs</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.totalErrors ?? 0}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Vue détaillée (graphiques, pages, appareils) :{' '}
              <Link href="/b4ck0ff1ce/user-analytics" className="text-blue-600 dark:text-blue-400 underline">
                Analytics utilisateur
              </Link>
            </p>
          </div>
        </>
      )}

      {user && !stats && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400">Aucune statistique enregistrée pour le moment.</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            <Link href="/b4ck0ff1ce/user-analytics" className="text-blue-600 dark:text-blue-400 underline">Analytics utilisateur</Link> pour plus de détails.
          </p>
        </div>
      )}
    </div>
  )
}
