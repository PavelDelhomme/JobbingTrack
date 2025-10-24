'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/features'
import { useAuth } from '@/lib/hooks/auth'
import { useRouter } from 'next/navigation'
import { applicationService, authService, companyService } from '@/lib/api'
import { Settings, BarChart3, PieChart, TrendingUp, Users, Building2, FileText, Activity, Eye, EyeOff } from 'lucide-react'

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

interface CustomizationSettings {
  showApplications: boolean
  showUsers: boolean
  showCompanies: boolean
  showPerformance: boolean
  showTimeline: boolean
  showDeveloper: boolean
  showSecurity: boolean
  viewType: 'cards' | 'charts' | 'table'
  chartType: 'bar' | 'pie' | 'line'
}

const DEFAULT_CUSTOMIZATION: CustomizationSettings = {
  showApplications: true,
  showUsers: true,
  showCompanies: true,
  showPerformance: true,
  showTimeline: true,
  showDeveloper: false,
  showSecurity: false,
  viewType: 'cards',
  chartType: 'bar'
}

export default function StatisticsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')

  // États pour la personnalisation
  const [showCustomization, setShowCustomization] = useState(false)
  const [customization, setCustomization] = useState<CustomizationSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('statistics-customization')
      return saved ? { ...DEFAULT_CUSTOMIZATION, ...JSON.parse(saved) } : DEFAULT_CUSTOMIZATION
    }
    return DEFAULT_CUSTOMIZATION
  })

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

  // Sauvegarder les paramètres de personnalisation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('statistics-customization', JSON.stringify(customization))
    }
  }, [customization])

  // Fonctions de personnalisation
  const updateCustomization = (updates: Partial<CustomizationSettings>) => {
    setCustomization(prev => ({ ...prev, ...updates }))
  }

  const resetCustomization = () => {
    setCustomization(DEFAULT_CUSTOMIZATION)
  }

  const fetchStatistics = async () => {
    try {
      // Temporairement utiliser des données mockées pour éviter les problèmes d'API
      const mockStats = {
        applications: {
          total: 15,
          byStatus: {
            'DRAFT': 3,
            'SENT': 5,
            'IN_REVIEW': 4,
            'INTERVIEW_SCHEDULED': 2,
            'INTERVIEWED': 1,
            'OFFER_RECEIVED': 0,
            'ACCEPTED': 0,
            'REJECTED': 0,
            'WITHDRAWN': 0,
            'NO_RESPONSE': 0
          },
          byType: {
            'FULL_TIME': 12,
            'PART_TIME': 2,
            'CONTRACT': 1
          },
          thisMonth: 8,
          thisWeek: 3
        },
        users: {
          total: 3,
          byRole: {
            'USER': 1,
            'ADMIN': 1,
            'SUPER_ADMIN': 1
          },
          activeUsers: 3,
          newThisMonth: 2
        },
        companies: {
          total: 8,
          byIndustry: {
            'Technology': 3,
            'Finance': 2,
            'Healthcare': 2,
            'Education': 1
          },
          bySize: {
            'Startup': 4,
            'SMB': 3,
            'Enterprise': 1
          }
        },
        performance: {
          averageResponseTime: 125, // En millisecondes
          successRate: 98.8, // ✅ Cohérent avec errorRate
          errorRate: 1.2 // ✅ Total = 100%
        }
      }

      setStats(mockStats)
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!stats) {
    return (
      <AdminLayout>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Erreur de chargement des statistiques
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div>
        {/* Header - Responsive */}
        <div className="mb-4 md:mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 break-words">
              📊 Statistiques Avancées
            </h1>
            <p className="mt-1 md:mt-2 text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">
              Analyse détaillée des données de la plateforme
            </p>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-xs sm:text-sm md:text-base focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
          >
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="year">Cette année</option>
          </select>
        </div>

        {/* Main Stats Grid - Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 md:mb-8">
          {/* Applications Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">
              📝 Candidatures
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">Total</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.applications.total}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">Ce mois</span>
                <span className="text-xl font-bold text-green-600 dark:text-green-400">{stats.applications.thisMonth}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">Cette semaine</span>
                <span className="text-xl font-bold text-purple-600 dark:text-purple-400">{stats.applications.thisWeek}</span>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Par statut</h4>
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">
              👥 Utilisateurs
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">Total</span>
                <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.users.total}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">Actifs</span>
                <span className="text-xl font-bold text-green-600 dark:text-green-400">{stats.users.activeUsers}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">Nouveaux ce mois</span>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.users.newThisMonth}</span>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Par rôle</h4>
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">
              🏢 Entreprises
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">Total</span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.companies.total}</span>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Par secteur</h4>
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

          {/* Performance Stats - CLIQUABLE vers Analytics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
            <div 
              onClick={() => router.push('/backoffice/analytics')}
              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 -m-3 sm:-m-4 md:-m-6 p-3 sm:p-4 md:p-6 rounded-lg transition-all group"
            >
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                  ⚡ Performance
                </h3>
                <span className="text-blue-600 dark:text-blue-400 opacity-50 group-hover:opacity-100 transition-opacity text-xs sm:text-sm font-medium whitespace-nowrap">
                  Voir détails →
                </span>
              </div>
            </div>
            <div className="space-y-4">
              <div
                onClick={() => router.push('/backoffice/analytics')}
                className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
                title="Cliquer pour voir les détails dans Analytics"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Temps de réponse moyen</span>
                  <span className="text-lg sm:text-xl font-bold text-blue-600 flex items-center gap-1">
                    {stats.performance.averageResponseTime}ms
                    <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </span>
                </div>
                <div className="w-full bg-blue-200 dark:bg-blue-900/30 rounded-full h-2">
                  <div
                    className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (stats.performance.averageResponseTime / 500) * 100)}%` }}
                  />
                </div>
              </div>

              <div 
                onClick={() => router.push('/backoffice/analytics')}
                className="p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors group"
                title="Cliquer pour voir les détails dans Analytics"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Taux de succès</span>
                  <span className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                    {stats.performance.successRate}%
                    <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </span>
                </div>
                <div className="w-full bg-green-200 dark:bg-green-900/30 rounded-full h-2">
                  <div
                    className="bg-green-600 dark:bg-green-400 h-2 rounded-full transition-all"
                    style={{ width: `${stats.performance.successRate}%` }}
                  />
                </div>
              </div>

              <div 
                onClick={() => router.push('/backoffice/analytics?tab=errors')}
                className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 rounded-lg cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors group"
                title="Cliquer pour voir les erreurs détaillées"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Taux d'erreur</span>
                  <span className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                    {stats.performance.errorRate}%
                    <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </span>
                </div>
                <div className="w-full bg-red-200 dark:bg-red-900/30 rounded-full h-2">
                  <div
                    className="bg-red-600 dark:bg-red-400 h-2 rounded-full transition-all"
                    style={{ width: `${stats.performance.errorRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Applications by Type Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">
              📊 Candidatures par type
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.applications.byType).map(([type, count]) => (
                <div key={type} className="flex items-center space-x-3">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{type}</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full"
                        style={{ width: `${(count / stats.applications.total) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
                    {Math.round((count / stats.applications.total) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">
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
                onClick={() => router.push('/backoffice/analytics')}
                clickable={true}
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
    blue: 'bg-blue-600 dark:bg-blue-400',
    green: 'bg-green-600 dark:bg-green-400',
    purple: 'bg-purple-600 dark:bg-purple-400',
    orange: 'bg-orange-600 dark:bg-orange-400'
  }

  const percentage = (value / max) * 100

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{value}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`${colors[color]} h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function SummaryItem({ icon, label, value, trend, trendUp, onClick, clickable }: {
  icon: string
  label: string
  value: number | string
  trend: string
  trendUp: boolean
  onClick?: () => void
  clickable?: boolean
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 ${
        clickable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors group' : ''
      }`}
      title={clickable ? "Cliquer pour voir les détails" : undefined}
    >
      <div className="flex items-center space-x-2 sm:space-x-3">
        <span className="text-xl sm:text-2xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{label}</p>
          <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1">
            {value}
            {clickable && <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>}
          </p>
        </div>
      </div>
      <span className={`text-xs sm:text-sm font-medium flex-shrink-0 ml-2 ${trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {trendUp ? '↗' : '↘'} {trend}
      </span>
    </div>
  )
}


