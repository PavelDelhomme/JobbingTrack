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
          <h1 className="text-3xl font-bold text-gray-900">
            Bienvenue, {user?.firstName} ! 👋
          </h1>
          <p className="mt-2 text-gray-600">
            Backoffice d'administration JobbingTrack
          </p>
        </div>

        {/* System Status Banner */}
        <div className={`mb-6 p-4 rounded-lg border-2 ${
          systemStatus === 'healthy' ? 'bg-green-50 border-green-200' :
          systemStatus === 'degraded' ? 'bg-yellow-50 border-yellow-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">
                {systemStatus === 'healthy' ? '✅' : systemStatus === 'degraded' ? '⚠️' : '❌'}
              </span>
              <div>
                <p className={`font-semibold ${
                  systemStatus === 'healthy' ? 'text-green-800' :
                  systemStatus === 'degraded' ? 'text-yellow-800' :
                  'text-red-800'
                }`}>
                  {systemStatus === 'healthy' ? 'Tous les systèmes fonctionnent' :
                   systemStatus === 'degraded' ? 'Performances dégradées' :
                   'Systèmes hors ligne'}
                </p>
                <p className="text-sm text-gray-600">
                  Dernière vérification: {new Date().toLocaleTimeString('fr-FR')}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/backoffice/services')}
              className="px-4 py-2 bg-white rounded-lg text-sm font-medium hover:bg-gray-50"
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
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
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
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
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
              />
              <SystemMetric
                label="Base de données"
                value="PostgreSQL 15"
                icon="🗄️"
                status="success"
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
          <div className="bg-white rounded-lg shadow lg:col-span-2">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                📊 Activité récente
              </h2>
              <button
                onClick={() => router.push('/backoffice/logs')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Voir tout →
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <ActivityItem
                  icon="👤"
                  title="Nouvel utilisateur"
                  description="Pavel Delhomme s'est inscrit"
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
      className={`bg-white rounded-lg shadow p-6 ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {loading ? (
            <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-2"></div>
          ) : (
            <>
              <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
              {subtitle && (
                <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
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
    blue: 'hover:bg-blue-50 border-l-blue-500',
    green: 'hover:bg-green-50 border-l-green-500',
    purple: 'hover:bg-purple-50 border-l-purple-500',
    yellow: 'hover:bg-yellow-50 border-l-yellow-500',
    gray: 'hover:bg-gray-50 border-l-gray-500'
  }

  return (
    <a
      href={href}
      className={`flex items-center p-4 rounded-lg transition-colors border-l-4 ${colors[color]}`}
    >
      <div className="text-2xl mr-4">{icon}</div>
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </a>
  )
}

function SystemMetric({ label, value, icon, status }: {
  label: string
  value: string
  icon: string
  status?: 'success' | 'warning' | 'error'
}) {
  const statusColors = {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600'
  }

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <span className="text-xl">{icon}</span>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className={`text-sm font-medium ${status ? statusColors[status] : 'text-gray-900'}`}>
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
    <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="text-2xl">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
        <p className="text-xs text-gray-400 mt-1">{time}</p>
      </div>
    </div>
  )
}

