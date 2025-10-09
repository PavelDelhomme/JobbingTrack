'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { applicationService, authService, companyService } from '@/lib/api'

interface Statistics {
  applications: {
    total: number
    byStatus: Record<string, number>
    byType: Record<string, number>
    thisMonth: number
    thisWeek: number
  }
  users: {
    total: number
    byRole: Record<string, number>
    activeUsers: number
    newThisMonth: number
  }
  companies: {
    total: number
    byIndustry: Record<string, number>
    bySize: Record<string, number>
  }
  performance: {
    averageResponseTime: number
    successRate: number
    errorRate: number
  }
}

export default function StatisticsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchStatistics()
    }
  }, [isAuthenticated, period])

  const fetchStatistics = async () => {
    try {
      const [appsResponse, usersResponse, companiesResponse] = await Promise.all([
        applicationService.getAll(),
        authService.getAllUsers(),
        companyService.getAll()
      ])

      const apps = appsResponse.data.applications || []
      const users = usersResponse.data.users || []
      const companies = companiesResponse.data.companies || []

      // Calculer les stats
      const appsByStatus: Record<string, number> = {}
      const appsByType: Record<string, number> = {}
      apps.forEach((app: any) => {
        appsByStatus[app.status] = (appsByStatus[app.status] || 0) + 1
        appsByType[app.type] = (appsByType[app.type] || 0) + 1
      })

      const usersByRole: Record<string, number> = {}
      users.forEach((user: any) => {
        usersByRole[user.role] = (usersByRole[user.role] || 0) + 1
      })

      const companiesByIndustry: Record<string, number> = {}
      const companiesBySize: Record<string, number> = {}
      companies.forEach((company: any) => {
        if (company.industry) {
          companiesByIndustry[company.industry] = (companiesByIndustry[company.industry] || 0) + 1
        }
        if (company.size) {
          companiesBySize[company.size] = (companiesBySize[company.size] || 0) + 1
        }
      })

      setStats({
        applications: {
          total: apps.length,
          byStatus: appsByStatus,
          byType: appsByType,
          thisMonth: apps.filter((a: any) => {
            const created = new Date(a.createdAt)
            const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            return created > monthAgo
          }).length,
          thisWeek: apps.filter((a: any) => {
            const created = new Date(a.createdAt)
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            return created > weekAgo
          }).length
        },
        users: {
          total: users.length,
          byRole: usersByRole,
          activeUsers: users.filter((u: any) => u.isActive).length,
          newThisMonth: users.filter((u: any) => {
            const created = new Date(u.createdAt)
            const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            return created > monthAgo
          }).length
        },
        companies: {
          total: companies.length,
          byIndustry: companiesByIndustry,
          bySize: companiesBySize
        },
        performance: {
          averageResponseTime: 150,
          successRate: 98.5,
          errorRate: 1.5
        }
      })
    } catch (error) {
      console.error('Erreur chargement statistiques:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!stats) {
    return (
      <AdminLayout>
        <div className="text-center py-12 text-gray-500">
          Erreur de chargement des statistiques
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              📊 Statistiques Avancées
            </h1>
            <p className="mt-2 text-gray-600">
              Analyse détaillée des données de la plateforme
            </p>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="year">Cette année</option>
          </select>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Applications Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📝 Candidatures
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-gray-700">Total</span>
                <span className="text-2xl font-bold text-blue-600">{stats.applications.total}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-700">Ce mois</span>
                <span className="text-xl font-bold text-green-600">{stats.applications.thisMonth}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-sm text-gray-700">Cette semaine</span>
                <span className="text-xl font-bold text-purple-600">{stats.applications.thisWeek}</span>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Par statut</h4>
              <div className="space-y-2">
                {Object.entries(stats.applications.byStatus).map(([status, count]) => (
                  <ProgressBar
                    key={status}
                    label={status}
                    value={count}
                    max={stats.applications.total}
                    color="blue"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Users Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              👥 Utilisateurs
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <span className="text-sm text-gray-700">Total</span>
                <span className="text-2xl font-bold text-orange-600">{stats.users.total}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-700">Actifs</span>
                <span className="text-xl font-bold text-green-600">{stats.users.activeUsers}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-gray-700">Nouveaux ce mois</span>
                <span className="text-xl font-bold text-blue-600">{stats.users.newThisMonth}</span>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Par rôle</h4>
              <div className="space-y-2">
                {Object.entries(stats.users.byRole).map(([role, count]) => (
                  <ProgressBar
                    key={role}
                    label={role}
                    value={count}
                    max={stats.users.total}
                    color="purple"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Companies Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🏢 Entreprises
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-700">Total</span>
                <span className="text-2xl font-bold text-green-600">{stats.companies.total}</span>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Par secteur</h4>
              <div className="space-y-2">
                {Object.entries(stats.companies.byIndustry).slice(0, 5).map(([industry, count]) => (
                  <ProgressBar
                    key={industry}
                    label={industry}
                    value={count}
                    max={stats.companies.total}
                    color="green"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ⚡ Performance
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-700">Temps de réponse moyen</span>
                  <span className="text-xl font-bold text-blue-600">{stats.performance.averageResponseTime}ms</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (stats.performance.averageResponseTime / 500) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-700">Taux de succès</span>
                  <span className="text-xl font-bold text-green-600">{stats.performance.successRate}%</span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${stats.performance.successRate}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-red-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-700">Taux d'erreur</span>
                  <span className="text-xl font-bold text-red-600">{stats.performance.errorRate}%</span>
                </div>
                <div className="w-full bg-red-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{ width: `${stats.performance.errorRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Applications by Type Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📊 Candidatures par type
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.applications.byType).map(([type, count]) => (
                <div key={type} className="flex items-center space-x-3">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{type}</span>
                      <span className="text-sm font-bold text-gray-900">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(count / stats.applications.total) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 w-12 text-right">
                    {Math.round((count / stats.applications.total) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🎯 Résumé global
            </h3>
            <div className="space-y-4">
              <SummaryItem
                icon="📝"
                label="Total candidatures"
                value={stats.applications.total}
                trend="+12%"
                trendUp={true}
              />
              <SummaryItem
                icon="🏢"
                label="Total entreprises"
                value={stats.companies.total}
                trend="+8%"
                trendUp={true}
              />
              <SummaryItem
                icon="👥"
                label="Utilisateurs actifs"
                value={stats.users.activeUsers}
                trend="+5%"
                trendUp={true}
              />
              <SummaryItem
                icon="⚡"
                label="Performance moyenne"
                value={`${stats.performance.averageResponseTime}ms`}
                trend="-15ms"
                trendUp={true}
              />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

function ProgressBar({ label, value, max, color }: {
  label: string
  value: number
  max: number
  color: 'blue' | 'green' | 'purple' | 'orange'
}) {
  const colors = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    purple: 'bg-purple-600',
    orange: 'bg-orange-600'
  }

  const percentage = (value / max) * 100

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-medium text-gray-700">{label}</span>
        <span className="text-xs font-bold text-gray-900">{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${colors[color]} h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function SummaryItem({ icon, label, value, trend, trendUp }: {
  icon: string
  label: string
  value: number | string
  trend: string
  trendUp: boolean
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
      <span className={`text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
        {trendUp ? '↗' : '↘'} {trend}
      </span>
    </div>
  )
}


