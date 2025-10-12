'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import { dashboardService, applicationService, authService, companyService } from '@/lib/api'

export default function BackofficePage() {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalApplications: 0,
    totalCompanies: 0,
    totalInterviews: 0,
    totalUsers: 0,
    activeUsers: 0,
    recentApplications: 0
  })
  const [loadingStats, setLoadingStats] = useState(true)
  const [systemStatus, setSystemStatus] = useState<'healthy' | 'degraded' | 'down'>('healthy')

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [appsResponse, usersResponse, companiesResponse] = await Promise.all([
          applicationService.getAll().catch(() => ({ data: { total: 0, applications: [] } })),
          authService.getAllUsers().catch(() => ({ data: { users: [] } })),
          companyService.getAll().catch(() => ({ data: { companies: [] } }))
        ])
        
        setStats({
          totalApplications: appsResponse.data.total || appsResponse.data.applications?.length || 0,
          totalUsers: usersResponse.data.users?.length || 0,
          activeUsers: usersResponse.data.users?.filter((u: any) => u.isActive)?.length || 0,
          totalCompanies: companiesResponse.data.companies?.length || 0,
          totalInterviews: 0,
          recentApplications: appsResponse.data.applications?.filter((a: any) => {
            const createdDate = new Date(a.createdAt)
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            return createdDate > weekAgo
          }).length || 0
        })
        setSystemStatus('healthy')
      } catch (error) {
        console.error('Erreur chargement stats:', error)
        setSystemStatus('degraded')
      } finally {
        setLoadingStats(false)
      }
    }

    if (isAuthenticated) {
      fetchStats()
    }
  }, [isAuthenticated])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Bienvenue, {user?.firstName} ! 👋
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Backoffice d'administration JobbingTrack
          </p>
        </div>

        {/* System Status Banner */}
        <div className={`mb-6 p-4 rounded-lg border-2 ${
          systemStatus === 'healthy' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
          systemStatus === 'degraded' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
          'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">
                {systemStatus === 'healthy' ? '✅' : systemStatus === 'degraded' ? '⚠️' : '❌'}
              </span>
              <div>
                <p className={`font-semibold ${
                  systemStatus === 'healthy' ? 'text-green-800 dark:text-green-300' :
                  systemStatus === 'degraded' ? 'text-yellow-800 dark:text-yellow-300' :
                  'text-red-800 dark:text-red-300'
                }`}>
                  {systemStatus === 'healthy' ? 'Tous les systèmes fonctionnent' :
                   systemStatus === 'degraded' ? 'Performances dégradées' :
                   'Systèmes hors ligne'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Dernière vérification: {new Date().toLocaleTimeString('fr-FR')}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/backoffice/services')}
              className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              Voir les services →
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            title="Candidatures"
            value={stats.totalApplications}
            subtitle={`${stats.recentApplications} cette semaine`}
            icon="📝"
            color="blue"
            loading={loadingStats}
            onClick={() => router.push('/backoffice/applications')}
          />
          <StatCard
            title="Entreprises"
            value={stats.totalCompanies}
            subtitle="Entreprises enregistrées"
            icon="🏢"
            color="green"
            loading={loadingStats}
            onClick={() => router.push('/backoffice/companies')}
          />
          <StatCard
            title="Entretiens"
            value={stats.totalInterviews}
            subtitle="Planifiés ou passés"
            icon="📅"
            color="purple"
            loading={loadingStats}
            onClick={() => router.push('/backoffice/interviews')}
          />
          <StatCard
            title="Utilisateurs"
            value={stats.totalUsers}
            subtitle={`${stats.activeUsers} actifs`}
            icon="👥"
            color="orange"
            loading={loadingStats}
            onClick={() => router.push('/backoffice/users')}
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-gray-900/50">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                ⚡ Actions rapides
              </h2>
            </div>
            <div className="p-6 space-y-3">
              <QuickActionButton 
                href="/backoffice/applications"
                icon="➕"
                title="Nouvelle candidature"
                description="Ajouter une candidature"
                color="blue"
              />
              <QuickActionButton 
                href="/backoffice/companies"
                icon="🏢"
                title="Nouvelle entreprise"
                description="Créer une entreprise"
                color="green"
              />
              <QuickActionButton 
                href="/backoffice/users"
                icon="👥"
                title="Gérer les utilisateurs"
                description="Administration des utilisateurs"
                color="purple"
              />
              <QuickActionButton 
                href="/backoffice/services"
                icon="🔧"
                title="Services & Monitoring"
                description="Tester et monitorer les services"
                color="yellow"
              />
              <QuickActionButton 
                href="/backoffice/logs"
                icon="📋"
                title="Logs système"
                description="Consulter les logs et activités"
                color="gray"
              />
              <QuickActionButton 
                href="/backoffice/settings"
                icon="⚙️"
                title="Configuration"
                description="Paramètres système"
                color="gray"
              />
            </div>
          </div>

          {/* System Overview */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-gray-900/50">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                🖥️ Aperçu système
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <SystemMetric
                label="Version"
                value="1.0.0"
                icon="📦"
              />
              <SystemMetric
                label="Environnement"
                value={process.env.NODE_ENV || 'development'}
                icon="🌍"
              />
              <SystemMetric
                label="Services actifs"
                value="12/12"
                icon="✅"
                status="success"
                // Ajoute l'action de redirection au clic
                onClick={() => window.location.href = '/backoffice/services'}
                className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              />
              <SystemMetric
                label="Base de données"
                value="PostgreSQL 15"
                icon="🗄️"
                status="success"
                onClick={() => router.push('/backoffice/settings?tab=database')}
                className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              />
              <SystemMetric
                label="Cache"
                value="Redis 7"
                icon="⚡"
                status="success"
              />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-gray-900/50 lg:col-span-2">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                📊 Activité récente
              </h2>
              <button
                onClick={() => router.push('/backoffice/logs')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                Voir tout →
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <ActivityItem
                  icon="👤"
                  title="Nouvel utilisateur"
                  description="Admin JobbingTrack s'est inscrit"
                  time="Il y a 5 minutes"
                />
                <ActivityItem
                  icon="📝"
                  title="Candidature créée"
                  description="Nouvelle candidature chez Google"
                  time="Il y a 1 heure"
                />
                <ActivityItem
                  icon="🏢"
                  title="Entreprise ajoutée"
                  description="Microsoft ajoutée à la base"
                  time="Il y a 2 heures"
                />
                <ActivityItem
                  icon="📅"
                  title="Entretien planifié"
                  description="Entretien technique programmé"
                  time="Il y a 3 heures"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

function StatCard({ title, value, subtitle, icon, color, loading, onClick }: {
  title: string
  value: number
  subtitle?: string
  icon: string
  color: 'blue' | 'green' | 'purple' | 'orange'
  loading?: boolean
  onClick?: () => void
}) {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  }

  return (
    <div 
      className={`bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-gray-900/50 p-6 ${onClick ? 'cursor-pointer hover:shadow-xl dark:hover:shadow-gray-900/70 transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          {loading ? (
            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 animate-pulse rounded mt-2"></div>
          ) : (
            <>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
              {subtitle && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
              )}
            </>
          )}
        </div>
        <div className={`h-12 w-12 rounded-lg ${colors[color]} flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function QuickActionButton({ href, icon, title, description, color }: {
  href: string
  icon: string
  title: string
  description: string
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'gray'
}) {
  const colors = {
    blue: 'hover:bg-blue-50 dark:hover:bg-blue-900/20 border-l-blue-500',
    green: 'hover:bg-green-50 dark:hover:bg-green-900/20 border-l-green-500',
    purple: 'hover:bg-purple-50 dark:hover:bg-purple-900/20 border-l-purple-500',
    yellow: 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20 border-l-yellow-500',
    gray: 'hover:bg-gray-50 dark:hover:bg-gray-800 border-l-gray-500'
  }

  return (
    <a
      href={href}
      className={`flex items-center p-4 rounded-lg transition-colors border-l-4 ${colors[color]}`}
    >
      <div className="text-2xl mr-4">{icon}</div>
      <div>
        <p className="font-medium text-gray-900 dark:text-gray-100">{title}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </a>
  )
}

function SystemMetric({ label, value, icon, status, onClick, className }: {
  label: string
  value: string
  icon: string
  status?: 'success' | 'warning' | 'error'
  onClick?: () => void
  className?: string
}) {
  const statusColors = {
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400'
  }

  return (
    <div 
      className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg ${onClick ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <span className="text-xl">{icon}</span>
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <span className={`text-sm font-medium ${status ? statusColors[status] : 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </span>
    </div>
  )
}

function ActivityItem({ icon, title, description, time }: {
  icon: string
  title: string
  description: string
  time: string
}) {
  return (
    <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
      <div className="text-2xl">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{time}</p>
      </div>
    </div>
  )
}

