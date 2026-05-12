'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/auth'
import { PieChart, Users, Building2, User, ChevronDown, ChevronRight } from '@/lib/icons'
import Link from 'next/link'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'

interface UserStatsData {
  totalSessions?: number
  activeSessions?: number
  totalEvents?: number
  totalErrors?: number
}

interface DashboardStats {
  users?: { total: number }
  applications?: { total: number }
  companies?: { total: number }
  contacts?: { total: number }
  interviews?: { total: number }
}

interface UserListItem {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
}

export default function UserStatsContent() {
  const { user: currentUser } = useAuth()
  const [globalStats, setGlobalStats] = useState<DashboardStats | null>(null)
  const [usersList, setUsersList] = useState<UserListItem[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userStatsCache, setUserStatsCache] = useState<Record<string, UserStatsData>>({})
  const [loadingGlobal, setLoadingGlobal] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingUserStats, setLoadingUserStats] = useState<string | null>(null)
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null)
  const [errorUsers, setErrorUsers] = useState<string | null>(null)
  const [days] = useState(30)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return
    axios.get(`${API_URL}/api/v1/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (res.data?.users !== undefined || res.data?.applications !== undefined)
          setGlobalStats(res.data)
        else
          setGlobalStats(null)
      })
      .catch(() => setErrorGlobal('Dashboard indisponible'))
      .finally(() => setLoadingGlobal(false))
    axios.get(`${API_URL}/api/v1/auth/users?limit=200`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const list = res.data?.users ?? res.data?.data?.users ?? []
        setUsersList(Array.isArray(list) ? list : [])
      })
      .catch(() => setErrorUsers('Liste utilisateurs indisponible'))
      .finally(() => setLoadingUsers(false))
  }, [])

  const fetchUserStats = (userId: string) => {
    if (userStatsCache[userId]) {
      setSelectedUserId(selectedUserId === userId ? null : userId)
      return
    }
    setLoadingUserStats(userId)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    axios.get(`${API_URL}/api/v1/analytics/stats/${userId}?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (res.data?.success && res.data?.data) {
          setUserStatsCache(prev => ({ ...prev, [userId]: res.data.data }))
          setSelectedUserId(userId)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingUserStats(null))
  }

  const displayName = (u: UserListItem) =>
    [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || u.id

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <PieChart className="h-8 w-8 text-blue-600" />
          Stats utilisateur
        </h2>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Statistiques globales et par utilisateur (sessions, événements, données)
        </p>
      </div>

      {/* Vue globale */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-gray-500" />
          Vue globale (données applicatives)
        </h3>
        {loadingGlobal && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        )}
        {errorGlobal && (
          <div className="mx-6 mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
            {errorGlobal}
          </div>
        )}
        {!loadingGlobal && globalStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 p-6">
            <StatTile label="Utilisateurs" value={globalStats.users?.total ?? 0} color="blue" />
            <StatTile label="Candidatures" value={globalStats.applications?.total ?? 0} color="purple" />
            <StatTile label="Entreprises" value={globalStats.companies?.total ?? 0} color="green" />
            <StatTile label="Contacts" value={globalStats.contacts?.total ?? 0} color="amber" />
            <StatTile label="Entretiens" value={globalStats.interviews?.total ?? 0} color="cyan" />
          </div>
        )}
      </section>

      {currentUser?.id && (
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
            <User className="h-5 w-5 text-gray-500" />
            Mes statistiques
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vue détaillée (sessions, événements, erreurs) :{' '}
            <Link href="/b4ck0ff1ce/user-analytics" className="text-blue-600 dark:text-blue-400 underline hover:no-underline">
              Analytics utilisateur
            </Link>
          </p>
        </section>
      )}

      {/* Stats par utilisateur */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-500" />
          Statistiques par utilisateur
        </h3>
        {loadingUsers && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        )}
        {errorUsers && (
          <div className="mx-6 mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
            {errorUsers}
          </div>
        )}
        {!loadingUsers && usersList.length > 0 && (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {usersList.map((u) => (
              <div key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <button
                  type="button"
                  onClick={() => fetchUserStats(u.id)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400">
                      {selectedUserId === u.id ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </span>
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold text-sm shrink-0">
                      {(u.firstName?.[0] || u.email?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {displayName(u)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {u.role}
                    </span>
                  </div>
                  {loadingUserStats === u.id && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 shrink-0" />
                  )}
                </button>
                {selectedUserId === u.id && (userStatsCache[u.id] || loadingUserStats === u.id) && (
                  <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/50 px-6 py-4 pl-[4.5rem]">
                    {loadingUserStats === u.id ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                      </div>
                    ) : userStatsCache[u.id] ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <StatTile label="Sessions" value={userStatsCache[u.id].totalSessions ?? 0} color="blue" small />
                        <StatTile label="Actives" value={userStatsCache[u.id].activeSessions ?? 0} color="green" small />
                        <StatTile label="Événements" value={userStatsCache[u.id].totalEvents ?? 0} color="purple" small />
                        <StatTile label="Erreurs" value={userStatsCache[u.id].totalErrors ?? 0} color="red" small />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {!loadingUsers && usersList.length === 0 && !errorUsers && (
          <p className="px-6 py-8 text-gray-500 dark:text-gray-400 text-center">Aucun utilisateur à afficher.</p>
        )}
      </section>
    </div>
  )
}

function StatTile({
  label,
  value,
  color,
  small
}: {
  label: string
  value: number
  color: 'blue' | 'green' | 'purple' | 'amber' | 'cyan' | 'red'
  small?: boolean
}) {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    amber: 'text-amber-600 dark:text-amber-400',
    cyan: 'text-cyan-600 dark:text-cyan-400',
    red: 'text-red-600 dark:text-red-400'
  }
  return (
    <div className={`rounded-lg border border-gray-200 dark:border-gray-600 p-3 ${small ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
      <p className={`text-gray-500 dark:text-gray-400 ${small ? 'text-xs' : 'text-sm'}`}>{label}</p>
      <p className={`font-bold ${colorClasses[color]} ${small ? 'text-lg' : 'text-2xl'} mt-0.5`}>{value}</p>
    </div>
  )
}
